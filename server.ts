import express from "express";
import path from "path";
import fs from "fs";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import multer from "multer";
import nodemailer from "nodemailer";
import { PILLARS, LEADERSHIP, GALLERY_ITEMS, DEFAULT_SHOUTOUTS, DEFAULT_MEMBERS, DEFAULT_EVENTS, DEFAULT_HERO } from "./src/data";

const { Pool } = pg;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Parse large JSON payloads for Base64 image uploads. Sections like Leaders,
// Pillars, Gallery, and Hero save their WHOLE array in one request (see
// /api/cms/update below) — so this limit has to cover every embedded
// profile/cover photo in that section combined, not just one image. Each
// photo can be up to 5MB raw (see ImageUpload.tsx's client-side cap), which
// is ~6.7MB once Base64-encoded; a handful of leaders each with a max-size
// photo can add up past a small limit, which is what caused a real "Request
// Entity Too Large" error on a Leaders save. 60mb leaves comfortable
// headroom for a large team/gallery without it becoming a real issue again.
//
// We also stash the raw request body on `req` (via the `verify` hook) so the
// Paystack webhook handler can compute an HMAC signature over the exact
// bytes Paystack sent — re-serializing the parsed JSON wouldn't reliably
// match byte-for-byte.
app.use(
  express.json({
    limit: "60mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// --- LEGACY GALLERY: bulk photo/video uploads ---
//
// Uploaded gallery media is written to disk (unlike other CMS images, which
// are stored as Base64 directly inside the cms_sections JSON blob) because
// event photos/videos can be tens of megabytes each, and cms_sections is
// fetched in bulk by every visitor on every page load — embedding large
// media there would make the whole site slow to load. Files live under
// UPLOADS_DIR/gallery and are served statically at /uploads/gallery/<file>;
// only the resulting small URL string is stored in a gallery item's `image`
// field (see GalleryItem.isVideo for how the frontend knows to render a
// <video> instead of an <img> for that URL).
//
// UPLOADS_DIR defaults to ./uploads (inside the app's working directory) but
// can be pointed elsewhere via the UPLOADS_DIR env var — useful if your
// deploy process ever does a clean checkout/clone that would wipe an in-repo
// uploads folder; pointing it at a directory outside the deployed app folder
// keeps previously uploaded media safe across deploys.
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");
const GALLERY_UPLOADS_DIR = path.join(UPLOADS_DIR, "gallery");
fs.mkdirSync(GALLERY_UPLOADS_DIR, { recursive: true });

app.use("/uploads", express.static(UPLOADS_DIR));

const galleryUploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, GALLERY_UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext =
      path.extname(file.originalname).toLowerCase() ||
      (file.mimetype.startsWith("video/") ? ".mp4" : ".jpg");
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const galleryUpload = multer({
  storage: galleryUploadStorage,
  limits: { fileSize: 150 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed."));
    }
  },
});

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

// --- Transactional email (welcome emails, admin password resets) ---
//
// Same "mock unless configured" posture as Paystack above: with no SMTP
// credentials set, an email is simply logged to the server console instead
// of failing outright, so account creation still works end-to-end while
// testing. The moment SMTP_HOST/SMTP_USER/SMTP_PASS are set, real emails
// start sending automatically — no flag to remember to flip (MAIL_MOCK can
// still force either behavior, same as PAYSTACK_MOCK).
function getSiteUrl(): string {
  return (process.env.SITE_URL || "https://de-elitesfamily.org").replace(/\/+$/, "");
}

function getMailFrom(): string {
  return process.env.SMTP_FROM || "DE ELITES FAMILY <no-reply@de-elitesfamily.org>";
}

function isMockMailEnabled(): boolean {
  const flag = process.env.MAIL_MOCK;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS;
}

let cachedMailTransporter: any = null;
function getMailTransporter(): any {
  if (cachedMailTransporter) return cachedMailTransporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  cachedMailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return cachedMailTransporter;
}

// Returns true once the email has been sent (or, in mock mode, logged) —
// false only on an actual send failure, so callers can tell the admin to
// share the credentials with the member directly if that happens.
async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (isMockMailEnabled()) {
    console.log(`\n[MOCK EMAIL] To: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return true;
  }
  try {
    await getMailTransporter().sendMail({ from: getMailFrom(), to, subject, text, html });
    return true;
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err);
    return false;
  }
}

function loginInstructionsHtml(fullName: string, username: string, tempPassword: string, heading: string): string {
  const url = getSiteUrl();
  return `
    <div style="font-family: sans-serif; color: #111; max-width: 480px; margin: 0 auto;">
      <h2 style="color:#b8860b;">${heading}</h2>
      <p>Hi ${fullName},</p>
      <p>Here are your DE ELITES FAMILY member portal login details:</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr><td style="padding:4px 12px 4px 0; color:#555;">Username</td><td style="padding:4px 0; font-weight:bold;">${username}</td></tr>
        <tr><td style="padding:4px 12px 4px 0; color:#555;">Temporary Password</td><td style="padding:4px 0; font-weight:bold;">${tempPassword}</td></tr>
      </table>
      <p>
        <a href="${url}" style="display:inline-block; background:#b8860b; color:#fff; padding:10px 20px; border-radius:4px; text-decoration:none; font-weight:bold;">
          Log In To Your Portal
        </a>
      </p>
      <p>Open the site above, click "Member Login", and sign in with the username and temporary password shown. You'll be asked to set your own password right after you log in.</p>
      <p style="color:#888; font-size:12px; margin-top:24px;">If you weren't expecting this email, you can ignore it.</p>
    </div>
  `;
}

async function sendWelcomeEmail(fullName: string, email: string, username: string, tempPassword: string): Promise<boolean> {
  const url = getSiteUrl();
  const text = `Hi ${fullName},\n\nYour DE ELITES FAMILY member portal account is ready.\n\nUsername: ${username}\nTemporary Password: ${tempPassword}\n\nLog in at ${url} (click "Member Login") using the details above. You'll be asked to set your own password right after you log in.\n\nIf you weren't expecting this email, you can ignore it.`;
  const html = loginInstructionsHtml(fullName, username, tempPassword, "Welcome to DE ELITES FAMILY");
  return sendMail(email, "Welcome to DE ELITES FAMILY — Your Portal Login", text, html);
}

async function sendPasswordResetEmail(fullName: string, email: string, username: string, tempPassword: string): Promise<boolean> {
  const url = getSiteUrl();
  const text = `Hi ${fullName},\n\nAn admin has reset your DE ELITES FAMILY member portal password.\n\nUsername: ${username}\nNew Temporary Password: ${tempPassword}\n\nLog in at ${url} (click "Member Login") using the details above. You'll be asked to set your own password right after you log in.\n\nIf you weren't expecting this, contact an admin.`;
  const html = loginInstructionsHtml(fullName, username, tempPassword, "Your DE ELITES FAMILY Password Was Reset");
  return sendMail(email, "Your DE ELITES FAMILY Password Was Reset", text, html);
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

    // Executive dues — a second, separate recurring monthly charge that only
    // members flagged as executives owe, billed ON TOP OF (not instead of)
    // their regular welfare dues. Identical shape to welfare_dues_payments
    // (period-based, partial/installment payments allowed) so it reuses the
    // exact same balance/payment logic, just against its own table and its
    // own per-member executive_dues_amount (see the member_accounts
    // migration below — 0 means "not an executive, nothing owed").
    await db.query(`
      CREATE TABLE IF NOT EXISTS executive_dues_payments (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        period TEXT NOT NULL,
        reference TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        channel TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // One-off bills — a single non-recurring charge an admin creates for a
    // member (or several members at once), e.g. an anniversary levy or a
    // one-time fine. Unlike dues/events, the row is created by the ADMIN
    // before any payment attempt exists, so `reference` starts out NULL and
    // only gets set the moment the member actually starts a checkout (see
    // /api/payments/bill/initialize) — same "nullable until used" shape as
    // member_accounts.username elsewhere in this file, and for the same
    // reason (a partial unique index still enforces no two live payment
    // attempts share a reference, while letting many bills sit with none).
    await db.query(`
      CREATE TABLE IF NOT EXISTS member_bills (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL,
        reference TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        channel TEXT,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS member_bills_reference_unique ON member_bills (reference) WHERE reference IS NOT NULL;`
    );

    // Migration: record which channel (card, mobile_money, bank, ...) a
    // payment cleared through, for reconciliation. Added after the tables
    // above already existed in production, hence ALTER TABLE ... ADD COLUMN
    // IF NOT EXISTS rather than baking it into the CREATE TABLE statements.
    await db.query(`ALTER TABLE welfare_dues_payments ADD COLUMN IF NOT EXISTS channel TEXT;`);
    await db.query(`ALTER TABLE event_payments ADD COLUMN IF NOT EXISTS channel TEXT;`);

    // Migration: members now log in with a username instead of their email
    // (email is kept — it's still needed for Paystack checkout and admin
    // reconciliation). `username` is nullable here purely so this migration
    // doesn't break existing production rows that predate it; a partial
    // unique index (below) enforces uniqueness only among rows that HAVE a
    // username set. Any pre-existing member accounts need a username
    // assigned by an admin (Member Accounts tab) before they can log in
    // again. `must_change_password` powers a "you're using a temporary
    // password" prompt right after login — it defaults to false here so
    // existing members aren't unexpectedly forced into it, but is set to
    // true for every newly created account and every admin password reset.
    await db.query(`ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS username TEXT;`);
    await db.query(`ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;`);
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS member_accounts_username_unique ON member_accounts (username) WHERE username IS NOT NULL;`
    );

    // Migration: Executive Dues — 0 (the default) means this member owes no
    // executive dues at all, i.e. isn't an executive; any positive amount
    // both flags them as one and sets what they owe each period, mirroring
    // how dues_amount = 0 already means "no welfare dues configured" above.
    await db.query(`ALTER TABLE member_accounts ADD COLUMN IF NOT EXISTS executive_dues_amount NUMERIC NOT NULL DEFAULT 0;`);

    // RSVPs for free (no-payment) events. `event_id` references an id inside
    // the `events` cms_sections JSONB blob rather than a real foreign key —
    // events aren't a normal table, so there's nothing to FK against. One
    // row per member+event (upserted on re-submit, so a member can change
    // their mind from Maybe to Yes etc. without piling up duplicate rows).
    await db.query(`
      CREATE TABLE IF NOT EXISTS event_rsvps (
        id TEXT PRIMARY KEY,
        member_id TEXT NOT NULL REFERENCES member_accounts(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL,
        event_title TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS event_rsvps_member_event_unique ON event_rsvps (member_id, event_id);`
    );

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

// --- Per-item CMS saves (Leadership, Legacy Gallery, Upcoming Events) ---
//
// The sections above (via /api/cms/update) are edited and saved as one
// whole array — fine for small sections, but Leaders/Gallery/Events can
// each carry several embedded Base64 photos, and resending the *entire*
// array just to change one card is both slow and the exact shape of
// request that triggered the old "Request Entity Too Large" bug. These
// routes let the CMS create/update/delete a single item by `id`, reading
// and rewriting the section's JSONB array server-side so the wire payload
// from the browser only ever carries the one item being touched.
const PER_ITEM_SECTIONS = ["leaders", "gallery", "events"];

async function readSectionItems(section: string): Promise<any[]> {
  const db = getPool();
  const result = await db.query("SELECT items FROM cms_sections WHERE section = $1", [section]);
  return result.rowCount === 0 ? getDefaultDataForSection(section) : result.rows[0].items;
}

async function writeSectionItems(section: string, items: any[]): Promise<void> {
  const db = getPool();
  await db.query(
    `INSERT INTO cms_sections (section, items, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (section) DO UPDATE SET items = EXCLUDED.items, updated_at = now()`,
    [section, JSON.stringify(items)]
  );
}

// Create-or-update a single item (upsert by `id`) within a per-item-capable
// section. Returns the full updated array so the client can just replace
// its local copy of that section.
app.post("/api/cms/:section/item", async (req, res) => {
  try {
    const { section } = req.params;
    if (!PER_ITEM_SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, error: `Per-item save isn't supported for '${section}'.` });
    }
    const item = req.body;
    if (!item || typeof item !== "object" || !item.id) {
      return res.status(400).json({ success: false, error: "A valid item with an 'id' is required." });
    }

    const items = await readSectionItems(section);
    const idx = items.findIndex((it: any) => it.id === item.id);
    const updated = idx >= 0 ? items.map((it: any, i: number) => (i === idx ? item : it)) : [item, ...items];
    await writeSectionItems(section, updated);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error(`Failed to save item in section '${req.params.section}':`, error);
    res.status(500).json({ success: false, error: error.message || "Failed to save item." });
  }
});

// Delete a single item by id from a per-item-capable section.
app.delete("/api/cms/:section/item/:id", async (req, res) => {
  try {
    const { section, id } = req.params;
    if (!PER_ITEM_SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, error: `Per-item delete isn't supported for '${section}'.` });
    }

    const items = await readSectionItems(section);
    const updated = items.filter((it: any) => it.id !== id);
    await writeSectionItems(section, updated);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error(`Failed to delete item from section '${req.params.section}':`, error);
    res.status(500).json({ success: false, error: error.message || "Failed to delete item." });
  }
});

// Bulk-upload photos/videos for the Legacy Gallery. Returns one
// { url, isVideo, originalName } per uploaded file — the CMS creates one
// gallery item per file client-side and the admin reviews/edits details
// (title, category, date, description) before hitting "Save All gallery".
// Multer is invoked manually (rather than as ordinary route middleware) so
// upload errors — bad file type, over the size limit — come back as a normal
// JSON error response instead of an unhandled exception.
app.post("/api/admin/gallery/upload", (req, res) => {
  galleryUpload.array("files", 20)(req, res, (err: any) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "One or more files exceed the 150MB per-file limit."
          : err.message || "Upload failed.";
      return res.status(400).json({ success: false, error: message });
    }
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(400).json({ success: false, error: "No files were uploaded." });
    }
    const data = files.map((f) => ({
      url: `/uploads/gallery/${f.filename}`,
      isVideo: f.mimetype.startsWith("video/"),
      originalName: f.originalname,
    }));
    res.json({ success: true, data });
  });
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
    username: row.username || "",
    email: row.email,
    bio: row.bio || "",
    image: row.image || undefined,
    chapter: row.chapter || undefined,
    role: row.role || undefined,
    phone: row.phone || undefined,
    duesAmount: Number(row.dues_amount),
    executiveDuesAmount: Number(row.executive_dues_amount || 0),
    currency: row.currency,
    status: row.status,
    mustChangePassword: row.must_change_password === true,
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
    channel: row.channel || undefined,
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
    channel: row.channel || undefined,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
  };
}

function mapBillRow(row: any) {
  return {
    id: row.id,
    memberId: row.member_id,
    label: row.label,
    amount: Number(row.amount),
    currency: row.currency,
    reference: row.reference || undefined,
    status: row.status,
    channel: row.channel || undefined,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
  };
}

function mapRsvpRow(row: any) {
  return {
    id: row.id,
    memberId: row.member_id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    response: row.response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }
    const db = getPool();
    const result = await db.query("SELECT * FROM member_accounts WHERE username = $1", [String(username).trim().toLowerCase()]);
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ success: false, error: "Invalid username or password." });
    }
    if (row.status !== "active") {
      return res.status(403).json({ success: false, error: "This account has been suspended. Contact an admin." });
    }
    const matches = await bcrypt.compare(password, row.password_hash);
    if (!matches) {
      return res.status(401).json({ success: false, error: "Invalid username or password." });
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
    const updated = await db.query(
      "UPDATE member_accounts SET password_hash = $2, must_change_password = false WHERE id = $1 RETURNING *",
      [req.memberId, newHash]
    );
    res.json({ success: true, message: "Password updated.", data: mapMemberRow(updated.rows[0]) });
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

// A member's one-off bills — both still-unpaid ones (to show "you owe...")
// and their full history of past ones, newest first either way.
app.get("/api/member/bills", requireMemberAuth, async (req: any, res) => {
  try {
    const db = getPool();
    const result = await db.query("SELECT * FROM member_bills WHERE member_id = $1 ORDER BY created_at DESC", [req.memberId]);
    res.json({ success: true, data: result.rows.map(mapBillRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load bills." });
  }
});

// --- Event RSVPs (free events only — paid events use the payment flow
// above as the registration signal instead) ---

// Every RSVP this member has ever submitted, so the UI can show "You said
// Yes" against each event without a separate per-event lookup.
app.get("/api/member/rsvps", requireMemberAuth, async (req: any, res) => {
  try {
    const db = getPool();
    const result = await db.query("SELECT * FROM event_rsvps WHERE member_id = $1 ORDER BY updated_at DESC", [req.memberId]);
    res.json({ success: true, data: result.rows.map(mapRsvpRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load RSVPs." });
  }
});

// Submit or change this member's RSVP for one event. Upserted on
// (member_id, event_id) so re-submitting (e.g. Maybe -> Yes) just updates
// the same row instead of piling up duplicates.
app.post("/api/events/:eventId/rsvp", requireMemberAuth, async (req: any, res) => {
  try {
    const { eventId } = req.params;
    const { response } = req.body || {};
    if (!["yes", "no", "maybe"].includes(response)) {
      return res.status(400).json({ success: false, error: "Response must be one of yes, no, maybe." });
    }
    const event = await getEventById(eventId);
    if (!event) return res.status(404).json({ success: false, error: "Event not found." });
    const db = getPool();
    const result = await db.query(
      `INSERT INTO event_rsvps (id, member_id, event_id, event_title, response)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (member_id, event_id)
       DO UPDATE SET response = $5, event_title = $4, updated_at = now()
       RETURNING *`,
      [`rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, req.memberId, eventId, event.title, response]
    );
    res.json({ success: true, data: mapRsvpRow(result.rows[0]) });
  } catch (error: any) {
    console.error("Failed to submit RSVP:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to submit RSVP." });
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
    if (!b.fullName || !b.username || !b.email || !b.password) {
      return res.status(400).json({ success: false, error: "fullName, username, email, and password are required." });
    }
    if (String(b.password).length < 8) {
      return res.status(400).json({ success: false, error: "Password must be at least 8 characters." });
    }
    const username = String(b.username).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      return res.status(400).json({
        success: false,
        error: "Username must be 3-32 characters and can only contain letters, numbers, dots, underscores, and hyphens.",
      });
    }
    const email = String(b.email).trim().toLowerCase();
    const db = getPool();
    const existingUsername = await db.query("SELECT 1 FROM member_accounts WHERE username = $1", [username]);
    if ((existingUsername.rowCount ?? 0) > 0) {
      return res.status(409).json({ success: false, error: "This username is already taken." });
    }
    const existing = await db.query("SELECT 1 FROM member_accounts WHERE email = $1", [email]);
    if ((existing.rowCount ?? 0) > 0) {
      return res.status(409).json({ success: false, error: "An account with this email already exists." });
    }
    const passwordHash = await bcrypt.hash(String(b.password), 10);
    const id = `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await db.query(
      `INSERT INTO member_accounts (id, full_name, username, email, password_hash, bio, image, chapter, role, phone, dues_amount, executive_dues_amount, currency, status, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',true) RETURNING *`,
      [
        id,
        String(b.fullName).trim(),
        username,
        email,
        passwordHash,
        typeof b.bio === "string" ? b.bio : "",
        b.image || null,
        b.chapter || null,
        b.role || null,
        b.phone || null,
        Number(b.duesAmount) || 0,
        Number(b.executiveDuesAmount) || 0,
        b.currency || getDuesCurrency(),
      ]
    );
    const created = mapMemberRow(result.rows[0]);
    // Best-effort — a failed/mocked email should never block account
    // creation itself, just get surfaced to the admin so they know to share
    // the credentials with the member some other way.
    const emailSent = await sendWelcomeEmail(created.fullName, created.email, created.username, String(b.password));
    res.json({ success: true, data: created, emailSent, mailMock: isMockMailEnabled() });
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

    if (typeof b.username === "string" && b.username.trim()) {
      const username = b.username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        return res.status(400).json({
          success: false,
          error: "Username must be 3-32 characters and can only contain letters, numbers, dots, underscores, and hyphens.",
        });
      }
      const existingUsername = await db.query("SELECT 1 FROM member_accounts WHERE username = $1 AND id != $2", [username, id]);
      if ((existingUsername.rowCount ?? 0) > 0) {
        return res.status(409).json({ success: false, error: "This username is already taken." });
      }
      await db.query("UPDATE member_accounts SET username = $2 WHERE id = $1", [id, username]);
    }

    let passwordWasReset = false;
    if (b.resetPassword) {
      if (String(b.resetPassword).length < 8) {
        return res.status(400).json({ success: false, error: "New password must be at least 8 characters." });
      }
      // A reset password is a new temporary password — the member is
      // prompted to replace it with their own the next time they log in.
      const passwordHash = await bcrypt.hash(String(b.resetPassword), 10);
      await db.query("UPDATE member_accounts SET password_hash = $2, must_change_password = true WHERE id = $1", [id, passwordHash]);
      passwordWasReset = true;
    }

    const result = await db.query(
      `UPDATE member_accounts SET
        full_name = COALESCE($2, full_name),
        chapter = COALESCE($3, chapter),
        role = COALESCE($4, role),
        dues_amount = COALESCE($5, dues_amount),
        currency = COALESCE($6, currency),
        status = COALESCE($7, status),
        executive_dues_amount = COALESCE($8, executive_dues_amount),
        phone = COALESCE($9, phone)
       WHERE id = $1 RETURNING *`,
      [
        id,
        typeof b.fullName === "string" ? b.fullName.trim() : null,
        typeof b.chapter === "string" ? b.chapter : null,
        typeof b.role === "string" ? b.role : null,
        b.duesAmount !== undefined ? Number(b.duesAmount) : null,
        typeof b.currency === "string" ? b.currency : null,
        typeof b.status === "string" ? b.status : null,
        b.executiveDuesAmount !== undefined ? Number(b.executiveDuesAmount) : null,
        typeof b.phone === "string" ? b.phone : null,
      ]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Member account not found." });
    const updated = mapMemberRow(result.rows[0]);

    let emailSent: boolean | undefined;
    if (passwordWasReset) {
      emailSent = await sendPasswordResetEmail(updated.fullName, updated.email, updated.username, String(b.resetPassword));
    }
    res.json({ success: true, data: updated, emailSent, mailMock: isMockMailEnabled() });
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

app.get("/api/admin/members/:id/executive-dues", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();
    const result = await db.query("SELECT * FROM executive_dues_payments WHERE member_id = $1 ORDER BY created_at DESC", [id]);
    res.json({ success: true, data: result.rows.map(mapDuesRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load executive dues history." });
  }
});

app.get("/api/admin/members/:id/bills", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();
    const result = await db.query("SELECT * FROM member_bills WHERE member_id = $1 ORDER BY created_at DESC", [id]);
    res.json({ success: true, data: result.rows.map(mapBillRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load bills." });
  }
});

// Who RSVP'd Yes/No/Maybe for a given event, joined with each member's name
// + email so the CMS can show a readable attendee list rather than raw ids.
app.get("/api/admin/events/:eventId/rsvps", async (req, res) => {
  try {
    const { eventId } = req.params;
    const db = getPool();
    const result = await db.query(
      `SELECT r.*, m.full_name, m.email
       FROM event_rsvps r
       JOIN member_accounts m ON m.id = r.member_id
       WHERE r.event_id = $1
       ORDER BY r.updated_at DESC`,
      [eventId]
    );
    const data = result.rows.map((row) => ({
      ...mapRsvpRow(row),
      memberName: row.full_name,
      memberEmail: row.email,
    }));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load RSVPs." });
  }
});

function mapAdminPaymentRow(row: any) {
  return {
    id: row.id,
    type: row.type,
    memberId: row.member_id,
    memberName: row.full_name,
    memberEmail: row.email,
    label: row.label,
    amount: Number(row.amount),
    currency: row.currency,
    channel: row.channel || undefined,
    reference: row.reference,
    status: row.status,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
  };
}

// Reconciliation: every dues + event + executive dues + one-off bill across
// every member, joined with the member's name/email, newest first — the
// "who paid what" view the CMS Payments tab renders. Combines all four
// payment tables with a UNION ALL rather than four round-trips so
// sorting/paging stays consistent.
app.get("/api/admin/payments", async (req, res) => {
  try {
    const db = getPool();
    const result = await db.query(`
      SELECT wd.id, wd.member_id, ma.full_name, ma.email, 'dues' AS type,
             wd.period AS label, wd.amount, wd.currency, wd.channel,
             wd.reference, wd.status, wd.paid_at, wd.created_at
      FROM welfare_dues_payments wd
      JOIN member_accounts ma ON ma.id = wd.member_id
      UNION ALL
      SELECT ep.id, ep.member_id, ma.full_name, ma.email, 'event' AS type,
             ep.event_title AS label, ep.amount, ep.currency, ep.channel,
             ep.reference, ep.status, ep.paid_at, ep.created_at
      FROM event_payments ep
      JOIN member_accounts ma ON ma.id = ep.member_id
      UNION ALL
      SELECT xd.id, xd.member_id, ma.full_name, ma.email, 'executive-dues' AS type,
             xd.period AS label, xd.amount, xd.currency, xd.channel,
             xd.reference, xd.status, xd.paid_at, xd.created_at
      FROM executive_dues_payments xd
      JOIN member_accounts ma ON ma.id = xd.member_id
      UNION ALL
      SELECT mb.id, mb.member_id, ma.full_name, ma.email, 'bill' AS type,
             mb.label AS label, mb.amount, mb.currency, mb.channel,
             mb.reference, mb.status, mb.paid_at, mb.created_at
      FROM member_bills mb
      JOIN member_accounts ma ON ma.id = mb.member_id
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result.rows.map(mapAdminPaymentRow) });
  } catch (error: any) {
    console.error("Failed to load admin payments:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to load payments." });
  }
});

// Create one or more one-off bills at once — pass a single-element
// memberIds array to bill one person, or several/all member ids to bill a
// group with the same label/amount in one action (each still gets its own
// independent row, so one person's payment/deletion never touches another's).
app.post("/api/admin/bills", async (req, res) => {
  try {
    const b = req.body || {};
    const memberIds: string[] = Array.isArray(b.memberIds) ? b.memberIds.filter((x: any) => typeof x === "string" && x) : [];
    if (memberIds.length === 0) {
      return res.status(400).json({ success: false, error: "At least one recipient is required." });
    }
    const label = typeof b.label === "string" ? b.label.trim() : "";
    if (!label) {
      return res.status(400).json({ success: false, error: "A bill label/description is required." });
    }
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Enter a valid amount greater than zero." });
    }

    const db = getPool();
    const membersRes = await db.query("SELECT id, currency FROM member_accounts WHERE id = ANY($1::text[])", [memberIds]);
    if (membersRes.rowCount !== memberIds.length) {
      return res.status(404).json({ success: false, error: "One or more selected members could not be found." });
    }

    const created: any[] = [];
    for (const member of membersRes.rows) {
      const currency = typeof b.currency === "string" && b.currency.trim() ? b.currency.trim().toUpperCase() : member.currency;
      const id = `bill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await db.query(
        `INSERT INTO member_bills (id, member_id, label, amount, currency, status)
         VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
        [id, member.id, label, amount, currency]
      );
      created.push(result.rows[0]);
    }

    res.json({ success: true, data: created.map(mapBillRow) });
  } catch (error: any) {
    console.error("Failed to create bill(s):", error);
    res.status(500).json({ success: false, error: error.message || "Failed to create bill." });
  }
});

// Edit a still-pending bill's details, or mark it paid manually (a payment
// collected outside Paystack — cash, bank transfer, etc.).
app.patch("/api/admin/bills/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const b = req.body || {};
    const db = getPool();

    if (b.markPaidChannel) {
      const channel = String(b.markPaidChannel).trim() || "cash";
      const result = await db.query(
        `UPDATE member_bills SET status = 'success', paid_at = now(), channel = $2,
           reference = COALESCE(reference, $3)
         WHERE id = $1 RETURNING *`,
        [id, channel, `manual-bill-${id}-${Date.now()}`]
      );
      if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Bill not found." });
      return res.json({ success: true, data: mapBillRow(result.rows[0]) });
    }

    const result = await db.query(
      `UPDATE member_bills SET
        label = COALESCE($2, label),
        amount = COALESCE($3, amount)
       WHERE id = $1 RETURNING *`,
      [id, typeof b.label === "string" && b.label.trim() ? b.label.trim() : null, b.amount !== undefined ? Number(b.amount) : null]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Bill not found." });
    res.json({ success: true, data: mapBillRow(result.rows[0]) });
  } catch (error: any) {
    console.error("Failed to update bill:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to update bill." });
  }
});

app.delete("/api/admin/bills/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getPool();
    const result = await db.query("DELETE FROM member_bills WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Bill not found." });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete bill:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to delete bill." });
  }
});

// Manually log a payment collected outside Paystack (cash, bank transfer,
// cheque, etc.) so reconciliation stays complete even for offline
// collections. Defaults to status 'success' since a manual entry is
// typically logged after the money already changed hands, but an admin can
// still record 'pending' (a promise) or 'failed' (a bounced payment) for a
// full paper trail.
app.post("/api/admin/payments", async (req, res) => {
  try {
    const b = req.body || {};
    const type = ["event", "dues", "executive-dues"].includes(b.type) ? b.type : null;
    if (!type) {
      return res.status(400).json({ success: false, error: "type must be 'dues', 'executive-dues', or 'event'." });
    }
    const memberId = typeof b.memberId === "string" ? b.memberId : "";
    if (!memberId) {
      return res.status(400).json({ success: false, error: "A member is required." });
    }
    const amount = Number(b.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Enter a valid amount greater than zero." });
    }
    const status = ["pending", "success", "failed"].includes(b.status) ? b.status : "success";

    const db = getPool();
    const memberRes = await db.query("SELECT * FROM member_accounts WHERE id = $1", [memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });

    const currency = typeof b.currency === "string" && b.currency.trim() ? b.currency.trim().toUpperCase() : member.currency;
    const channel = typeof b.channel === "string" && b.channel.trim() ? b.channel.trim() : "cash";

    let row: any;
    if (type === "dues" || type === "executive-dues") {
      const period = typeof b.period === "string" ? b.period.trim() : "";
      if (!period) {
        return res.status(400).json({ success: false, error: "A dues period (e.g. '2026-08') is required." });
      }
      const table = type === "dues" ? "welfare_dues_payments" : "executive_dues_payments";
      const idPrefix = type === "dues" ? "dp" : "edp";
      const referencePrefix = type === "dues" ? "manual-dues" : "manual-exec-dues";
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const reference = `${referencePrefix}-${memberId}-${period}-${Date.now()}`;
      const result = await db.query(
        `INSERT INTO ${table} (id, member_id, amount, currency, period, reference, status, channel, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $7 = 'success' THEN now() ELSE NULL END)
         RETURNING *`,
        [id, memberId, amount, currency, period, reference, status, channel]
      );
      row = { ...result.rows[0], full_name: member.full_name, email: member.email, type, label: result.rows[0].period };
    } else {
      let eventTitle = typeof b.eventTitle === "string" ? b.eventTitle.trim() : "";
      const eventId = typeof b.eventId === "string" ? b.eventId.trim() : "";
      if (eventId) {
        const event = await getEventById(eventId);
        if (event) eventTitle = event.title;
      }
      if (!eventTitle) {
        return res.status(400).json({ success: false, error: "An event title is required." });
      }
      const id = `ep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const reference = `manual-event-${memberId}-${Date.now()}`;
      const result = await db.query(
        `INSERT INTO event_payments (id, member_id, event_id, event_title, amount, currency, reference, status, channel, paid_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, CASE WHEN $8 = 'success' THEN now() ELSE NULL END)
         RETURNING *`,
        [id, memberId, eventId || "manual", eventTitle, amount, currency, reference, status, channel]
      );
      row = { ...result.rows[0], full_name: member.full_name, email: member.email, type: "event", label: result.rows[0].event_title };
    }

    res.json({ success: true, data: mapAdminPaymentRow(row) });
  } catch (error: any) {
    console.error("Failed to create manual payment:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to log payment." });
  }
});

const PAYMENT_TYPE_TABLES: Record<string, string> = {
  dues: "welfare_dues_payments",
  event: "event_payments",
  "executive-dues": "executive_dues_payments",
  bill: "member_bills",
};

app.delete("/api/admin/payments/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    const table = PAYMENT_TYPE_TABLES[type];
    if (!table) {
      return res.status(400).json({ success: false, error: "type must be 'dues', 'executive-dues', 'event', or 'bill'." });
    }
    const db = getPool();
    const result = await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, error: "Payment record not found." });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete payment:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to delete payment." });
  }
});

// --- Payments (Paystack) ---
//
// We never let the client dictate an amount out of thin air. Both
// "initialize" routes look up the trustworthy ceiling server-side (the
// member's configured dues amount, or the event's configured price) and
// write a 'pending' row before telling the client anything, so a Paystack
// verify (or webhook) later has something authoritative to check the
// charge against. Dues payments additionally support paying less than the
// full amount owed for a period (see getDuesPaidSoFar below) — a member can
// make several partial payments toward one period; event registration
// payments stay all-or-nothing since a half-paid event ticket isn't a
// meaningful state.

// Sum of already-successful dues payments a member has made for a given
// period, so both initialize (to cap what can still be paid) and the
// member/admin UIs (to show "GHS 20 of GHS 50 paid") can compute a
// consistent remaining balance.
async function getDuesPaidSoFar(memberId: string, period: string): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS paid FROM welfare_dues_payments WHERE member_id = $1 AND period = $2 AND status = 'success'`,
    [memberId, period]
  );
  return Number(result.rows[0]?.paid || 0);
}

// Same as getDuesPaidSoFar but against executive_dues_payments — kept as a
// separate function (rather than parameterizing the table name) since it's
// the one place a raw identifier would otherwise get interpolated into SQL.
async function getExecutiveDuesPaidSoFar(memberId: string, period: string): Promise<number> {
  const db = getPool();
  const result = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS paid FROM executive_dues_payments WHERE member_id = $1 AND period = $2 AND status = 'success'`,
    [memberId, period]
  );
  return Number(result.rows[0]?.paid || 0);
}

// Lets the client show a "Test Mode" badge on payment buttons before the
// member even starts a checkout, rather than only discovering it's a mock
// payment once the initialize call comes back.
app.get("/api/payments/config", (req, res) => {
  res.json({ success: true, data: { mock: isMockPaymentsEnabled() } });
});

// Lets the member portal show "GHS 20 of GHS 50 paid" for the currently
// selected period without re-deriving it from the full payment history on
// the client.
app.get("/api/member/dues-balance/:period", requireMemberAuth, async (req: any, res) => {
  try {
    const { period } = req.params;
    const db = getPool();
    const memberRes = await db.query("SELECT dues_amount, currency FROM member_accounts WHERE id = $1", [req.memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });
    const duesAmount = Number(member.dues_amount);
    const paid = await getDuesPaidSoFar(req.memberId, period);
    const remaining = Math.max(0, Math.round((duesAmount - paid) * 100) / 100);
    res.json({ success: true, data: { period, duesAmount, paid, remaining, currency: member.currency } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load dues balance." });
  }
});

// Executive dues — same "GHS 20 of GHS 50 paid" balance concept as regular
// welfare dues, just against the member's separate executive_dues_amount
// and its own payment table.
app.get("/api/member/executive-dues-balance/:period", requireMemberAuth, async (req: any, res) => {
  try {
    const { period } = req.params;
    const db = getPool();
    const memberRes = await db.query("SELECT executive_dues_amount, currency FROM member_accounts WHERE id = $1", [req.memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });
    const duesAmount = Number(member.executive_dues_amount);
    const paid = await getExecutiveDuesPaidSoFar(req.memberId, period);
    const remaining = Math.max(0, Math.round((duesAmount - paid) * 100) / 100);
    res.json({ success: true, data: { period, duesAmount, paid, remaining, currency: member.currency } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load executive dues balance." });
  }
});

app.get("/api/member/executive-dues-history", requireMemberAuth, async (req: any, res) => {
  try {
    const db = getPool();
    const result = await db.query(
      "SELECT * FROM executive_dues_payments WHERE member_id = $1 ORDER BY created_at DESC",
      [req.memberId]
    );
    res.json({ success: true, data: result.rows.map(mapDuesRow) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to load executive dues history." });
  }
});

app.post("/api/payments/executive-dues/initialize", requireMemberAuth, async (req: any, res) => {
  try {
    const { period, amount: requestedAmount } = req.body || {};
    if (!period || typeof period !== "string") {
      return res.status(400).json({ success: false, error: "A dues period (e.g. '2026-08') is required." });
    }
    const db = getPool();
    const memberRes = await db.query("SELECT * FROM member_accounts WHERE id = $1", [req.memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });
    const duesAmount = Number(member.executive_dues_amount);
    if (!duesAmount || duesAmount <= 0) {
      return res.status(400).json({ success: false, error: "No executive dues amount has been configured for your account." });
    }

    const paidSoFar = await getExecutiveDuesPaidSoFar(req.memberId, period);
    const remaining = Math.round((duesAmount - paidSoFar) * 100) / 100;
    if (remaining <= 0) {
      return res.status(400).json({ success: false, error: `You've already fully paid your executive dues for ${period}.` });
    }

    let amount = remaining;
    if (requestedAmount !== undefined && requestedAmount !== null && requestedAmount !== "") {
      const requested = Math.round(Number(requestedAmount) * 100) / 100;
      if (!Number.isFinite(requested) || requested <= 0) {
        return res.status(400).json({ success: false, error: "Enter a valid payment amount." });
      }
      if (requested > remaining + 0.01) {
        return res.status(400).json({ success: false, error: `You only owe ${member.currency} ${remaining.toFixed(2)} for this period.` });
      }
      amount = requested;
    }

    const mock = isMockPaymentsEnabled();
    const publicKey = mock ? "mock" : getPaystackPublicKey();
    if (!mock && !publicKey) {
      return res.status(503).json({ success: false, error: "Payments are not configured yet. Contact an admin." });
    }

    const reference = `${mock ? MOCK_REFERENCE_PREFIX : ""}exec-dues-${req.memberId}-${period}-${Date.now()}`;
    await db.query(
      `INSERT INTO executive_dues_payments (id, member_id, amount, currency, period, reference, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [`edp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, req.memberId, amount, member.currency, period, reference]
    );

    res.json({ success: true, data: { reference, amount, currency: member.currency, email: member.email, publicKey, mock } });
  } catch (error: any) {
    console.error("Failed to initialize executive dues payment:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to start payment." });
  }
});

app.post("/api/payments/dues/initialize", requireMemberAuth, async (req: any, res) => {
  try {
    const { period, amount: requestedAmount } = req.body || {};
    if (!period || typeof period !== "string") {
      return res.status(400).json({ success: false, error: "A dues period (e.g. '2026-08') is required." });
    }
    const db = getPool();
    const memberRes = await db.query("SELECT * FROM member_accounts WHERE id = $1", [req.memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });
    const duesAmount = Number(member.dues_amount);
    if (!duesAmount || duesAmount <= 0) {
      return res.status(400).json({ success: false, error: "No welfare dues amount has been configured for your account. Contact an admin." });
    }

    const paidSoFar = await getDuesPaidSoFar(req.memberId, period);
    const remaining = Math.round((duesAmount - paidSoFar) * 100) / 100;
    if (remaining <= 0) {
      return res.status(400).json({ success: false, error: `You've already fully paid your dues for ${period}.` });
    }

    // Default to paying off the full remaining balance; allow a smaller,
    // partial amount if the member specifies one (installment-style
    // payments toward one period).
    let amount = remaining;
    if (requestedAmount !== undefined && requestedAmount !== null && requestedAmount !== "") {
      const requested = Math.round(Number(requestedAmount) * 100) / 100;
      if (!Number.isFinite(requested) || requested <= 0) {
        return res.status(400).json({ success: false, error: "Enter a valid payment amount." });
      }
      // Small epsilon tolerance for floating point rounding.
      if (requested > remaining + 0.01) {
        return res.status(400).json({ success: false, error: `You only owe ${member.currency} ${remaining.toFixed(2)} for this period.` });
      }
      amount = requested;
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

// A bill is created by an admin first (see POST /api/admin/bills) and only
// gets a Paystack reference once the member actually starts paying it — so
// unlike the dues/event initialize routes above, this one UPDATEs an
// existing row instead of INSERTing a new one. Safe to call again on a
// still-pending bill (e.g. the member abandoned an earlier checkout
// attempt) since it just overwrites the reference with a fresh one.
app.post("/api/payments/bill/initialize", requireMemberAuth, async (req: any, res) => {
  try {
    const { billId } = req.body || {};
    if (!billId) {
      return res.status(400).json({ success: false, error: "billId is required." });
    }
    const db = getPool();
    const billRes = await db.query("SELECT * FROM member_bills WHERE id = $1 AND member_id = $2", [billId, req.memberId]);
    const bill = billRes.rows[0];
    if (!bill) return res.status(404).json({ success: false, error: "Bill not found." });
    if (bill.status === "success") {
      return res.status(400).json({ success: false, error: "This bill has already been paid." });
    }

    const memberRes = await db.query("SELECT email FROM member_accounts WHERE id = $1", [req.memberId]);
    const member = memberRes.rows[0];
    if (!member) return res.status(404).json({ success: false, error: "Member not found." });

    const mock = isMockPaymentsEnabled();
    const publicKey = mock ? "mock" : getPaystackPublicKey();
    if (!mock && !publicKey) {
      return res.status(503).json({ success: false, error: "Payments are not configured yet. Contact an admin." });
    }

    const reference = `${mock ? MOCK_REFERENCE_PREFIX : ""}bill-${req.memberId}-${billId}-${Date.now()}`;
    await db.query("UPDATE member_bills SET reference = $2, status = 'pending' WHERE id = $1", [billId, reference]);

    res.json({
      success: true,
      data: { reference, amount: Number(bill.amount), currency: bill.currency, email: member.email, publicKey, mock },
    });
  } catch (error: any) {
    console.error("Failed to initialize bill payment:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to start payment." });
  }
});

async function findPaymentByReference(reference: string) {
  const db = getPool();
  const duesRes = await db.query("SELECT * FROM welfare_dues_payments WHERE reference = $1", [reference]);
  if ((duesRes.rowCount ?? 0) > 0) return { table: "welfare_dues_payments" as const, row: duesRes.rows[0] };
  const eventRes = await db.query("SELECT * FROM event_payments WHERE reference = $1", [reference]);
  if ((eventRes.rowCount ?? 0) > 0) return { table: "event_payments" as const, row: eventRes.rows[0] };
  const execDuesRes = await db.query("SELECT * FROM executive_dues_payments WHERE reference = $1", [reference]);
  if ((execDuesRes.rowCount ?? 0) > 0) return { table: "executive_dues_payments" as const, row: execDuesRes.rows[0] };
  const billRes = await db.query("SELECT * FROM member_bills WHERE reference = $1", [reference]);
  if ((billRes.rowCount ?? 0) > 0) return { table: "member_bills" as const, row: billRes.rows[0] };
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

// Allowlist for the channel a mock checkout can self-report — real payments
// never reach this list; their channel always comes from Paystack's own
// verify response below, never from anything the client sends.
const MOCK_CHANNELS = new Set(["card", "mobile_money"]);

// Shared by the member-facing verify endpoint and the webhook handler.
// Re-checks status/amount/currency against what WE recorded at initialize
// time before ever marking a payment as successful.
async function verifyAndRecordPayment(reference: string, expectedMemberId?: string, clientReportedChannel?: string) {
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
  // mock checkout, which never reaches this endpoint at all). The channel
  // (card vs mobile money) is only ever trusted from the client for mock
  // references — for real payments it always comes from Paystack's verify
  // response a few lines down, never from req.body.
  const isMock = reference.startsWith(MOCK_REFERENCE_PREFIX);
  let isValid: boolean;
  let channel: string | undefined;
  if (isMock) {
    isValid = true;
    channel = clientReportedChannel && MOCK_CHANNELS.has(clientReportedChannel) ? clientReportedChannel : "card";
  } else {
    const data = await verifyWithPaystack(reference);
    const expectedSubunit = Math.round(Number(row.amount) * 100);
    isValid = data.status === "success" && data.amount === expectedSubunit && data.currency === row.currency;
    channel = data.channel || undefined;
  }

  const db = getPool();
  if (isValid) {
    const updated = await db.query(
      `UPDATE ${table} SET status = 'success', paid_at = now(), channel = $2 WHERE reference = $1 RETURNING *`,
      [reference, channel || null]
    );
    return { success: true as const, table, row: updated.rows[0] };
  } else {
    await db.query(`UPDATE ${table} SET status = 'failed' WHERE reference = $1 AND status = 'pending'`, [reference]);
    return { success: false as const, error: "Payment could not be verified with Paystack." };
  }
}

// Maps each payment table to the short `type` tag the client keys its UI
// off of, and to the row-shape mapper for that table.
const PAYMENT_TABLE_INFO = {
  welfare_dues_payments: { type: "dues", mapper: mapDuesRow },
  event_payments: { type: "event", mapper: mapEventPaymentRow },
  executive_dues_payments: { type: "executive-dues", mapper: mapDuesRow },
  member_bills: { type: "bill", mapper: mapBillRow },
} as const;

app.post("/api/payments/verify", requireMemberAuth, async (req: any, res) => {
  try {
    const { reference, channel } = req.body || {};
    if (!reference) return res.status(400).json({ success: false, error: "reference is required." });
    const result = await verifyAndRecordPayment(reference, req.memberId, typeof channel === "string" ? channel : undefined);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    const info = PAYMENT_TABLE_INFO[result.table];
    res.json({ success: true, data: info.mapper(result.row), type: info.type });
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
