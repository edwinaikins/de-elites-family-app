# DE ELITES FAMILY

The official web portal for DE ELITES FAMILY — a Vite + React frontend
and an Express API in one Node process, backed by Postgres, with a
built-in CMS for managing every section of the site (pillars, leadership,
gallery, members, events, hero copy, shoutout wall, and CMS user accounts)
without touching code.

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4, Motion for animation
- **Backend:** Express, serving both the API and (in production) the
  built static frontend from one process
- **Database:** Postgres — see `db/schema.sql`. One table
  (`cms_sections`), one JSONB row per CMS section. This mirrors the
  original Firestore "one document per section" shape 1:1, which is why
  the frontend needed zero changes when the database was swapped out.
- **CMS:** Built into the app itself — click the admin icon in the navbar,
  log in, and edit any section. Changes save straight to Postgres.
- **CI/CD:** GitHub Actions builds and deploys to a Ubicloud VM on every
  push to `main`. See `DEPLOYMENT.md`.

## Run locally

**Prerequisites:** Node.js 20+, a Postgres database (local or remote).

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to your
   Postgres connection string.
3. Run the app:
   ```bash
   npm run dev
   ```
   The server boots on `http://localhost:3000`, creates the
   `cms_sections` table if it doesn't exist yet, and seeds it with the
   default content from `src/data.ts` on first run.

## Default CMS login

Username `admin`, password `password` — **change this before inviting
real members**; see the security note in `DEPLOYMENT.md` / the note
Claude gave you about hardening auth before wide rollout.

## Deploying

See `DEPLOYMENT.md` for the full one-time VM setup + GitHub Actions
secrets walkthrough. Short version: push to `main`, CI does the rest.

## Project structure

```
server.ts              Express API + static serving + Postgres access
src/                    React app (components, data defaults, CMS context)
db/schema.sql           Postgres schema reference (created automatically)
deploy/                 systemd service, nginx config, VM setup script
.github/workflows/      CI/CD pipeline
```
