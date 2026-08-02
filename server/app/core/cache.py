"""
Tiny in-process TTL cache for the public read endpoints.

The marketing site hammers `/public/bootstrap` and the taxonomy on every cold
load; those change only when an admin edits them. Redis would be the answer at
multi-instance scale — this keeps a single node fast with no extra dependency,
and every mutating admin route calls `invalidate()`.
"""

import asyncio
import time
from typing import Any

_store: dict[str, tuple[float, Any]] = {}
_lock = asyncio.Lock()


async def get(key: str) -> Any | None:
    entry = _store.get(key)
    if entry is None:
        return None
    expires_at, value = entry
    if expires_at < time.monotonic():
        _store.pop(key, None)
        return None
    return value


async def set(key: str, value: Any, ttl: int) -> None:
    async with _lock:
        _store[key] = (time.monotonic() + ttl, value)


async def invalidate(*prefixes: str) -> None:
    """Drops every key starting with any of the given prefixes."""
    async with _lock:
        if not prefixes:
            _store.clear()
            return
        for key in [k for k in _store if k.startswith(prefixes)]:
            _store.pop(key, None)


def stats() -> dict[str, int]:
    return {"entries": len(_store)}
