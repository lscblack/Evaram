#!/usr/bin/env bash
# Production deployment / upgrade. Safe to run for every release.
#
#   scripts/deploy.sh [--pull] [--skip-frontend] [--service evaramu-api]
#
# Steps
#   1. (optional) git pull --ff-only
#   2. install pinned backend dependencies, frontend dependencies
#   3. validate configuration + database connectivity
#   4. back up the database, then `alembic upgrade head` (data is preserved —
#      no reset, ever) and sync permissions
#   5. build the frontend into client/dist (atomic swap; uploads untouched)
#   6. restart the API service ONLY if backend code or dependencies changed
#   7. health checks
#
# The database is never dropped or reset by this script.
source "$(dirname "$0")/lib/common.sh"

PULL=0; SKIP_FRONTEND=0; SERVICE="${EVARAMU_SERVICE:-evaramu-api}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pull) PULL=1 ;;
    --skip-frontend) SKIP_FRONTEND=1 ;;
    --service) SERVICE="$2"; shift ;;
    *) die "Unknown option: $1" ;;
  esac
  shift
done

STAMP_FILE="$SERVER_DIR/.deployed-fingerprint"
fingerprint() {
  # Hash of backend code + migrations + pinned requirements.
  (cd "$SERVER_DIR" && find evaramu migrations requirements.txt alembic.ini -type f \
      \( -name '*.py' -o -name '*.txt' -o -name '*.ini' -o -name '*.mako' \) -print0 \
    | sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)
}

cd "$ROOT_DIR"
if [[ "$PULL" == "1" ]]; then
  log "Pulling latest code"
  git pull --ff-only
fi

log "Installing backend dependencies"
"$ROOT_DIR/scripts/setup-backend.sh" >/dev/null
require_venv

log "Validating configuration and database"
load_db_env
[[ "$EVARAMU_APP_ENV" == "production" ]] || warn "APP_ENV is '$EVARAMU_APP_ENV' (expected 'production' on a server)"
(cd "$SERVER_DIR" && "$PY" -m evaramu.cli check) || {
  rc=$?; [[ $rc -eq 2 ]] && die "Database unreachable — deployment stopped before any change"
  [[ "$EVARAMU_APP_ENV" == "production" ]] && die "Configuration problems — fix them and re-run"
}

log "Database migrations"
"$ROOT_DIR/scripts/migrate.sh"

if [[ "$SKIP_FRONTEND" == "0" ]]; then
  log "Building frontend"
  (cd "$CLIENT_DIR" && pnpm install --frozen-lockfile --silent)
  "$ROOT_DIR/scripts/build.sh"
fi

new_fp="$(fingerprint)"
old_fp="$(cat "$STAMP_FILE" 2>/dev/null || true)"
if [[ "$new_fp" != "$old_fp" ]]; then
  if command -v systemctl >/dev/null && systemctl list-unit-files "$SERVICE.service" >/dev/null 2>&1 \
     && systemctl cat "$SERVICE.service" >/dev/null 2>&1; then
    log "Backend changed — restarting $SERVICE"
    sudo systemctl restart "$SERVICE"
  else
    warn "Backend changed but systemd unit '$SERVICE' was not found — restart the API process manually"
  fi
  echo "$new_fp" > "$STAMP_FILE"
else
  ok "Backend unchanged — no restart needed"
fi

log "Health checks"
"$ROOT_DIR/scripts/health-check.sh"
ok "Deployment complete"
