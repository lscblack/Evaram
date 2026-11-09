#!/usr/bin/env bash
# Create/refresh the backend's own virtualenv (server/.venv) and storage folders.
#   scripts/setup-backend.sh          # runtime dependencies
#   scripts/setup-backend.sh --dev    # + test/lint tooling
# The virtualenv is built from the active Python (e.g. `conda activate fastapi_setup`), or
# PYTHON_BIN=/path/to/python3.11. Packages go into server/.venv only, never into that environment.
source "$(dirname "$0")/lib/common.sh"

py_ok() { "$1" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' >/dev/null 2>&1; }

if [[ -z "${EVARAMU_PYTHON:-}" ]]; then
  PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python || true)}"
  [[ -n "$PYTHON_BIN" ]] || die "No python3 found. Activate your conda env or set PYTHON_BIN=/path/to/python3.11"
  py_ok "$PYTHON_BIN" || die "$PYTHON_BIN is $("$PYTHON_BIN" -V 2>&1); Python 3.11 or newer is required"
  if [[ -e "$VENV" ]] && ! py_ok "$VENV/bin/python"; then
    old="$VENV.old-$(date +%Y%m%d%H%M%S)"
    mv "$VENV" "$old"
    warn "server/.venv was broken or too old; moved to $(basename "$old")"
  fi
  if [[ ! -x "$VENV/bin/python" ]]; then
    log "Creating server/.venv from $PYTHON_BIN ($("$PYTHON_BIN" -V 2>&1))"
    "$PYTHON_BIN" -m venv "$VENV"
  fi
fi
py_ok "$PY" || die "$PY is older than Python 3.11"
log "Installing backend dependencies into $PY"
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
