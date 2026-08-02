from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _key(request: Request) -> str:
    """Rate-limit per client IP, honouring a proxy's X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


# `headers_enabled` is off deliberately: with it on, slowapi tries to write
# X-RateLimit-* onto the value a route returns, which fails for any endpoint
# that returns a pydantic model rather than a Response. SlowAPIMiddleware still
# enforces the limits and returns 429s.
limiter = Limiter(key_func=_key, default_limits=["600/minute"], headers_enabled=False)
