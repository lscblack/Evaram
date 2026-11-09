#!/usr/bin/env bash
# Browser end-to-end tests against the real stack, on a disposable database.
#
#   scripts/e2e.sh                 # all specs, headless Chrome
#   scripts/e2e.sh e2e/workflow.spec.ts --headed
#   E2E_API_PORT=18810 E2E_WEB_PORT=15810 (defaults; must be free)
#
# Creates/wipes <DB_NAME>_e2e_test (never the real database), migrates it,
# creates a test administrator, starts uvicorn and Vite on free ports, runs
# Playwright, then stops both servers.
source "$(dirname "$0")/lib/common.sh"
load_db_env

E2E_DB="${PGDATABASE}_e2e_test"
[[ "$E2E_DB" == *_test ]] || die "Refusing to use $E2E_DB"
export E2E_ADMIN_EMAIL="e2e-admin@example.com"
export E2E_ADMIN_PASSWORD="E2e!Admin-Passw0rd"
E2E_TMP="$(mktemp -d -t evaramu-e2e-XXXX)"
API_PORT="${E2E_API_PORT:-18810}"; WEB_PORT="${E2E_WEB_PORT:-15810}"
for port in "$API_PORT" "$WEB_PORT"; do
  python3 -c "import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1', int(sys.argv[1])))" "$port" 2>/dev/null \
    || die "Port $port is already in use — set E2E_API_PORT / E2E_WEB_PORT"
done

log "Preparing $E2E_DB"
PGOPTIONS="-c client_min_messages=warning" psql -X -q -d postgres \
  -c "DROP DATABASE IF EXISTS \"$E2E_DB\" WITH (FORCE)" -c "CREATE DATABASE \"$E2E_DB\" TEMPLATE template0" 2> >(grep -v -i collation >&2)

export DB_NAME="$E2E_DB" APP_ENV=development DEBUG=false \
  SECRET_KEY="e2e-only-secret-key-0123456789-abcdefghijklmnop" \
  MEDIA_ROOT="$E2E_TMP/media" PRIVATE_ROOT="$E2E_TMP/private" \
  CORS_ORIGINS="http://127.0.0.1:$WEB_PORT"
(cd "$SERVER_DIR" && "$PY" -m alembic upgrade head >/dev/null 2>&1) || die "Migration failed"
(cd "$SERVER_DIR" && EVARAMU_ADMIN_PASSWORD="$E2E_ADMIN_PASSWORD" "$PY" -m evaramu.cli create-admin \
   --email "$E2E_ADMIN_EMAIL" --name "E2E Administrator") || die "Could not create the test administrator"

pids=()
cleanup() {
  # Each server runs in its own session: stop the whole process group.
  for p in "${pids[@]}"; do kill -TERM -- "-$p" 2>/dev/null || true; done
  wait 2>/dev/null || true
  rm -rf "$E2E_TMP"
}
trap cleanup EXIT INT TERM
(cd "$SERVER_DIR" && exec setsid "$PY" -m uvicorn evaramu.main:app --host 127.0.0.1 --port $API_PORT --log-level warning) &
pids+=($!)
(cd "$CLIENT_DIR" && VITE_API_URL="http://127.0.0.1:$API_PORT" exec setsid pnpm exec vite --host 127.0.0.1 --port $WEB_PORT --strictPort >/dev/null) &
pids+=($!)
API_URL="http://127.0.0.1:$API_PORT" "$ROOT_DIR/scripts/health-check.sh" >/dev/null || die "API did not start"
for _ in $(seq 1 30); do curl -fsS "http://127.0.0.1:$WEB_PORT/" >/dev/null 2>&1 && break; sleep 1; done

log "Running Playwright"
cd "$CLIENT_DIR"
E2E_BASE_URL="http://127.0.0.1:$WEB_PORT" E2E_API_URL="http://127.0.0.1:$API_PORT" pnpm exec playwright test "$@"
