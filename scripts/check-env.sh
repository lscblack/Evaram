#!/usr/bin/env bash
# Validate configuration, database connectivity and migration state.
# Exit code: 0 ok · 1 configuration problems · 2 database unreachable.
source "$(dirname "$0")/lib/common.sh"
require_venv
cd "$SERVER_DIR"
"$PY" -m evaramu.cli check
