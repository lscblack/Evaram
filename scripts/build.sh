#!/usr/bin/env bash
# Production frontend build, swapped in atomically.
# Builds into client/dist.next, then replaces client/dist in one rename, so the
# site never serves a half-written build. Uploaded photos live in
# server/storage (MEDIA_ROOT), never under client/, so rebuilding cannot touch them.
source "$(dirname "$0")/lib/common.sh"
cd "$CLIENT_DIR"
[[ -d node_modules ]] || pnpm install --frozen-lockfile
log "Type-checking"
pnpm exec tsc -b
log "Building"
rm -rf dist.next
pnpm exec vite build --outDir dist.next --emptyOutDir
[[ -f dist.next/index.html ]] || die "Build produced no index.html"
if [[ -d dist ]]; then
  rm -rf dist.prev
  mv dist dist.prev
fi
mv dist.next dist
rm -rf dist.prev
ok "Frontend built: client/dist ($(du -sh dist | cut -f1))"
