#!/usr/bin/env bash
# One-time switch from the PREVIOUS application's API to this one, on the same port.
#
#   conda activate fastapi_setup        # any Python 3.11+; packages go into server/.venv only
#   bash scripts/switch-api.sh          # as root
#
# Steps (asks before stopping anything; ASSUME_YES=1 answers yes):
#   1. installs backend packages into the active Python environment if missing
#   2. shows the non-secret production settings from server/.env and warns about problems
#   3. migrates the database (the previous application's database is renamed and kept)
#   4. finds the old API (systemd unit, pm2 or plain process running app.main:app) and its port
#   5. stops it, installs the evaramu-api systemd service on that port and starts it
#   6. checks the new API locally and at the public API address (VITE_API_URL)
source "$(dirname "$0")/lib/common.sh"
cd "$ROOT_DIR"
[[ $EUID -eq 0 ]] || die "Run as root (sudo -E bash scripts/switch-api.sh) so the service can be installed"

# ---- 1. Python environment (server/.venv, isolated from shared environments) ---------------------
"$ROOT_DIR/scripts/setup-backend.sh"
require_venv
ok "Python: $PY"

# ---- 2. configuration review (no secrets printed) ------------------------------------------------
log "Production settings in server/.env"
(cd "$SERVER_DIR" && "$PY" - <<'PYEOF'
from urllib.parse import urlsplit
from evaramu.core.config import Settings
s = Settings()
site = urlsplit(s.PUBLIC_SITE_URL)
site_origin = f"{site.scheme}://{site.netloc}"
print(f"  APP_ENV          = {s.APP_ENV}")
print(f"  PUBLIC_SITE_URL  = {s.PUBLIC_SITE_URL}")
print(f"  CORS_ORIGINS     = {s.CORS_ORIGINS}")
print(f"  COOKIE_SECURE    = {s.COOKIE_SECURE}")
print(f"  passkeys         = rp_id {s.webauthn_rp_id}, origins {', '.join(s.webauthn_origins)}")
print(f"  MAIL_BACKEND     = {s.MAIL_BACKEND}")
problems = []
if s.APP_ENV != "production":
    problems.append("APP_ENV=production")
if site.scheme != "https":
    problems.append("PUBLIC_SITE_URL=https://evaramu.rw   (passkeys need the real https site)")
if site_origin not in s.cors_origins:
    problems.append(f"CORS_ORIGINS must include {site_origin}  (e.g. https://evaramu.rw,https://www.evaramu.rw)")
if not s.COOKIE_SECURE:
    problems.append("COOKIE_SECURE=true")
if problems:
    print("\n  Recommended changes in server/.env:")
    for p in problems:
        print(f"    - {p}")
    raise SystemExit(3)
PYEOF
) || {
  rc=$?
  if [[ $rc -eq 3 ]]; then
    confirm "Continue anyway? (answer N, edit server/.env, then run this again)" || die "Stopped: update server/.env first"
  else
    die "server/.env could not be loaded (see the error above)"
  fi
}

# ---- 3. database ---------------------------------------------------------------------------------
log "Database"
"$ROOT_DIR/scripts/migrate.sh" --replace-legacy

# ---- 4. find the old API -------------------------------------------------------------------------
# "app.main:app" is a common name: other projects on this server may use it too. Only processes,
# units and pm2 apps whose working directory is inside THIS project ($ROOT_DIR) are touched.
log "Looking for the previous API (app.main:app inside $ROOT_DIR)"
in_project() { local d; d="$(readlink -f "$1" 2>/dev/null || true)"; [[ -n "$d" && ( "$d" == "$ROOT_DIR" || "$d" == "$ROOT_DIR"/* ) ]]; }
legacy_units=()
while read -r unit; do
  [[ -z "$unit" || "$unit" == "evaramu-api.service" ]] && continue
  body="$(systemctl cat "$unit" 2>/dev/null || true)"
  grep -qE '(^|[ /])app\.main:app' <<<"$body" || continue
  wd="$(sed -n 's/^WorkingDirectory=-\{0,1\}//p' <<<"$body" | tail -n1)"
  if in_project "${wd:-/nonexistent}"; then legacy_units+=("$unit"); else warn "Leaving $unit alone (it belongs to ${wd:-another project})"; fi
done < <(systemctl list-units --type=service --all --no-legend --plain 2>/dev/null | awk '{print $1}')
legacy_pids=()
while read -r pid _; do
  [[ -z "$pid" ]] && continue
  if in_project "/proc/$pid/cwd"; then legacy_pids+=("$pid"); fi
done < <(pgrep -af '(^|[ /])app\.main:app' | grep -v -E 'pgrep|switch-api' || true)
pm2_names=()
if command -v pm2 >/dev/null 2>&1; then
  while read -r name; do [[ -n "$name" ]] && pm2_names+=("$name"); done < <(pm2 jlist 2>/dev/null | ROOT="$ROOT_DIR" "$PY" -c '
import json, os, sys
root = os.path.realpath(os.environ["ROOT"])
try:
    for p in json.load(sys.stdin):
        env = p.get("pm2_env", {})
        args = " ".join(map(str, env.get("args") or [])) + " " + str(env.get("pm_exec_path", ""))
        cwd = os.path.realpath(str(env.get("pm_cwd") or ""))
        if "app.main:app" in args and (cwd == root or cwd.startswith(root + os.sep)):
            print(p.get("name"))
except Exception:
    pass')
fi

port="${API_PORT:-}"
if [[ -z "$port" && ${#legacy_pids[@]} -gt 0 ]]; then
  ports="$(for pid in "${legacy_pids[@]}"; do ss -ltnpH 2>/dev/null | grep -E "pid=$pid[,)]" | awk '{print $4}' | sed 's/.*://'; done | sort -u)"
  [[ "$(grep -c . <<<"$ports")" -gt 1 ]] && die "The old API listens on several ports ($(tr '\n' ' ' <<<"$ports")). Re-run with API_PORT=<the port nginx forwards api.evaramu.rw to>"
  port="$(head -n1 <<<"$ports")"
fi
port="${port:-8000}"

echo "  systemd units : ${legacy_units[*]:-none}"
echo "  pm2 processes : ${pm2_names[*]:-none}"
echo "  processes     : ${legacy_pids[*]:-none}"
echo "  port          : $port   (the new API will listen on 127.0.0.1:$port; override with API_PORT=...)"
if [[ ${#legacy_units[@]} -eq 0 && ${#pm2_names[@]} -eq 0 && ${#legacy_pids[@]} -eq 0 ]]; then
  warn "No running app.main:app found. If the old API runs under another name (supervisor, docker…), stop it yourself."
fi

confirm "Stop the previous API and start the new one on port $port?" || die "Nothing was changed"

# ---- 5. stop old, install and start new ----------------------------------------------------------
for u in "${legacy_units[@]}"; do
  systemctl stop "$u" && systemctl disable "$u" >/dev/null 2>&1 || true
  ok "Stopped and disabled $u"
done
for n in "${pm2_names[@]}"; do
  pm2 stop "$n" >/dev/null && pm2 delete "$n" >/dev/null && pm2 save >/dev/null 2>&1 || true
  ok "Stopped pm2 process $n"
done
for pid in "${legacy_pids[@]}"; do
  kill "$pid" 2>/dev/null && ok "Stopped process $pid" || true
done
sleep 2
if ss -ltnH "sport = :$port" 2>/dev/null | grep -q .; then
  die "Port $port is still in use by another program: $(ss -ltnpH "sport = :$port" | head -n1)"
fi

# Conda/virtualenvs under /root or /home need home access, so ProtectHome is only set otherwise.
protect_home="ProtectHome=true"
real_py="$(readlink -f "$PY")"
[[ "$real_py" == /root/* || "$real_py" == /home/* ]] && protect_home="# ProtectHome off: the Python environment lives in a home directory"
mkdir -p "$SERVER_DIR/storage/media" "$SERVER_DIR/storage/private" "$BACKUP_DIR"
cat > /etc/systemd/system/evaramu-api.service <<UNIT
# Generated by scripts/switch-api.sh
[Unit]
Description=Evaramu Property & Rent Management API
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$SERVER_DIR
ExecStart=$PY -m uvicorn evaramu.main:app --host 127.0.0.1 --port $port --workers 3 --proxy-headers --forwarded-allow-ips 127.0.0.1 --no-server-header
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
$protect_home

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable evaramu-api >/dev/null 2>&1
systemctl restart evaramu-api
ok "evaramu-api service started (logs: journalctl -u evaramu-api -f)"

# ---- 6. checks -----------------------------------------------------------------------------------
API_URL="http://127.0.0.1:$port" "$ROOT_DIR/scripts/health-check.sh" || die "The new API did not start: journalctl -u evaramu-api -n 50"
public_api="$(sed -n 's/^VITE_API_URL=//p' "$CLIENT_DIR/.env" 2>/dev/null | tail -n1 | tr -d "\"' ")"
if [[ -n "$public_api" ]]; then
  HEALTH_RETRIES=3 API_URL="$public_api" "$ROOT_DIR/scripts/health-check.sh" \
    && ok "Public API $public_api is the new application" \
    || warn "Public API $public_api is not answering as the new application yet: check that nginx/Cloudflare forwards it to 127.0.0.1:$port"
fi
ok "Done. Rebuild the website if you changed client/.env: bash scripts/build.sh"
