#!/usr/bin/env bash
# Install frontend dependencies exactly as locked.
source "$(dirname "$0")/lib/common.sh"

command -v node >/dev/null || die "Node.js 20+ is required"
command -v pnpm >/dev/null || die "pnpm is required (npm install -g pnpm, or corepack enable)"
cd "$CLIENT_DIR"
log "Installing frontend dependencies (frozen lockfile)"
pnpm install --frozen-lockfile
ok "Frontend ready. Development: scripts/dev.sh · Production build: scripts/build.sh"
