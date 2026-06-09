#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/deploy/cloud-server.env"
SERVICE_NAME="${PLAYDRAMA_SERVICE_NAME:-playdrama}"
PUBLIC_URL="${PLAYDRAMA_PUBLIC_URL:-}"

cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage: bash deploy/aliyun/ops.sh <command>

Commands:
  status             Show PlayDrama and Nginx service status.
  logs [lines]       Show recent PlayDrama service logs.
  restart            Restart PlayDrama and reload Nginx.
  health             Check local and public health endpoints.
  payment            Verify live payment provider checkout does not unlock early.
  smoke              Run commercial and end-to-end online smoke checks.
  backup [dir]       Create a PostgreSQL custom-format backup.
  backup-verify file Verify a PostgreSQL backup archive can be read.
  cleanup-smoke      Remove online smoke test data and restart service.
EOF
}

require_env() {
  if [ ! -f "$ENV_FILE" ]; then
    echo "Missing $ENV_FILE"
    exit 1
  fi
}

env_value() {
  node -e "const fs=require('fs');const key=process.argv[1];const raw=fs.readFileSync('$ENV_FILE','utf8');for(const line of raw.split(/\\r?\\n/)){const s=line.trim();if(!s||s.startsWith('#')||!s.includes('='))continue;const i=s.indexOf('=');if(s.slice(0,i).trim()===key){console.log(s.slice(i+1).trim());process.exit(0)}}process.exit(1)" "$1"
}

node_env() {
  if "$NODE_BIN" --help 2>/dev/null | grep -q -- '--env-file'; then
    "$NODE_BIN" --env-file="$ENV_FILE" "$@"
  else
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    "$NODE_BIN" "$@"
  fi
}

ensure_node() {
  NODE_BIN="$(command -v node || true)"
  if [ -z "$NODE_BIN" ]; then
    echo "Node.js is missing. Run: sudo bash deploy/aliyun/bootstrap-ecs.sh"
    exit 1
  fi
}

ensure_pg_tools() {
  if command -v pg_dump >/dev/null 2>&1 && command -v pg_restore >/dev/null 2>&1; then
    return
  fi
  if [ "$(id -u)" -ne 0 ]; then
    echo "PostgreSQL client tools are missing. Re-run as root or install postgresql-client."
    exit 1
  fi
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-client
}

ensure_pg_dump_matches_server() {
  database_url="$1"
  server_major="$(psql "$database_url" -Atc "show server_version_num" | cut -c1-2)"
  dump_major="$(pg_dump --version | awk '{print $3}' | cut -d. -f1)"
  if [ "$dump_major" -lt "$server_major" ]; then
    echo "pg_dump major version $dump_major is older than PostgreSQL server major $server_major."
    echo "Install a matching PostgreSQL client, for example postgresql-client-$server_major, then rerun backup."
    exit 1
  fi
}

resolve_public_url() {
  if [ -n "$PUBLIC_URL" ]; then
    echo "$PUBLIC_URL"
    return
  fi
  env_value PLAYDRAMA_API_BASE 2>/dev/null || env_value APP_BASE_URL
}

cmd="${1:-}"
case "$cmd" in
  status)
    systemctl --no-pager --full status "$SERVICE_NAME" | sed -n '1,35p'
    systemctl --no-pager --full status nginx | sed -n '1,20p'
    ;;
  logs)
    lines="${2:-120}"
    journalctl -u "$SERVICE_NAME" -n "$lines" --no-pager
    ;;
  restart)
    systemctl restart "$SERVICE_NAME"
    nginx -t
    systemctl reload nginx
    systemctl is-active "$SERVICE_NAME"
    ;;
  health)
    require_env
    public_url="$(resolve_public_url)"
    public_host="$(node -e "console.log(new URL(process.argv[1]).hostname)" "$public_url")"
    curl -fsS http://127.0.0.1:8787/api/health >/dev/null
    echo "local node health OK"
    curl -k -fsS -H "Host: $public_host" https://127.0.0.1/api/health >/dev/null
    echo "local nginx health OK"
    curl -fsS "$public_url/api/health" >/dev/null
    echo "public health OK: $public_url"
    ;;
  payment)
    require_env
    ensure_node
    public_url="$(resolve_public_url)"
    export PLAYDRAMA_API_BASE="$public_url"
    export APP_BASE_URL="$public_url"
    node_env server/verify-payment-provider.mjs
    ;;
  smoke)
    require_env
    ensure_node
    public_url="$(resolve_public_url)"
    export PLAYDRAMA_API_BASE="$public_url"
    export APP_BASE_URL="$public_url"
    node_env server/verify-payment-provider.mjs
    node_env server/verify-commercial-smoke.mjs
    export ONLINE_SMOKE_SEED_SESSION=true
    export ONLINE_SMOKE_RESTART_SERVICE=true
    export ONLINE_SMOKE_SERVICE_NAME="$SERVICE_NAME"
    node_env server/verify-online-smoke.mjs
    ;;
  backup)
    require_env
    ensure_node
    ensure_pg_tools
    backup_dir="${2:-$ROOT_DIR/backups}"
    mkdir -p "$backup_dir"
    chmod 700 "$backup_dir"
    stamp="$(date +%Y%m%d-%H%M%S)"
    backup_file="$backup_dir/playdrama-postgres-$stamp.dump"
    database_url="$(env_value PLAYDRAMA_DATABASE_URL 2>/dev/null || env_value DATABASE_URL)"
    ensure_pg_dump_matches_server "$database_url"
    pg_dump --format=custom --no-owner --no-privileges "$database_url" > "$backup_file"
    chmod 600 "$backup_file"
    pg_restore --list "$backup_file" >/dev/null
    echo "Backup created and verified: $backup_file"
    ;;
  backup-verify)
    file="${2:-}"
    if [ -z "$file" ]; then
      echo "backup-verify requires a file path."
      exit 1
    fi
    ensure_pg_tools
    pg_restore --list "$file" >/dev/null
    echo "Backup archive is readable: $file"
    ;;
  cleanup-smoke)
    require_env
    ensure_node
    node_env server/cleanup-online-smoke.mjs
    systemctl restart "$SERVICE_NAME"
    sleep 2
    systemctl is-active "$SERVICE_NAME"
    ;;
  ""|-h|--help|help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac
