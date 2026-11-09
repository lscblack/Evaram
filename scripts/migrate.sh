#!/usr/bin/env bash
# Apply pending Alembic migrations (non-destructive; existing data is kept).
#   scripts/migrate.sh              # backup first (if anything is pending), then upgrade
#   scripts/migrate.sh --no-backup
#   scripts/migrate.sh --status     # show current vs head, change nothing
#   scripts/migrate.sh --replace-legacy
#       one step when the database still holds the PREVIOUS application: renames it to
#       <db>_legacy_<date> (kept, not dumped), creates a fresh empty <db>, builds the schema.
source "$(dirname "$0")/lib/common.sh"
load_db_env
cd "$SERVER_DIR"

status="$("$PY" -m alembic current 2>&1 || true)"
# Run SQL as the PostgreSQL superuser when root (local peer auth), else with the app's credentials.
psql_admin() {
  if [[ $EUID -eq 0 ]] && id postgres >/dev/null 2>&1; then
    runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d postgres "$@"
  else
    psql -X -q -v ON_ERROR_STOP=1 -d postgres "$@"
  fi
}

if grep -q "Can't locate revision" <<<"$status"; then
  foreign="$(sed -n "s/.*identified by '\([^']*\)'.*/\1/p" <<<"$status" | head -n1)"
  if [[ "${1:-}" != "--replace-legacy" ]]; then
    die "Database $(db_label) is at revision '$foreign', which is not part of this application's migrations.
      It still holds the PREVIOUS application's schema. Nothing was changed.
      Run:  scripts/migrate.sh --replace-legacy
      (renames the old database to ${PGDATABASE}_legacy_<date>, creates a fresh one, builds the schema)"
  fi
  legacy="${PGDATABASE}_legacy_$(date +%Y%m%d_%H%M%S)"
  log "Setting the previous application's database aside as $legacy"
  psql_admin -v db="$PGDATABASE" -v legacy="$legacy" -v owner="$PGUSER" <<'SQL' >/dev/null || die "Could not replace the database (needs the postgres superuser: run as root, or as a role with CREATEDB that owns it)"
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = :'db' AND pid <> pg_backend_pid();
ALTER DATABASE :"db" RENAME TO :"legacy";
CREATE DATABASE :"db" OWNER :"owner" TEMPLATE template0;
SQL
  ok "Old database kept as $legacy; fresh $PGDATABASE created"
  status=""
fi
current="$(awk '{print $1}' <<<"$status" | grep -E '^[0-9a-f]{4,}$' | tail -n1 || true)"
head="$("$PY" -m alembic heads 2>/dev/null | awk '{print $1}' | tail -n1)"
log "Database $(db_label): current=${current:-none} head=$head"

if [[ "${1:-}" == "--status" ]]; then exit 0; fi
[[ "${1:-}" == "--replace-legacy" ]] && set -- --no-backup   # the old database itself is kept

if [[ "$current" == "$head" ]]; then
  ok "Schema is up to date"
else
  if [[ "${1:-}" != "--no-backup" && -n "$current" ]]; then
    "$ROOT_DIR/scripts/backup-db.sh" premigrate >/dev/null
    ok "Pre-migration backup taken"
  fi
  log "Running alembic upgrade head"
  "$PY" -m alembic upgrade head
  ok "Migrations applied"
fi
log "Synchronising permissions and built-in roles"
"$PY" -m evaramu.cli sync-permissions >/dev/null
ok "Permissions in sync"
log "Ensuring the configured administrator (SUPER_ADMIN_*) exists"
"$PY" -m evaramu.cli ensure-admin || warn "Administrator from .env not created — see message above"
