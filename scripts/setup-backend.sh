#!/usr/bin/env bash
# Create/refresh the backend virtualenv and storage folders.
#   scripts/setup-backend.sh          # runtime dependencies
#   scripts/setup-backend.sh --dev    # + test/lint tooling
source "$(dirname "$0")/lib/common.sh"

PYTHON_BIN="${PYTHON_BIN:-python3}"
command -v "$PYTHON_BIN" >/dev/null || die "$PYTHON_BIN not found (Python 3.12+ required)"
"$PYTHON_BIN" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' || die "Python 3.12+ required"

if [[ ! -x "$PY" ]]; then
  log "Creating virtualenv in server/.venv"
  "$PYTHON_BIN" -m venv "$VENV"
fi
log "Installing backend dependencies"
"$PY" -m pip install --quiet --upgrade pip
if [[ "${1:-}" == "--dev" ]]; then
  "$PY" -m pip install --quiet -r "$SERVER_DIR/requirements-dev.txt"
else
  "$PY" -m pip install --quiet -r "$SERVER_DIR/requirements.txt"
fi

if [[ ! -f "$SERVER_DIR/.env" ]]; then
  cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
  chmod 600 "$SERVER_DIR/.env"
  warn "Created server/.env from the example — fill in DB_* and SECRET_KEY before continuing."
else
  ok "server/.env exists (left unchanged)"
fi

mkdir -p "$SERVER_DIR/storage/media" "$SERVER_DIR/storage/private" "$BACKUP_DIR"
chmod 700 "$SERVER_DIR/storage/private" "$BACKUP_DIR" 2>/dev/null || true
ok "Backend ready. Next: scripts/check-env.sh, then scripts/migrate.sh"
