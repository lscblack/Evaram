"""Small in-process sliding-window rate limiter.

Used for the authentication and public inquiry endpoints. Account lockout
(stored in the database) is the durable protection against password guessing;
this limiter additionally throttles bursts per client address. With several
worker processes each keeps its own window, which still bounds the total rate.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from evaramu.core.errors import TooManyRequests


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str, limit: int, window_seconds: int) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window_seconds:
                q.popleft()
            if len(q) >= limit:
                raise TooManyRequests("Too many requests. Please wait a moment and try again.")
            q.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    # Behind nginx, uvicorn is started with --proxy-headers so request.client
    # already reflects X-Forwarded-For from trusted proxies only.
    return request.client.host if request.client else "unknown"


def rate_limit(name: str, limit: int, window_seconds: int):
    def dependency(request: Request) -> None:
        limiter.hit(f"{name}:{client_ip(request)}", limit, window_seconds)

    return dependency
