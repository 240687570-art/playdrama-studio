#!/usr/bin/env bash
set -euo pipefail

PUBLIC_URL="${1:-}"

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Docker Compose is not installed."
    exit 1
  fi
}

echo "Checking local API..."
curl -fsS http://127.0.0.1:8787/api/health
echo

echo "Checking local readiness..."
curl -fsS http://127.0.0.1:8787/api/readiness
echo

if [ -n "$PUBLIC_URL" ]; then
  echo "Checking public URL..."
  curl -fsS "$PUBLIC_URL/api/health"
  echo
fi

echo "Recent app logs:"
compose -f deploy/aliyun/docker-compose.yml logs --tail=80 playdrama
