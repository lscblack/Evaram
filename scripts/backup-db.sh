#!/usr/bin/env bash
# Back up the configured database (pg_dump custom format) into backups/.
#   scripts/backup-db.sh [label]
# Keeps the newest $EVARAMU_BACKUP_KEEP backups (default 30). Prints the file path.
source "$(dirname "$0")/lib/common.sh"
load_db_env
command -v pg_dump >/dev/null || die "pg_dump not found (install the PostgreSQL client tools)"

label="${1:-manual}"
label="${label//[^a-zA-Z0-9_-]/}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true
file="$BACKUP_DIR/${PGDATABASE}_$(date +%Y%m%d_%H%M%S)_${label}.dump"

log "Backing up $(db_label)"
pg_dump --format=custom --no-owner --file="$file.partial" 2> >(grep -v -i 'collation' >&2)
mv "$file.partial" "$file"
chmod 600 "$file"
pg_restore --list "$file" >/dev/null || die "Backup verification failed: $file"
ok "Backup written: $file ($(du -h "$file" | cut -f1))"

keep="${EVARAMU_BACKUP_KEEP:-30}"
# Only timestamped backups made by this script are pruned (legacy_* files never are).
mapfile -t old < <(ls -1t "$BACKUP_DIR/${PGDATABASE}"_[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_[0-9][0-9][0-9][0-9][0-9][0-9]_*.dump 2>/dev/null | tail -n +$((keep + 1)))
for f in "${old[@]}"; do rm -f -- "$f"; done
[[ ${#old[@]} -gt 0 ]] && log "Removed ${#old[@]} backup(s) beyond the newest $keep"
echo "$file"
