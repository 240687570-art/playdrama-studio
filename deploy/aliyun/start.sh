#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Docker Compose is not installed. Run: sudo bash deploy/aliyun/bootstrap-ecs.sh"
    exit 1
  fi
}

if [ ! -f deploy/cloud-server.env ]; then
  cp deploy/cloud-server.env.example deploy/cloud-server.env
  echo "Created deploy/cloud-server.env. Edit it with production values, then rerun:"
  echo "  nano deploy/cloud-server.env"
  echo "  bash deploy/aliyun/start.sh"
  exit 1
fi

compose -f deploy/aliyun/docker-compose.yml up -d --build

if command -v nginx >/dev/null 2>&1; then
  sudo cp deploy/aliyun/nginx-playdrama.conf /etc/nginx/conf.d/playdrama.conf
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "PlayDrama is running behind Nginx."
echo "Local health check:"
curl -fsS http://127.0.0.1:8787/api/health >/dev/null
echo "  http://127.0.0.1:8787/api/health OK"
