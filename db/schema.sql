-- DE ELITES FAMILY — CMS schema
--
-- The app creates this table automatically on boot (see initDb() in
-- server.ts), so you do NOT need to run this manually for a normal deploy.
-- It's kept here as documentation and for manual inspection / backups.
--
-- Data model: one row per CMS "section" (pillars, leaders, gallery,
-- shoutouts, members, events, hero, users). Each section's full list of
-- items is stored as a JSONB array — this mirrors the original Firestore
-- "one document per section, items array inside" shape 1:1, so the
-- frontend and API contract needed zero changes when we swapped the
-- database out from under them.

CREATE TABLE IF NOT EXISTS cms_sections (
  section    TEXT PRIMARY KEY,
  items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Handy queries:
--
-- See every section and how many items each holds:
--   SELECT section, jsonb_array_length(items) AS item_count, updated_at
--   FROM cms_sections ORDER BY section;
--
-- Pretty-print one section:
--   SELECT jsonb_pretty(items) FROM cms_sections WHERE section = 'pillars';
--
-- Manually back up the whole CMS to a single JSON blob:
--   SELECT jsonb_object_agg(section, items) FROM cms_sections;
