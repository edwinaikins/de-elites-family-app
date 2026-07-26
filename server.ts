import express from "express";
import path from "path";
import "dotenv/config";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import { PILLARS, LEADERSHIP, GALLERY_ITEMS, DEFAULT_SHOUTOUTS, DEFAULT_MEMBERS, DEFAULT_EVENTS, DEFAULT_HERO } from "./src/data";

const { Pool } = pg;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Parse large JSON payloads for Base64 image uploads
app.use(express.json({ limit: "15mb" }));

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
