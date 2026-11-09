#!/usr/bin/env bash
# Restore a backup into the configured database.
#   scripts/restore-db.sh backups/evaramu_20261108_101500_predeploy.dump
#
# Safety: shows the target, requires typing the database name, and first takes
# a "prerestore" backup of the current state so the restore itself is undoable.
# Stop the API service before restoring in production.
source "$(dirname "$0")/lib/common.sh"
file="${1:-}"
[[ -n "$file" && -f "$file" ]] || die "Usage: scripts/restore-db.sh <backup.dump>"
load_db_env
command -v pg_restore >/dev/null || die "pg_restore not found"
pg_restore --list "$file" >/dev/null || die "Not a valid pg_dump custom-format file: $file"

warn "This REPLACES all data in $(db_label) with the contents of:"
warn "  $file"
if [[ "${ASSUME_YES:-0}" != "1" ]]; then
  read -r -p "Type the database name ($PGDATABASE) to continue: " typed
  [[ "$typed" == "$PGDATABASE" ]] || die "Aborted"
fi

log "Taking a safety backup of the current database first"
"$(dirname "$0")/backup-db.sh" prerestore >/dev/null

log "Restoring"
PGOPTIONS="-c client_min_messages=warning" psql -X -q -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2> >(grep -v -i 'collation' >&2)
pg_restore --no-owner --exit-on-error --dbname="$PGDATABASE" "$file" 2> >(grep -v -i 'collation' >&2)
ok "Restore complete."
log "Bringing the schema to the current code version"
"$(dirname "$0")/migrate.sh" --no-backup
