#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash deploy/aliyun/start-node.sh"
  exit 1
fi

if [ ! -f deploy/cloud-server.env ]; then
  cp deploy/cloud-server.env.example deploy/cloud-server.env
  echo "Created deploy/cloud-server.env. Edit it with production values, then rerun:"
  echo "  nano deploy/cloud-server.env"
  echo "  sudo bash deploy/aliyun/start-node.sh"
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is missing. Run: sudo bash deploy/aliyun/bootstrap-ecs.sh"
  exit 1
fi

NODE_BIN="$(command -v node)"
PUBLIC_HOST="$(
  "$NODE_BIN" --env-file=deploy/cloud-server.env -e "const raw=process.env.APP_BASE_URL||process.env.PLAYDRAMA_API_BASE||''; let host='_'; try { if (raw) host = new URL(raw).hostname } catch {} console.log(host)"
)"

npm ci --no-audit --no-fund

# Aliyun serves the frontend and API from the same HTTPS origin. Build the
# browser bundle without a fixed API host so users never call their own localhost.
env -u VITE_PLAYDRAMA_API_BASE -u VITE_PLAYDRAMA_API_BASES npm run build
npm prune --omit=dev

"$NODE_BIN" --env-file=deploy/cloud-server.env server/apply-postgres-schema.mjs
"$NODE_BIN" --env-file=deploy/cloud-server.env server/verify-postgres.mjs

cat >/etc/systemd/system/playdrama.service <<EOF
[Unit]
Description=PlayDrama Studio
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT_DIR
EnvironmentFile=$ROOT_DIR/deploy/cloud-server.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/env HOST=127.0.0.1 PORT=8787 FRONTEND_DIST_DIR=$ROOT_DIR/dist $NODE_BIN $ROOT_DIR/server/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

if [ "$PUBLIC_HOST" != "_" ] &&
  [ -f "/etc/letsencrypt/live/$PUBLIC_HOST/fullchain.pem" ] &&
  [ -f "/etc/letsencrypt/live/$PUBLIC_HOST/privkey.pem" ]; then
  cat >/etc/nginx/conf.d/playdrama.conf <<EOF
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name $PUBLIC_HOST _;

  location /.well-known/acme-challenge/ {
    root /var/www/html;
  }

  location / {
    return 301 https://\$host\$request_uri;
  }
}

server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name $PUBLIC_HOST;

  ssl_certificate /etc/letsencrypt/live/$PUBLIC_HOST/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$PUBLIC_HOST/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  client_max_body_size 20m;

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
EOF
else
  cp deploy/aliyun/nginx-playdrama.conf /etc/nginx/conf.d/playdrama.conf
fi
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable playdrama
systemctl restart playdrama
systemctl reload nginx

echo "PlayDrama is running behind Nginx."
health_ok=0
for _ in $(seq 1 30); do
  if curl -fs http://127.0.0.1:8787/api/health >/dev/null; then
    health_ok=1
    break
  fi
  sleep 1
done

if [ "$health_ok" != "1" ]; then
  echo "PlayDrama health check failed: http://127.0.0.1:8787/api/health"
  systemctl status playdrama --no-pager -n 40 || true
  exit 1
fi

echo "  http://127.0.0.1:8787/api/health OK"
