#!/usr/bin/env bash
# Start the API (uvicorn --reload) and the web app (Vite, :5173) together.
# The frontend talks to VITE_API_URL from client/.env (or the environment); the
# API is started on that URL's port. Override the web port with WEB_PORT.
# Ctrl+C stops both.
source "$(dirname "$0")/lib/common.sh"
require_venv
[[ -d "$CLIENT_DIR/node_modules" ]] || die "Run scripts/setup-frontend.sh first"

if [[ -z "${VITE_API_URL:-}" && -f "$CLIENT_DIR/.env" ]]; then
  VITE_API_URL="$(sed -n 's/^VITE_API_URL=//p' "$CLIENT_DIR/.env" | tail -n1 | tr -d "\"' ")"
fi
[[ -n "${VITE_API_URL:-}" ]] || die "Set VITE_API_URL in client/.env (e.g. VITE_API_URL=http://127.0.0.1:8000)"
export VITE_API_URL
url_port="$(python3 -c 'import sys; from urllib.parse import urlparse; u = urlparse(sys.argv[1]); print(u.port or (443 if u.scheme == "https" else 80))' "$VITE_API_URL")"
API_PORT="${API_PORT:-$url_port}"; WEB_PORT="${WEB_PORT:-5173}"
[[ "$API_PORT" == "$url_port" ]] || die "API_PORT=$API_PORT does not match VITE_API_URL ($VITE_API_URL); change client/.env instead"
for port in "$API_PORT" "$WEB_PORT"; do
  python3 -c "import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', int(sys.argv[1])))" "$port" 2>/dev/null \
    || die "Port $port is already in use — change VITE_API_URL in client/.env and/or WEB_PORT"
done

"$(dirname "$0")/migrate.sh" --no-backup

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

(cd "$SERVER_DIR" && exec "$PY" -m uvicorn evaramu.main:app --reload --host 127.0.0.1 --port "$API_PORT") &
pids+=($!)
(cd "$CLIENT_DIR" && exec pnpm exec vite --host "${WEB_HOST:-127.0.0.1}" --port "$WEB_PORT" --strictPort) &
pids+=($!)

log "API  http://127.0.0.1:$API_PORT/api/docs"
log "Web  http://127.0.0.1:$WEB_PORT  (admin at /admin)"
wait -n
