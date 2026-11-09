#!/usr/bin/env bash
# Shared helpers for the Evaramu operations scripts. Source, don't execute.
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SERVER_DIR="$ROOT_DIR/server"
CLIENT_DIR="$ROOT_DIR/client"
BACKUP_DIR="${EVARAMU_BACKUP_DIR:-$ROOT_DIR/backups}"
VENV="$SERVER_DIR/.venv"
PY="$VENV/bin/python"

c_info=$'\033[1;34m'; c_ok=$'\033[1;32m'; c_warn=$'\033[1;33m'; c_err=$'\033[1;31m'; c_off=$'\033[0m'
log()  { printf '%s==>%s %s\n' "$c_info" "$c_off" "$*"; }
ok()   { printf '%s ok%s %s\n' "$c_ok" "$c_off" "$*"; }
warn() { printf '%swarn%s %s\n' "$c_warn" "$c_off" "$*" >&2; }
die()  { printf '%serror%s %s\n' "$c_err" "$c_off" "$*" >&2; exit 1; }

require_venv() {
  [[ -x "$PY" ]] || die "Backend virtualenv missing. Run scripts/setup-backend.sh first."
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
