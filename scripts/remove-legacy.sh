#!/usr/bin/env bash
# One-time removal of the PREVIOUS application's code, left in place during the
# rebuild because automated deletion was blocked by a safety check.
#
# Everything listed below is inert (nothing imports it) and was archived before
# the rebuild in backups/legacy_code_20261108_*.tar.gz, with old uploads in
# backups/legacy_server_media_*. Review the list, then run:
#
#   scripts/remove-legacy.sh          # asks for confirmation
source "$(dirname "$0")/lib/common.sh"
cd "$ROOT_DIR"

LEGACY=(
  server/app
  server/alembic
  server/media
  client/src/App.tsx
  client/src/index.css
  client/src/assets
  client/src/components
  client/src/data
  client/src/hooks
  client/src/lib
  client/src/pages
  client/src/types
  client/README.md
  client/.oxlintrc.json
  client/media
  client/public/sitemap.xml
  client/public/icons.svg
  client/public/favicon.svg
  scripts/generate-sitemap.mjs
)

present=()
for p in "${LEGACY[@]}"; do [[ -e "$p" ]] && present+=("$p"); done
if [[ ${#present[@]} -eq 0 ]]; then ok "Nothing left to remove"; exit 0; fi

ls -1d backups/legacy_code_*.tar.gz >/dev/null 2>&1 || die "Legacy code archive not found in backups/ — refusing to delete"
echo "The following legacy paths will be deleted:"
printf '  %s\n' "${present[@]}"
confirm "Delete them now?" || die "Aborted"
for p in "${present[@]}"; do rm -rf -- "$p"; done
ok "Legacy application code removed"
