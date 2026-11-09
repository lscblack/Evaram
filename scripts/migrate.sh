#!/usr/bin/env bash
# Apply pending Alembic migrations (non-destructive; existing data is kept).
#   scripts/migrate.sh              # backup first (if anything is pending), then upgrade
#   scripts/migrate.sh --no-backup
#   scripts/migrate.sh --status     # show current vs head, change nothing
source "$(dirname "$0")/lib/common.sh"
load_db_env
cd "$SERVER_DIR"

status="$("$PY" -m alembic current 2>&1 || true)"
if grep -q "Can't locate revision" <<<"$status"; then
  foreign="$(sed -n "s/.*identified by '\([^']*\)'.*/\1/p" <<<"$status" | head -n1)"
  die "Database $(db_label) is at revision '$foreign', which is not part of this application's migrations.
      It most likely still holds the PREVIOUS application's schema. Nothing was changed.
      Do NOT 'alembic stamp' it. Point DB_NAME at a new empty database (keeping the old one as a
      backup) as described in README.md > 'Moving from the previous application', then re-run."
fi
current="$(awk '{print $1}' <<<"$status" | grep -E '^[0-9a-f]{4,}$' | tail -n1 || true)"
head="$("$PY" -m alembic heads 2>/dev/null | awk '{print $1}' | tail -n1)"
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
  "$PY" -m alembic upgrade head
  ok "Migrations applied"
fi
log "Synchronising permissions and built-in roles"
"$PY" -m evaramu.cli sync-permissions >/dev/null
ok "Permissions in sync"
log "Ensuring the configured administrator (SUPER_ADMIN_*) exists"
"$PY" -m evaramu.cli ensure-admin || warn "Administrator from .env not created — see message above"
