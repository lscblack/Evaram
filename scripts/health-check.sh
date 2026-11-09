#!/usr/bin/env bash
# Verify the running API (and optionally the public site) respond correctly.
#   scripts/health-check.sh                       # API at http://127.0.0.1:8000
#   API_URL=http://127.0.0.1:8000 SITE_URL=https://rent.example.com scripts/health-check.sh
source "$(dirname "$0")/lib/common.sh"
API_URL="${API_URL:-http://127.0.0.1:${API_PORT:-8000}}"
SITE_URL="${SITE_URL:-}"
retries="${HEALTH_RETRIES:-10}"

for i in $(seq 1 "$retries"); do
  if body="$(curl -fsS --max-time 5 "$API_URL/api/v1/health" 2>/dev/null)" && [[ "$body" == *'"migration"'* ]]; then
    ok "API healthy: $body"
    break
  fi
  if [[ "$i" == "$retries" ]]; then
    # The previous application answered /health at the root and has no /api/v1/health.
    if curl -fsS --max-time 5 "$API_URL/health" 2>/dev/null | grep -q '"status"'; then
      die "$API_URL is still running the PREVIOUS application (it has /health but no /api/v1/health).
      Stop the old service and start this one: uvicorn evaramu.main:app (see README > Deployment)."
    fi
    die "API did not become healthy at $API_URL"
  fi
  sleep 2
done

if [[ -n "$SITE_URL" ]]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$SITE_URL/")"
  [[ "$code" == "200" ]] || die "Site $SITE_URL returned HTTP $code"
  ok "Site responds (HTTP 200): $SITE_URL"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$SITE_URL/api/v1/public/filters")"
  [[ "$code" == "200" ]] || die "Site API proxy returned HTTP $code"
  ok "Site → API proxy works"
elif [[ -f "$CLIENT_DIR/dist/index.html" ]]; then
  ok "Frontend build present: client/dist/index.html"
else
  warn "No frontend build found (run scripts/build.sh)"
fi
