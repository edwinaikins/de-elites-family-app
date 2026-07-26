# Deploying DE ELITES FAMILY

This app is a Vite + React frontend and an Express API, both served by one
Node process (`server.ts` → built to `dist/server.cjs`), backed by Postgres.
CI/CD is a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds on every push to `main` and deploys over SSH to your Ubicloud VM.

Do this once, in order. After that, `git push` is your whole deploy loop.

## 0. What you need before starting

- A GitHub repository for this project (empty is fine).
- SSH access to your Ubicloud VM (you already have this).
- Your Postgres connection string (you already have this).

## 1. Push this code to GitHub

```bash
cd de-elites-family-app
git init
git add .
git commit -m "Initial commit: DE ELITES FAMILY, Postgres-backed"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 2. Provision the VM (one time)

SSH into the VM:

```bash
ssh -i <PRIVATE_KEY_PATH> edwinaikins@178.63.178.212
```

Once on the VM, get the `deploy/` folder onto it. Easiest is to clone the
repo you just pushed (or `scp` the `deploy/` folder over from your laptop).
Then, **with your real Postgres connection string exported** (so the
script writes a working `.env` — see the security note below for why we
don't hardcode it in the script), run:

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
export DATABASE_URL="postgresql://user:password@host:5432/postgres?sslmode=require"
chmod +x deploy/setup-vm.sh
./deploy/setup-vm.sh
```

This installs Node 20, nginx, creates `~/apps/de-elites-family`, writes
`.env` there, installs a systemd **user** service (see the comment at the
top of `deploy/de-elites-family.service` for why it's a user service and
not a sudo one — short version: it lets CI restart the app over SSH
without needing passwordless sudo), and configures nginx as a reverse
proxy on port 80. It does not start the app yet — there's no `dist/`
folder until the first CI deploy builds one.

**Security note:** never commit a `.env` file or hardcode the real
`DATABASE_URL` into anything that goes into git. `deploy/setup-vm.sh` is
written so the real secret only ever lives in `~/apps/de-elites-family/.env`
on the VM itself (created with `chmod 600`), never in the repo.

## 3. Add GitHub Actions secrets

In your GitHub repo: **Settings → Secrets and variables → Actions → New
repository secret**. Add these four:

| Secret name | Value |
|---|---|
| `VM_SSH_PRIVATE_KEY` | The full contents of your private key file (the one at `<PRIVATE_KEY_PATH>`) — paste the whole thing, including the `-----BEGIN...-----` / `-----END...-----` lines |
| `VM_HOST` | `178.63.178.212` |
| `VM_USER` | `edwinaikins` |
| `VM_APP_DIR` | `/home/edwinaikins/apps/de-elites-family` |

Never paste the private key anywhere except this GitHub secrets form —
not into chat, not into a committed file.

## 4. Trigger the first deploy

```bash
git commit --allow-empty -m "Trigger first deploy"
git push
```

Watch it run under the **Actions** tab of your repo. On success, the app
becomes reachable at `http://178.63.178.212/`.

## 5. Day-to-day: vibe coding loop

Make changes locally (or ask Claude to), then:

```bash
git add -A
git commit -m "whatever you changed"
git push
```

GitHub Actions rebuilds and redeploys automatically — usually done within
a minute or two.

## Troubleshooting

Check service status and logs on the VM:

```bash
ssh -i <PRIVATE_KEY_PATH> edwinaikins@178.63.178.212
systemctl --user status de-elites-family
journalctl --user -u de-elites-family -n 100 --no-pager
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/health/db   # confirms Postgres connectivity
```

If `systemctl --user` says it can't connect to the bus, re-run
`sudo loginctl enable-linger edwinaikins` and reconnect.

If nginx 502s, the Node process probably isn't running — check the service
status above first.

## Enabling the member portal + Paystack payments

The member portal, welfare dues, and paid event registration feature needs
four new environment variables added to the app's `.env` file **on the VM**
(these are runtime secrets, not GitHub Actions secrets — same file
`deploy/setup-vm.sh` created for `DATABASE_URL`):

```bash
ssh -i <PRIVATE_KEY_PATH> edwinaikins@178.63.178.212
nano ~/apps/de-elites-family/.env
```

Add these lines (see `.env.example` for what each one means):

```
JWT_SECRET=<run: openssl rand -hex 32>
PAYSTACK_SECRET_KEY=sk_live_or_test_...
PAYSTACK_PUBLIC_KEY=pk_live_or_test_...
DUES_CURRENCY=GHS
```

Get the Paystack keys from your Paystack dashboard under **Settings → API
Keys & Webhooks**. Use the `sk_test_...` / `pk_test_...` keys first to try
the flow end-to-end before switching to live keys. While you're in that
dashboard screen, also add a webhook URL pointing at
`http://178.63.178.212/api/paystack/webhook` (or your domain once HTTPS is
set up) — this is a second confirmation path in case a member closes their
browser mid-payment.

Then restart the service so it picks up the new variables:

```bash
systemctl --user restart de-elites-family
curl http://127.0.0.1:3000/api/health
```

**Before you have real Paystack keys**, the app doesn't block you — it
automatically runs payments in **mock mode**: "Pay & Register" and "Pay
Dues" open a simulated checkout popup (styled to look like Paystack's own,
labeled "Test Mode") instead of the real one. Clicking "Pay" there fakes a
successful charge — no real API calls, no keys required — so you can test
the entire member portal payment flow (dues, paid events, payment history)
right away. A yellow "Test Mode — payments are simulated" badge shows up
near every payment button while this is active, so it's never mistaken for
a live charge. The moment you add real `PAYSTACK_PUBLIC_KEY` /
`PAYSTACK_SECRET_KEY` values and restart the service, it switches to the
real Paystack popup automatically — no flag to remember to flip.

If you want to force mock mode on (e.g. a staging box you never want to
move real money) or force it off (so missing keys correctly show a "not
configured" error instead of silently mocking), set `PAYSTACK_MOCK=true` or
`PAYSTACK_MOCK=false` in `.env` — see `.env.example` for details.

Member portal accounts themselves are created by an admin from the CMS
(**Staff Login** link in the site footer → **Member Accounts** tab) — there's
no public self-registration.

## Adding a real domain + HTTPS later

Once you point a domain's A record at `178.63.178.212`:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/de-elites-family   # change server_name _; to your domain
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot sets up auto-renewing HTTPS and updates the nginx config for you
