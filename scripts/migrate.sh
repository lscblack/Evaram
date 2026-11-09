#!/usr/bin/env bash
# Apply pending Alembic migrations (non-destructive; existing data is kept).
#   scripts/migrate.sh              # backup first (if anything is pending), then upgrade
#   scripts/migrate.sh --no-backup
#   scripts/migrate.sh --status     # show current vs head, change nothing
source "$(dirname "$0")/lib/common.sh"
load_db_env
cd "$SERVER_DIR"

current="$("$VENV/bin/alembic" current 2>/dev/null | awk '{print $1}' | tail -n1 || true)"
head="$("$VENV/bin/alembic" heads 2>/dev/null | awk '{print $1}' | tail -n1)"
log "Database $(db_label): current=${current:-none} head=$head"

if [[ "${1:-}" == "--status" ]]; then exit 0; fi

if [[ "$current" == "$head" ]]; then
  ok "Schema is up to date"
else
  if [[ "${1:-}" != "--no-backup" && -n "$current" ]]; then
    "$ROOT_DIR/scripts/backup-db.sh" premigrate >/dev/null
    ok "Pre-migration backup taken"
  fi
  log "Running alembic upgrade head"
  "$VENV/bin/alembic" upgrade head
  ok "Migrations applied"
fi
log "Synchronising permissions and built-in roles"
"$PY" -m evaramu.cli sync-permissions >/dev/null
ok "Permissions in sync"
log "Ensuring the configured administrator (SUPER_ADMIN_*) exists"
"$PY" -m evaramu.cli ensure-admin || warn "Administrator from .env not created — see message above"
