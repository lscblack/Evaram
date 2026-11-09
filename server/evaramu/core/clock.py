"""Local (Kigali) time for timestamps printed on documents."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo


def now_local() -> datetime:
    try:
        return datetime.now(ZoneInfo("Africa/Kigali"))
    except Exception:  # tz database missing on the host
        return datetime.now()
