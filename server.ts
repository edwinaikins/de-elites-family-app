import express from "express";
import path from "path";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PILLARS, LEADERSHIP, GALLERY_ITEMS, DEFAULT_SHOUTOUTS, DEFAULT_MEMBERS, DEFAULT_EVENTS, DEFAULT_HERO } from "./src/data";

const { Pool } = pg;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Parse large JSON payloads for Base64 image uploads. We also stash the raw
// request body on `req` (via the `verify` hook) so the Paystack webhook
// handler can compute an HMAC signature over the exact bytes Paystack sent —
// re-serializing the parsed JSON wouldn't reliably match byte-for-byte.
app.use(
  express.json({
    limit: "15mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// --- MEMBER AUTH / PAYMENTS CONFIG ---

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  return secret;
}

function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is not set.");
  }
  return key;
}

function getPaystackPublicKey(): string {
  return process.env.PAYSTACK_PUBLIC_KEY || "";
}

// Mock payment mode lets the whole "pay dues" / "pay & register for an
// event" flow be exercised end-to-end — client checkout UI, server
// initialize/verify, payment history — without a real Paystack account.
//
// - PAYSTACK_MOCK=true  forces mock mode on, even if real keys are set
//   (handy for a staging box that shouldn't move real money).
// - PAYSTACK_MOCK=false forces it off — if real keys are then missing,
//   payments correctly fall back to the "not configured" error instead of
//   silently mocking in what looks like a production environment.
// - Unset (the default): mock mode auto-enables whenever real Paystack
//   keys aren't configured, so payments "just work" for testing the moment
//   the app is deployed, and auto-switches to real Paystack the moment real
//   keys are added — no flag to remember to flip.
function isMockPaymentsEnabled(): boolean {
  const flag = process.env.PAYSTACK_MOCK;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !process.env.PAYSTACK_PUBLIC_KEY || !process.env.PAYSTACK_SECRET_KEY;
}

// Mock payment references are tagged with this prefix so verification can
// tell, per-payment, whether it was ever meant to touch the real Paystack
// API — independent of whatever isMockPaymentsEnabled() returns *now* (mode
// could change between initializing and verifying a payment).
const MOCK_REFERENCE_PREFIX = "mock-";

function getDuesCurrency(): string {
  return process.env.DUES_CURRENCY || "GHS";
}

// Middleware: verifies the member's JWT (sent as `Authorization: Bearer <token>`)
// and attaches the decoded member id to `req.memberId`.
function requireMemberAuth(req: any, res: any, next: any) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, error: "Not authenticated. Please log in." });
    }
    const payload = jwt.verify(token, getJwtSecret()) as { memberId: string };
    req.memberId = payload.memberId;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Session expired or invalid. Please log in again." });
  }
}

// Default Admin User
const DEFAULT_USERS = [
  { id: "admin-1", username: "admin", password: "password", role: "admin" }
];

const SECTIONS = ["pillars", "leaders", "gallery", "shoutouts", "members", "events", "hero", "users"] as const;
type Section = (typeof SECTIONS)[number];

function getDefaultDataForSection(sec: string) {
  switch (sec) {
    case "pillars": return PILLARS;
    case "leaders": return LEADERSHIP;
    case "gallery": return GALLERY_ITEMS;
    case "shoutouts": return DEFAULT_SHOUTOUTS;
    case "members": return DEFAULT_MEMBERS;
    case "events": return DEFAULT_EVENTS;
    case "hero": return DEFAULT_HERO;
    case "users": return DEFAULT_USERS;
    default: return [];
  }
}

// --- POSTGRES SETUP ---
//
// We build the pool config from DATABASE_URL manually (rather than passing
// the raw connection string straight through) so that extra query params
// some managed Postgres providers add (e.g. `channel_binding=require`)
// never trip up the driver's URL parsing. SSL is force-enabled unless the
// host is local, which covers Ubicloud/managed Postgres that require TLS.
function buildPoolConfig(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "postgres",
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  };
}

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (pool) return pool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  pool = new Pool(buildPoolConfig(databaseUrl));
  pool.on("error", (err) => {
    console.error("Unexpected Postgres pool error:", err);
  });
  return pool;
}

async function initDb() {
  try {
    const db = getPool();
    await db.query(`
      CREATE TABLE IF NOT EXISTS cms_sections (
        section TEXT PRIMARY KEY,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Prospective member applications live in their own table, deliberately
    // separate from cms_sections. cms_sections is served in bulk to every
    // site visitor via GET /api/cms/data, and applications contain personal
    // data (phone, email, DOB, etc.) that must never appear in that public
    // payload.
    await db.query(`
      CREATE TABLE IF NOT EXISTS member_applications (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        nickname TEXT,
        dob TEXT NOT NULL,
        gender TEXT NOT NULL,
        occupation TEXT NOT NULL,
        residence TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        social_handles TEXT,
        referrer TEXT,
        prior_group_member BOOLEAN NOT NULL DEFAULT false,
        prior_group_detail TEXT,
        reason_for_joining TEXT NOT NULL,
        contribution_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
        activity_level TEXT NOT NULL,
        willing_to_support_financially BOOLEAN NOT NULL,
        agrees_to_rules_and_discipline BOOLEAN NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Member portal accounts — distinct from both `member_applications`
    // (prospective applicants) and the `users` cms_section (CMS admin/
    // moderator logins). This is the login + profile a real family member
    // uses to sign into their own portal. Kept off cms_sections since it
    // carries an email + password hash that must never reach the public
    // GET /api/cms/data payload.
    await db.query(`
      CREATE TABLE IF NOT EXISTS member_accounts (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        bio TEXT NOT NULL DEFAULT '',
        image TEXT,
        chapter TEXT,
        role TEXT,
        phone TEXT,
        dues_amount NUMERIC NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'GHS',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Recurring welfare dues payments, one row per period a member pays for.
    await db.query(`
      CREATE TABLE IF NOT EXISTS welfare_dues_payments (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        period TEXT NOT NULL,
        reference TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Paid event registrations.
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_payments (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL,
        event_title TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        reference TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    for (const sec of SECTIONS) {
      const existing = await db.query("SELECT 1 FROM cms_sections WHERE section = $1", [sec]);
      if (existing.rowCount === 0) {
        const defaults = getDefaultDataForSection(sec);
        await db.query(
          "INSERT INTO cms_sections (section, items) VALUES ($1, $2::jsonb)",
          [sec, JSON.stringify(defaults)]
        );
        console.log(`Seeded Postgres section '${sec}' with default data.`);
      }
    }
    console.log("Postgres CMS database ready.");
  } catch (err) {
    console.error("Failed to initialize Postgres database:", err);
  }
}

async function getCmsData() {
  const dbData: Record<string, any> = {};
  try {
    const db = getPool();
    const result = await db.query("SELECT section, items FROM cms_sections");
    const bySection = new Map(result.rows.map((r) => [r.section, r.items]));
    for (const sec of SECTIONS) {
      dbData[sec] = bySection.has(sec) ? bySection.get(sec) : getDefaultDataForSection(sec);
    }
  } catch (err) {
    console.error("Error loading CMS data from Postgres, falling back to defaults:", err);
    for (const sec of SECTIONS) {
      dbData[sec] = getDefaultDataForSection(sec);
    }
  }
  return dbData;
}

// Initialize Postgres on server start
initDb();

// --- API ROUTES ---

// Healthcheck (does not touch the DB — used for basic liveness probes)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Deeper healthcheck that verifies DB connectivity — useful for deploy scripts
app.get("/api/health/db", async (req, res) => {
  try {
    const db = getPool();
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err: any) {
    res.status(500).json({ status: "error", database: "unreachable", error: err.message });
  }
});

// Retrieve all CMS data
app.get("/api/cms/data", async (req, res) => {
  try {
    const data = await getCmsData();
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Failed to read CMS data:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to read CMS database." });
  }
});

// Update a specific section's data
app.post("/api/cms/update", async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: "Invalid payload: 'type' and 'data' array are required." });
    }

    if (!SECTIONS.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid type. Allowed values: ${SECTIONS.join(", ")}` });
    }

    const db = getPool();
    await db.query(
      `INSERT INTO cms_sections (section, items, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (section) DO UPDATE SET items = EXCLUDED.items, updated_at = now()`,
      [type, JSON.stringify(data)]
    );

    res.json({ success: true, message: `Successfully updated section '${type}' in Postgres`, data });
  } catch (error: any) {
    console.error("Failed to update CMS data:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to save CMS database changes." });
  }
});

// Reset entire database to the original seeded copy
app.post("/api/cms/reset", async (req, res) => {
  try {
    const { database } = req.body;
    if (!database || typeof database !== "object") {
      return res.status(400).json({ success: false, error: "Full database object required for total reset." });
    }

    const db = getPool();
    for (const sec of SECTIONS) {
      if (database[sec]) {
        await db.query(
          `INSERT INTO cms_sections (section, items, updated_at)
           VALUES ($1, $2::jsonb, now())
           ON CONFLICT (section) DO UPDATE SET items = EXCLUDED.items, updated_at = now()`,
          [sec, JSON.stringify(database[sec])]
        );
      }
    }

    res.json({ success: true, message: "Database reset to default states in Postgres successfully." });
  } catch (error: any) {
    console.error("Failed to reset CMS data:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to reset database." });
  }
});

// --- PROSPECTIVE MEMBER APPLICATIONS ---
// Kept on a dedicated table/endpoints (see initDb comment above) so this
// personal data is never included in the public /api/cms/data payload.

function mapApplicationRow(row: any) {
  return {
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname || undefined,
    dob: row.dob,
    gender: row.gender,
    occupation: row.occupation,
    residence: row.residence,
    phone: row.phone,
    email: row.email,
    socialHandles: row.social_handles || undefined,
    referrer: row.referrer || undefined,
    priorGroupMember: row.prior_group_member,
    priorGroupDetail: row.prior_group_detail || undefined,
    reasonForJoining: row.reason_for_joining,
    contributionAreas: row.contribution_areas || [],
    activityLevel: row.activity_level,
    willingToSupportFinancially: row.willing_to_support_financially,
    agreesToRulesAndDiscipline: row.agrees_to_rules_and_discipline,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

// Public: submit a new application (from the "Join the Movement" form)
app.post("/api/applications", async (req, res) => {
  try {
    const b = req.body || {};
    const required = ["fullName", "dob", "gender", "occupation", "residence", "phone", "email", "reasonForJoining", "activityLevel"];
    for (const field of required) {
      if (!b[field] || typeof b[field] !== "string" || !b[field].trim()) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }
    if (typeof b.willingToSupportFinancially !== "boolean" || typeof b.agreesToRulesAndDiscipline !== "boolean") {
      return res.status(400).json({ success: false, error: "willingToSupportFinancially and agreesToRulesAndDiscipline must be provided as booleans." });
    }

    const id = `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const db = getPool();
    const result = await db.query(
      `INSERT INTO member_applications (
        id, full_name, nickname, dob, gender, occupation, residence, phone, email,
        social_handles, referrer, prior_group_member, prior_group_detail,
        reason_for_joining, contribution_areas, activity_level,
        willing_to_support_financially, agrees_to_rules_and_discipline, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,'pending')
      RETURNING *`,
      [
        id,
        b.fullName.trim(),
        b.nickname?.trim() || null,
        b.dob,
        b.gender,
        b.occupation.trim(),
        b.residence.trim(),
        b.phone.trim(),
        b.email.trim(),
        b.socialHandles?.trim() || null,
        b.referrer?.trim() || null,
        Boolean(b.priorGroupMember),
        b.priorGroupDetail?.trim() || null,
        b.reasonForJoining.trim(),
        JSON.stringify(Array.isArray(b.contributionAreas) ? b.contributionAreas : []),
        b.activityLevel,
        b.willingToSupportFinancially,
        b.agreesToRulesAndDiscipline,
      ]
    );

    res.json({ success: true, data: mapApplicationRow(result.rows[0]) });
  } catch (error: any) {
    console.error("Failed to submit member application:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to submit application." });
  }
});

// Admin: list all applications, newest first
// NOTE: like the rest of this CMS, admin routes are not server-side
// authenticated yet — the CMS login gate is client-side only. This mirrors
// the existing security posture of /api/cms/update and friends.
app.get("/api/applications", async (req, res) => {
  try {
    const db = getPool();
    const result = await db.query("SELECT * FROM member_applications ORDER BY submitted_at DESC");
    res.json({ success: true, data: result.rows.map(mapApplicationRow) });
  } catch (error: any) {
    console.error("Failed to fetch member applications:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to load applications." });
  }
});

// Admin: update an application's status (pending/approved/rejected)
app.patch("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "status must be one of pending, approved, rejected." });
    }
    const db = getPool();
    const result = await db.query(
      "UPDATE member_applications SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Application not found." });
    }
    res.json({ success: true, data: mapApplicationRow(result.rows[0]) });
  } catch (error: any) {
    console.error("Failed to update member application:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to update application." });
  }
});

// Admin: delete an application
app.delete("/api/applications/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();
    const result = await db.query("DELETE FROM member_applications WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Application not found." });
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete member application:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to delete application." });
  }
});


// --- MEMBER PORTAL: ACCOUNTS, AUTH, PAYMENTS ---
//
// member_accounts is the real login + profile a family member uses to sign
// into their own portal (distinct from member_applications, and distinct
// from the CMS `users` admin/moderator accounts). Never exposed via the
// public cms_sections mechanism.

function mapMemberRow(row: any) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    bio: row.bio || "",
    image: row.image || undefined,
    chapter: row.chapter || undefined,
    role: row.role || undefined,
    phone: row.phone || undefined,
    duesAmount: Number(row.dues_amount),
    currency: row.currency,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapDuesRow(row: any) {
  return {
    id: row.id,
    memberId: row.member_id,
    amount: Number(row.amount),
    currency: row.currency,
    period: row.period,
    reference: row.reference,
    status: row.status,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
  };
}

function mapEventPaymentRow(row: any) {
  return {
    id: row.id,
    memberId: row.member_id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    amount: Number(row.amount),
    currency: row.currency,
    reference: row.reference,
    status: row.status,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
  };
}

async function getEventById(eventId: string) {
  const db = getPool();
  const result = await db.query("SELECT items FROM cms_sections WHERE section = 'events'");
  const items = result.rows[0]?.items || DEFAULT_EVENTS;
  return (items as any[]).find((e) => e.id === eventId) || null;
}

// --- Member login / self-service ---

app.post("/api/member/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }
    const db = getPool();
    const result = await db.query("SELECT * FROM member_accounts WHERE email = $1", [String(email).trim().toLowerCase()]);
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }
    if (row.status !== "active") {
      return res.status(403).json({ success: false, error: "This account has been suspended. Contact an admin." });
    }
    const matches = await bcrypt.compare(password, row.password_hash);
    if (!matches) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }
    const token = jwt.sign({ memberId: row.id }, getJwtSecret(), { expiresIn: "30d" });
    res.json({ success: true, data: { token, member: mapMemberRow(row) } });
  } catch (error: any) {
    console.error("Member login failed:", error);
    res.status(500).json({ success: false, error: error.message || "Login failed." });
  }
});

app.get("/api/member/me", requireMemberAuth, async (req: any, res) => {
  try {
    const db = getPool();
    const result = await db.query("SELECT * FROM member_accounts WHERE id = $1", [req.memberId]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Member not found." });
    res.json({ success: true, data: mapMemberRow(result.rows[0]) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load profile." });
  }
});

// Members may only edit their own bio/avatar/phone — email, password, dues
// amount, and status all require admin action.
app.patch("/api/member/me", requireMemberAuth, async (req: any, res) => {
  try {
    const { bio, image, phone } = req.body || {};
    const db = getPool();
    const result = await db.query(
      `UPDATE member_accounts
       SET bio = COALESCE($2, bio), image = COALESCE($3, image), phone = COALESCE($4, phone)
       WHERE id = $1 RETURNING *`,
      [
        req.memberId,
        typeof bio === "string" ? bio : null,
        typeof image === "string" ? image : null,
        typeof phone === "string" ? phone : null,
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Member not found." });
    res.json({ success: true, data: mapMemberRow(result.rows[0]) });
  } catch (error: any) {
    console.error("Failed to update member profile:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to update profile." });
  }
});

app.post("/api/member/change-password", requireMemberAuth, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ success: false, error: "Current password and a new password (min 8 characters) are required." });
    }
    const db = getPool();
    const result = await db.query("SELECT * FROM member_accounts WHERE id = $1", [req.memberId]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ success: false, error: "Member not found." });
    const matches = await bcrypt.compare(currentPassword, row.password_hash);
    if (!matches) return res.status(401).json({ success: false, error: "Current password is incorrect." });
    const newHash = await bcrypt.hash(String(newPassword), 10);
    await db.query("UPDATE member_accounts SET password_hash = $2 WHERE id = $1", [req.memberId, newHash]);
    res.json({ success: true, message: "Password updated." });
  } catch (error: any) {
    console.error("Failed to change member password:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to change password." });
  }
});

app.get("/api/member/dues-history", requireMemberAuth, async (req: any, res) => {
  try {
    const db = getPool();
    const result = await db.query("SELECT * FROM welfare_dues_payments WHERE member_id = $1 ORDER BY created_at DESC", [req.memberId]);
    res.json({ success: true, data: result.rows.map(mapDuesRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load dues history." });
  }
});

app.get("/api/member/event-payments", requireMemberAuth, async (req: any, res) => {
  try {
    const db = getPool();
    const result = await db.query("SELECT * FROM event_payments WHERE member_id = $1 ORDER BY created_at DESC", [req.memberId]);
    res.json({ success: true, data: result.rows.map(mapEventPaymentRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load event payment history." });
  }
});

// --- Admin: manage member accounts ---
// NOTE: same posture as the rest of this CMS's admin routes — the CMS login
// gate is client-side only, not server-side authenticated yet.

app.get("/api/admin/members", async (req, res) => {
  try {
    const db = getPool();
    const result = await db.query("SELECT * FROM member_accounts ORDER BY created_at DESC");
    res.json({ success: true, data: result.rows.map(mapMemberRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load member accounts." });
  }
});

app.post("/api/admin/members", async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.fullName || !b.email || !b.password) {
      return res.status(400).json({ success: false, error: "fullName, email, and password are required." });
    }
    if (String(b.password).length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
    }
    const email = String(b.email).trim().toLowerCase();
    const db = getPool();
    const existing = await db.query("SELECT 1 FROM member_accounts WHERE email = $1", [email]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ success: false, error: "An account with this email already exists." });
    }
    const passwordHash = await bcrypt.hash(String(b.password), 10);
    const id = `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await db.query(
      `INSERT INTO member_accounts (id, full_name, email, password_hash, bio, image, chapter, role, phone, dues_amount, currency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active') RETURNING *`,
      [
        id,
        String(b.fullName).trim(),
        email,
        passwordHash,
        typeof b.bio === "string" ? b.bio : "",
        b.image || null,
        b.chapter || null,
        b.role || null,
        b.phone || null,
        Number(b.duesAmount) || 0,
        b.currency || getDuesCurrency(),
      ]
    );
    res.json({ success: true, data: mapMemberRow(result.rows[0]) });
  } catch (error: any) {
    console.error("Failed to create member account:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to create member account." });
  }
});

app.patch("/api/admin/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const db = getPool();

    if (b.resetPassword) {
      if (String(b.resetPassword).length < 8) {
        return res.status(400).json({ success: false, error: "New password must be at least 8 characters." });
      }
      const passwordHash = await bcrypt.hash(String(b.resetPassword), 10);
      await db.query("UPDATE member_accounts SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
    }

    const result = await db.query(
      `UPDATE member_accounts SET
        full_name = COALESCE($2, full_name),
        chapter = COALESCE($3, chapter),
        role = COALESCE($4, role),
        dues_amount = COALESCE($5, dues_amount),
        currency = COALESCE($6, currency),
        status = COALESCE($7, status)
       WHERE id = $1 RETURNING *`,
      [
        id,
        typeof b.fullName === "string" ? b.fullName.trim() : null,
        typeof b.chapter === "string" ? b.chapter : null,
        typeof b.role === "string" ? b.role : null,
        b.duesAmount !== undefined ? Number(b.duesAmount) : null,
        typeof b.currency === "string" ? b.currency : null,
        typeof b.status === "string" ? b.status : null,
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Member account not found." });
    res.json({ success: true, data: mapMemberRow(result.rows[0]) });
  } catch (error: any) {
    console.error("Failed to update member account:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to update member account." });
  }
});

app.delete("/api/admin/members/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();
    const result = await db.query("DELETE FROM member_accounts WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Member account not found." });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to delete member account." });
  }
});

app.get("/api/admin/members/:id/dues", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();
    const result = await db.query("SELECT * FROM welfare_dues_payments WHERE member_id = $1 ORDER BY created_at DESC", [id]);
    res.json({ success: true, data: result.rows.map(mapDuesRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load dues history." });
  }
});

app.get("/api/admin/members/:id/event-payments", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();
    const result = await db.query("SELECT * FROM event_payments WHERE member_id = $1 ORDER BY created_at DESC", [id]);
    res.json({ success: true, data: result.rows.map(mapEventPaymentRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load event payment history." });
  }
});

// --- Payments (Paystack) ---
//
// We never let the client dictate an amount. Both "initialize" routes look
// up the trustworthy amount server-side (the member's configured dues
// amount, or the event's configured price) and write a 'pending' row before
// telling the client anything, so a Paystack verify (or webhook) later has
// something authoritative to check the charge against.

// Lets the client show a "Test Mode" badge on payment buttons before the
// member even starts a checkout, rather than only discovering it's a mock
// payment once the initialize call comes back.
app.get("/api/payments/config", (req, res) => {
  res.json({ success: true, data: { mock: isMockPaymentsEnabled() } });
});

app.post("/api/payments/dues/initialize", requireMemberAuth, async (req: any, res) => {
  try {
    const { period } = req.body || {};
    if (!period || typeof period !== "string") {
      return res.status(400).json({ success: false, error: "A dues period (e.g. '2026-08') is required." });
    }
    const db = getPool();
    const memberRes = await db.query("SELECT * FROM member_accounts WHERE id = $1", [req.memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });
    const amount = Number(member.dues_amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: "No welfare dues amount has been configured for your account. Contact an admin." });
    }

    const mock = isMockPaymentsEnabled();
    const publicKey = mock ? "mock" : getPaystackPublicKey();
    if (!mock && !publicKey) {
      return res.status(503).json({ success: false, error: "Payments are not configured yet. Contact an admin." });
    }

    const reference = `${mock ? MOCK_REFERENCE_PREFIX : ""}dues-${req.memberId}-${period}-${Date.now()}`;
    await db.query(
      `INSERT INTO welfare_dues_payments (id, member_id, amount, currency, period, reference, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [`dp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, req.memberId, amount, member.currency, period, reference]
    );

    res.json({ success: true, data: { reference, amount, currency: member.currency, email: member.email, publicKey, mock } });
  } catch (error: any) {
    console.error("Failed to initialize dues payment:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to start payment." });
  }
});

app.post("/api/payments/event/initialize", requireMemberAuth, async (req: any, res) => {
  try {
    const { eventId } = req.body || {};
    if (!eventId) {
      return res.status(400).json({ success: false, error: "eventId is required." });
    }
    const event = await getEventById(eventId);
    if (!event) return res.status(404).json({ success: false, error: "Event not found." });
    const amount = Number(event.price) || 0;
    if (amount <= 0) {
      return res.status(400).json({ success: false, error: "This event does not require payment." });
    }

    const mock = isMockPaymentsEnabled();
    const publicKey = mock ? "mock" : getPaystackPublicKey();
    if (!mock && !publicKey) {
      return res.status(503).json({ success: false, error: "Payments are not configured yet. Contact an admin." });
    }

    const db = getPool();
    const memberRes = await db.query("SELECT email FROM member_accounts WHERE id = $1", [req.memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });

    const currency = event.currency || getDuesCurrency();
    const reference = `${mock ? MOCK_REFERENCE_PREFIX : ""}event-${req.memberId}-${eventId}-${Date.now()}`;
    await db.query(
      `INSERT INTO event_payments (id, member_id, event_id, event_title, amount, currency, reference, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
      [`ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, req.memberId, eventId, event.title, amount, currency, reference]
    );

    res.json({ success: true, data: { reference, amount, currency, email: member.email, publicKey, mock } });
  } catch (error: any) {
    console.error("Failed to initialize event payment:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to start payment." });
  }
});

async function findPaymentByReference(reference: string) {
  const db = getPool();
  const duesRes = await db.query("SELECT * FROM welfare_dues_payments WHERE reference = $1", [reference]);
  if ((duesRes.rowCount ?? 0) > 0) return { table: "welfare_dues_payments" as const, row: duesRes.rows[0] };
  const eventRes = await db.query("SELECT * FROM event_payments WHERE reference = $1", [reference]);
  if ((eventRes.rowCount ?? 0) > 0) return { table: "event_payments" as const, row: eventRes.rows[0] };
  return null;
}

async function verifyWithPaystack(reference: string) {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${getPaystackSecretKey()}` },
  });
  const json: any = await res.json();
  if (!res.ok || !json.status) {
    throw new Error(json.message || "Failed to verify transaction with Paystack.");
  }
  return json.data;
}

// Shared by the member-facing verify endpoint and the webhook handler.
// Re-checks status/amount/currency against what WE recorded at initialize
// time before ever marking a payment as successful.
async function verifyAndRecordPayment(reference: string, expectedMemberId?: string) {
  const found = await findPaymentByReference(reference);
  if (!found) {
    return { success: false as const, error: "Payment record not found." };
  }
  const { table, row } = found;
  if (expectedMemberId && row.member_id !== expectedMemberId) {
    return { success: false as const, error: "This payment does not belong to your account." };
  }
  if (row.status === "success") {
    return { success: true as const, table, row };
  }

  // Mock payments never touch Paystack's real API — the client-side mock
  // checkout (see MockPaystackCheckout.tsx) already simulated collecting
  // card details and confirming the charge, so we just record the result it
  // reported (rejecting the reference would mean a member "cancelled" the
  // mock checkout, which never reaches this endpoint at all).
  const isMock = reference.startsWith(MOCK_REFERENCE_PREFIX);
  let isValid: boolean;
  if (isMock) {
    isValid = true;
  } else {
    const data = await verifyWithPaystack(reference);
    const expectedSubunit = Math.round(Number(row.amount) * 100);
    isValid = data.status === "success" && data.amount === expectedSubunit && data.currency === row.currency;
  }

  const db = getPool();
  if (isValid) {
    const updated = await db.query(
      `UPDATE ${table} SET status = 'success', paid_at = now() WHERE reference = $1 RETURNING *`,
      [reference]
    );
    return { success: true as const, table, row: updated.rows[0] };
  } else {
    await db.query(`UPDATE ${table} SET status = 'failed' WHERE reference = $1 AND status = 'pending'`, [reference]);
    return { success: false as const, error: "Payment could not be verified with Paystack." };
  }
}

app.post("/api/payments/verify", requireMemberAuth, async (req: any, res) => {
  try {
    const { reference } = req.body || {};
    if (!reference) return res.status(400).json({ success: false, error: "reference is required." });
    const result = await verifyAndRecordPayment(reference, req.memberId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    const data = result.table === "welfare_dues_payments" ? mapDuesRow(result.row) : mapEventPaymentRow(result.row);
    res.json({ success: true, data, type: result.table === "welfare_dues_payments" ? "dues" : "event" });
  } catch (error: any) {
    console.error("Failed to verify payment:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to verify payment." });
  }
});

// Paystack webhook — a second, server-to-server confirmation path in case
// the member closes their browser before the client-side verify call fires.
// Signature is checked over the raw request body (see the express.json
// `verify` hook above) using HMAC-SHA512 with the Paystack secret key.
app.post("/api/paystack/webhook", async (req: any, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || !signature || !req.rawBody) {
      return res.sendStatus(400);
    }
    const expected = crypto.createHmac("sha512", secret).update(req.rawBody).digest("hex");
    if (expected !== signature) {
      console.warn("Rejected Paystack webhook with invalid signature.");
      return res.sendStatus(401);
    }

    const event = req.body;
    if (event?.event === "charge.success" && event.data?.reference) {
      await verifyAndRecordPayment(event.data.reference).catch((err) => {
        console.error("Webhook payment verification failed:", err);
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling Paystack webhook:", error);
    res.sendStatus(500);
  }
});


// --- VITE MIDDLEWARE / STATIC SERVING ---

async function setupClientServing() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware integrated.");
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static files serving integrated.");
  }
}

setupClientServing().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CMS Full-Stack server booted on http://0.0.0.0:${PORT}`);
  });
});
