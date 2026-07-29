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

If saving a CMS section (Leaders, Pillars, Gallery, Hero, etc.) fails with
**"Request Entity Too Large"**, it means the request body — the whole
section's array, with every embedded Base64 photo in it — is bigger than a
size limit somewhere between the browser and Node. There are two limits
involved, and both may need raising if you keep hitting this with a lot of
photos:

1. **Express's own limit** (in `server.ts`, currently 60mb) — already sized
   to comfortably fit several full-size photos in one save.
2. **nginx's `client_max_body_size`**, which defaults to just **1MB** and
   sits in front of Node — this is almost always the actual cause, since
   even a single uploaded photo easily exceeds 1MB as Base64. Fix it on the
   VM:

   ```bash
   ssh -i <PRIVATE_KEY_PATH> edwinaikins@178.63.178.212
   sudo nano /etc/nginx/sites-available/de-elites-family
   ```

   Inside the `server { ... }` block, add:

   ```
   client_max_body_size 60m;
   ```

   Then reload:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

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

### Mobile Money

Both "Pay Dues" and "Pay & Register" checkouts offer **Mobile Money**
alongside cards — the popup (real or simulated) opens with a Card / Mobile
Money switcher. On the real Paystack side this just needs Mobile Money
enabled as a channel on your Paystack account (it's on by default for most
Ghana/Nigeria merchant accounts); nothing else to configure. In mock mode
the simulated checkout offers MTN Mobile Money, Vodafone Cash, and
AirtelTigo Money as fake networks purely for testing the flow.

### Partial ("installment") dues payments

A member doesn't have to pay their full monthly dues in one go — the Dues
tab in the portal shows how much of the selected month is already paid
(`GHS 20 of GHS 50 paid`) and lets them type in a smaller amount to pay
toward it, making as many partial payments as they like until the period is
fully covered. Event registration payments stay full-price-only (a
half-registered event ticket isn't a meaningful state).

### Legacy Gallery: bulk photo/video uploads

The CMS's **Legacy Gallery** tab (Staff Login → Legacy Gallery) has a drag &
drop zone above the milestone list — select or drop multiple event photos
and videos at once (up to 150MB each) and it creates one draft gallery entry
per file, defaulted to the "Events" category. Review/edit the title,
category, date, and description for each, then click that item's own
**Save This Milestone** button to publish it to the public Legacy Gallery
section on the homepage — Leadership, Legacy Gallery, and Upcoming Events
all save per-item now rather than needing one "Save All" for the whole
section. Videos play inline in both the grid and the spotlight modal;
photos work exactly as before.

Categories aren't a fixed list either — type any label into an item's
"Category Tag" field (a dropdown of categories already in use appears as
you type) and it becomes its own filter button on the public gallery once
saved.

Unlike other CMS images (which are small Base64 strings stored directly in
the database), uploaded gallery media is written to disk on the VM and
served from `/uploads/gallery/...` — this keeps the page that loads on
every visit fast even when someone uploads a 100MB event video.

**Recommended for production:** set `UPLOADS_DIR` in `.env` on the VM to a
folder *outside* your deployed app directory, e.g.:

```
UPLOADS_DIR=/home/edwinaikins/apps/de-elites-family-uploads
```

then `mkdir -p /home/edwinaikins/apps/de-elites-family-uploads` once and
restart the service. This isn't strictly required — if you leave it unset,
uploads land in an `uploads/` folder inside the app directory and `git
pull`-based deploys won't touch untracked files — but pointing it outside
the app folder is the safer choice if you ever redo the deploy process
(e.g. a clean clone) since it guarantees previously uploaded event media is
never at risk of being wiped.

### Reconciling payments ("who paid what")

The CMS's **10. Payments** tab (Staff Login → Payments) lists every dues
and event payment from every member in one place — searchable by member
name/email, filterable by type and status, with a running total of what's
actually been collected. Use **Download CSV** there to hand a reconciliation
sheet to a treasurer or import it into a spreadsheet. Each row also shows
which channel (card / mobile money / etc.) the payment cleared through.

## Domain: de-elitesfamily.org

The app now has a real domain, **de-elitesfamily.org**. Getting it fully live
is two separate steps — DNS (at your domain registrar) and then nginx/HTTPS
(on the VM) — do them in that order, since certbot in step 2 needs the
domain to already be resolving to the VM.

### 1. Point DNS at the VM

In whichever registrar/DNS panel you bought the domain through (Namecheap,
GoDaddy, Cloudflare, etc.), add these records:

| Type | Host | Value |
|---|---|---|
| A | `@` (or blank — means the bare domain) | `178.63.178.212` |
| A | `www` | `178.63.178.212` |

Both records point at the same VM; nginx (configured below) will be set up
to answer for both `de-elitesfamily.org` and `www.de-elitesfamily.org`.
DNS changes can take anywhere from a few minutes to a few hours to
propagate — check with `dig de-elitesfamily.org +short` (should print
`178.63.178.212` once it's live) before moving to step 2.

If you're using Cloudflare specifically: turn the orange-cloud proxy
**off** (grey cloud / "DNS only") for both records until after certbot has
run in step 2 — Cloudflare's proxy can interfere with the certificate
challenge on first setup. You can turn it back on afterwards if you want
Cloudflare's CDN/proxying.

### 2. Point nginx at the domain and enable HTTPS

Once `dig` confirms DNS is resolving, SSH into the VM and update nginx:

```bash
ssh -i <PRIVATE_KEY_PATH> edwinaikins@178.63.178.212
sudo apt-get install -y certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/de-elites-family
```

Change the `server_name _;` line to:

```
server_name de-elitesfamily.org www.de-elitesfamily.org;
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d de-elitesfamily.org -d www.de-elitesfamily.org
```

Certbot provisions a free auto-renewing TLS certificate, rewrites the nginx
config to serve HTTPS on both names, and redirects plain HTTP to HTTPS.
Confirm it worked:

```bash
curl -I https://de-elitesfamily.org
```

You should get a `200 OK` (or a redirect to `www` — either is fine,
whichever you'd rather be canonical).

### 3. Update the Paystack webhook URL

Once HTTPS is live, go back to your Paystack dashboard (**Settings → API
Keys & Webhooks**) and update the webhook URL from the old IP-based one to:

```
https://de-elitesfamily.org/api/paystack/webhook
```

### 4. Nothing else needs to change

The GitHub Actions deploy secrets (`VM_HOST`, etc.) stay pointed at the raw
IP — they're just how CI reaches the VM over SSH and are unrelated to what
domain visitors use. The app itself doesn't hardcode a domain anywhere
either; `index.html`'s Open Graph/canonical tags already reference
`de-elitesfamily.org` for link-preview cards (WhatsApp, Twitter, etc.) and
SEO, and nothing else in the codebase needed updating for the switch.
