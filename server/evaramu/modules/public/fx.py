"""USD -> RWF exchange rate for the public website's currency switch.

Display only: rent is always charged in the currency the unit is listed in.

Order of preference:
  1. ``currency.usd_rwf_rate`` setting when > 0 (the landlord's own rate);
  2. a live rate from free, keyless endpoints, cached for ``TTL`` per process;
  3. the last good live rate saved in ``currency.usd_rwf_last`` (survives restarts/outages);
  4. none: the website then shows each price in its listed currency only.
"""

from __future__ import annotations

import json
import logging
import threading
import time
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy.orm import Session

from evaramu.modules.system.models import AppSetting

log = logging.getLogger(__name__)

TTL = 6 * 3600
#: Retry a failed live lookup after this long rather than on every request.
RETRY_AFTER = 10 * 60
TIMEOUT = 4
#: A rate outside this band is treated as a bad response.
SANE = (Decimal("200"), Decimal("20000"))
OVERRIDE_KEY = "currency.usd_rwf_rate"
LAST_KEY = "currency.usd_rwf_last"

#: Free endpoints, no API key. Each entry: (name, url, path to the RWF-per-USD number).
SOURCES: list[tuple[str, str, tuple[str, ...]]] = [
    ("open.er-api.com", "https://open.er-api.com/v6/latest/USD", ("rates", "RWF")),
    ("fawazahmed0 currency-api", "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
     ("usd", "rwf")),
]


@dataclass(frozen=True)
class Rate:
    rate: Decimal
    source: str
    updated_at: datetime
    is_override: bool = False


_lock = threading.Lock()
_cache: tuple[float, Rate] | None = None
_failed_at = 0.0


def _sane(value) -> Decimal | None:
    try:
        d = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    return d.quantize(Decimal("0.0001")) if SANE[0] <= d <= SANE[1] else None


def fetch_remote() -> Rate | None:
    """Ask the free endpoints in turn. Patched in tests; never raises."""
    for name, url, path in SOURCES:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "evaramu-website/1.0", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:  # noqa: S310 - fixed https URLs
                data = json.load(resp)
            for key in path:
                data = data[key]
            rate = _sane(data)
            if rate is not None:
                return Rate(rate=rate, source=name, updated_at=datetime.now(UTC))
            log.warning("Exchange rate from %s out of range", name)
        except Exception as exc:  # network, JSON, missing key
            log.warning("Exchange rate lookup failed at %s: %s", name, type(exc).__name__)
    return None


def _setting(db: Session, key: str):
    s = db.get(AppSetting, key)
    return s.value if s is not None else None


def _save_last(db: Session, r: Rate) -> None:
    value = {"rate": str(r.rate), "source": r.source, "updated_at": r.updated_at.isoformat()}
    s = db.get(AppSetting, LAST_KEY)
    if s is None:
        db.add(AppSetting(key=LAST_KEY, value=value, label="Last live USD to RWF rate", group="system", is_public=False))
    else:
        s.value = value
    db.commit()


def usd_rwf(db: Session) -> Rate | None:
    global _cache, _failed_at
    override = _sane(_setting(db, OVERRIDE_KEY) or 0)
    if override is not None:
        return Rate(rate=override, source="Set by the landlord", updated_at=datetime.now(UTC), is_override=True)

    now = time.monotonic()
    with _lock:
        if _cache and now - _cache[0] < TTL:
            return _cache[1]
        retry = now - _failed_at >= RETRY_AFTER or _failed_at == 0
    live = fetch_remote() if retry else None
    with _lock:
        if live is not None:
            _cache = (now, live)
            _failed_at = 0.0
        else:
            _failed_at = now
    if live is not None:
        try:
            _save_last(db, live)
        except Exception:  # saving the fallback must never break the page
            db.rollback()
        return live

    last = _setting(db, LAST_KEY)
    if isinstance(last, dict) and (rate := _sane(last.get("rate"))) is not None:
        try:
            at = datetime.fromisoformat(last["updated_at"])
        except (KeyError, TypeError, ValueError):
            at = datetime.now(UTC)
        return Rate(rate=rate, source=str(last.get("source") or "last known rate"), updated_at=at)
    return None


def reset_cache() -> None:
    global _cache, _failed_at
    with _lock:
        _cache = None
        _failed_at = 0.0
