#!/usr/bin/env bash
# DE ELITES FAMILY — one-time Ubicloud VM provisioning script.
#
# Run this ONCE on the VM itself (not from your laptop, not from CI):
#
#   ssh -i <PRIVATE_KEY_PATH> edwinaikins@178.63.178.212
#   # then, on the VM:
#   curl -fsSL https://raw.githubusercontent.com/<you>/<repo>/main/deploy/setup-vm.sh -o setup-vm.sh
#   # (or just scp/paste this file over — see DEPLOYMENT.md)
#   chmod +x setup-vm.sh
#   ./setup-vm.sh
#
# It installs Node.js 20 + nginx, creates the app directory, writes a
# starter .env (edit the DATABASE_URL if needed), installs a systemd USER
# service (see de-elites-family.service for why it's a user service, not a
# sudo one), and configures nginx as a reverse proxy on port 80.
#
# Safe to re-run — it won't overwrite an existing .env.

set -euo pipefail

APP_DIR="$HOME/apps/de-elites-family"
SERVICE_NAME="de-elites-family"
SERVICE_DIR="$HOME/.config/systemd/user"

echo "==> [1/6] Installing Node.js 20 (NodeSource)..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "Node 20 already installed: $(node -v)"
fi

echo "==> [2/6] Installing nginx..."
sudo apt-get update -y
sudo apt-get install -y nginx

echo "==> [3/6] Creating app directory at $APP_DIR..."
mkdir -p "$APP_DIR"

echo "==> [4/6] Writing starter .env (only if one doesn't already exist)..."
# IMPORTANT: this script is meant to be committed to git, so it deliberately
# does NOT contain your real database password. Export DATABASE_URL before
# running this script (e.g. `export DATABASE_URL="postgresql://..."`) and
# it'll be picked up below — otherwise you'll get a placeholder you must
# edit by hand on the VM afterwards (nano "$APP_DIR/.env").
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="${DATABASE_URL:-postgresql://REPLACE_WITH_YOUR_REAL_CONNECTION_STRING}"
PORT=3000
NODE_ENV=production
EOF
  chmod 600 "$APP_DIR/.env"
  echo "Wrote $APP_DIR/.env (permissions locked to 600)."
  if [ -z "${DATABASE_URL:-}" ]; then
    echo "!! No DATABASE_URL was exported — edit $APP_DIR/.env by hand before the first deploy: nano $APP_DIR/.env"
  fi
else
  echo "$APP_DIR/.env already exists — leaving it untouched."
fi

echo "==> [5/6] Installing systemd USER service..."
mkdir -p "$SERVICE_DIR"
cp "$(dirname "$0")/de-elites-family.service" "$SERVICE_DIR/${SERVICE_NAME}.service" 2>/dev/null || cat > "$SERVICE_DIR/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=DE ELITES FAMILY web app
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node dist/server.cjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
EOF

# Lingering keeps the user's systemd instance (and this service) alive and
# auto-starting on boot even with no active SSH session logged in — required
# for both "survives reboot" and "CI can restart it over SSH".
sudo loginctl enable-linger "$(whoami)"

systemctl --user daemon-reload
systemctl --user enable "${SERVICE_NAME}"
echo "Service installed (not started yet — nothing to run until the first CI deploy builds dist/)."

echo "==> [6/6] Configuring nginx reverse proxy on port 80..."
sudo cp "$(dirname "$0")/nginx.conf" "/etc/nginx/sites-available/${SERVICE_NAME}" 2>/dev/null || sudo tee "/etc/nginx/sites-available/${SERVICE_NAME}" > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -sf "/etc/nginx/sites-available/${SERVICE_NAME}" "/etc/nginx/sites-enabled/${SERVICE_NAME}"
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

if command -v ufw >/dev/null 2>&1; then
  echo "==> Opening firewall for SSH + HTTP..."
  sudo ufw allow OpenSSH || true
  sudo ufw allow 'Nginx Full' || true
fi

echo ""
echo "============================================================"
echo " VM setup complete."
echo ""
echo " Next steps:"
echo "  1. Push this repo to GitHub."
echo "  2. Add the deploy secrets in GitHub repo Settings > Secrets"
echo "     (see DEPLOYMENT.md): VM_SSH_PRIVATE_KEY, VM_HOST, VM_USER,"
echo "     VM_APP_DIR (= $APP_DIR)."
echo "  3. Push to main — GitHub Actions will build and deploy,"
echo "     which starts this service for the first time."
echo ""
echo " Once deployed, the site will be reachable at:"
echo "   http://$(curl -s -4 ifconfig.me 2>/dev/null || echo 178.63.178.212)/"
echo "============================================================"
