#!/usr/bin/env bash
# Shared helpers for the Evaramu operations scripts. Source, don't execute.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"
BACKUP_DIR="${EVARAMU_BACKUP_DIR:-$ROOT_DIR/backups}"
VENV="$SERVER_DIR/.venv"

# Which Python runs the backend, in order:
#   1. EVARAMU_PYTHON (explicit override)
#   2. the active virtualenv / conda env (not conda "base"), if it has the backend packages
#   3. server/.venv, if it has the backend packages
#   4. the active env anyway (setup-backend.sh installs into it), else server/.venv
has_backend_deps() { [[ -x "$1" ]] && "$1" -c 'import fastapi, pydantic, sqlalchemy, alembic' >/dev/null 2>&1; }
_active_py=""
if [[ -n "${VIRTUAL_ENV:-}" && "$VIRTUAL_ENV" != "$VENV" ]]; then _active_py="$VIRTUAL_ENV/bin/python"
elif [[ -n "${CONDA_PREFIX:-}" && "${CONDA_DEFAULT_ENV:-base}" != "base" ]]; then _active_py="$CONDA_PREFIX/bin/python"
fi
if [[ -n "${EVARAMU_PYTHON:-}" ]]; then PY="$EVARAMU_PYTHON"
elif [[ -n "$_active_py" ]] && has_backend_deps "$_active_py"; then PY="$_active_py"
elif has_backend_deps "$VENV/bin/python"; then PY="$VENV/bin/python"
elif [[ -n "$_active_py" && -x "$_active_py" ]]; then PY="$_active_py"
else PY="$VENV/bin/python"
fi

c_info=$'\033[1;34m'; c_ok=$'\033[1;32m'; c_warn=$'\033[1;33m'; c_err=$'\033[1;31m'; c_off=$'\033[0m'
log()  { printf '%s==>%s %s\n' "$c_info" "$c_off" "$*"; }
ok()   { printf '%s ok%s %s\n' "$c_ok" "$c_off" "$*"; }
warn() { printf '%swarn%s %s\n' "$c_warn" "$c_off" "$*" >&2; }
die()  { printf '%serror%s %s\n' "$c_err" "$c_off" "$*" >&2; exit 1; }

require_venv() {
  [[ -x "$PY" ]] || die "No backend Python found. Activate your environment (conda/venv) or run scripts/setup-backend.sh first."
  has_backend_deps "$PY" || die "Python at $PY is missing the backend packages. Run scripts/setup-backend.sh (installs into the active env), or: $PY -m pip install -r server/requirements.txt"
}

# Export the database settings as libpq variables (PGHOST, PGPORT, PGUSER,
# PGPASSWORD, PGDATABASE, PGSSLMODE) using the application's own settings
# loader, so scripts and the app always agree. Values are never printed.
load_db_env() {
  require_venv
  local exports
  exports="$(cd "$SERVER_DIR" && "$PY" - <<'PYEOF'
import shlex
from evaramu.core.config import Settings
s = Settings()
pairs = {"PGHOST": s.DB_HOST, "PGPORT": s.DB_PORT, "PGUSER": s.DB_USER, "PGPASSWORD": s.DB_PASSWORD,
         "PGDATABASE": s.DB_NAME, "PGSSLMODE": s.DB_SSLMODE, "EVARAMU_APP_ENV": s.APP_ENV}
for k, v in pairs.items():
    print(f"export {k}={shlex.quote(str(v))}")
PYEOF
)" || die "Could not read server configuration (server/.env)"
  eval "$exports"
  [[ -n "${PGDATABASE:-}" ]] || die "DB_NAME is not configured in server/.env"
}

# Prints "<db> on <host>:<port>" — never the password.
db_label() { printf '%s on %s:%s' "$PGDATABASE" "$PGHOST" "$PGPORT"; }

confirm() {
  local prompt="$1"
  if [[ "${ASSUME_YES:-0}" == "1" ]]; then return 0; fi
  read -r -p "$prompt [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]]
}
