#!/usr/bin/env bash
# Start the API (uvicorn --reload, :8000) and the web app (Vite, :5173) together.
# Override ports with API_PORT / WEB_PORT.
# Ctrl+C stops both.
source "$(dirname "$0")/lib/common.sh"
require_venv
[[ -d "$CLIENT_DIR/node_modules" ]] || die "Run scripts/setup-frontend.sh first"

API_PORT="${API_PORT:-8000}"; WEB_PORT="${WEB_PORT:-5173}"
for port in "$API_PORT" "$WEB_PORT"; do
  python3 -c "import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', int(sys.argv[1])))" "$port" 2>/dev/null \
    || die "Port $port is already in use — run e.g. API_PORT=8100 WEB_PORT=5174 scripts/dev.sh"
done

"$(dirname "$0")/migrate.sh" --no-backup

pids=()
cleanup() { for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

(cd "$SERVER_DIR" && exec "$VENV/bin/uvicorn" evaramu.main:app --reload --host 127.0.0.1 --port "$API_PORT") &
pids+=($!)
(cd "$CLIENT_DIR" && VITE_API_URL="http://127.0.0.1:$API_PORT" exec pnpm exec vite --host "${WEB_HOST:-127.0.0.1}" --port "$WEB_PORT" --strictPort) &
pids+=($!)

log "API  http://127.0.0.1:$API_PORT/api/docs"
log "Web  http://127.0.0.1:$WEB_PORT  (admin at /admin)"
wait -n
