"""
A route class that transparently unseals request bodies and seals responses.

Applied to the whole v1 router, so handlers and pydantic schemas stay entirely
unaware that the wire is encrypted. A request without a session header is
served in the clear, which keeps `/docs`, curl and monitoring usable while the
browser client always negotiates a session.
"""

import json
import logging
from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import Request, Response
from fastapi.responses import ORJSONResponse
from fastapi.routing import APIRoute

from app.core import crypto

logger = logging.getLogger("evaramu.secure")

SESSION_HEADER = "x-e2e-session"
#: Set by the client when it wants a sealed response even for a GET.
ACCEPT_HEADER = "x-e2e-accept"


class SecureRoute(APIRoute):
    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        original = super().get_route_handler()

        async def handler(request: Request) -> Response:
            session_id = request.headers.get(SESSION_HEADER)
            key = crypto.sessions.get(session_id) if session_id else None

            if key is None:
                # No session (curl, /docs, health checks) — behave normally.
                if session_id:
                    # Stale or unknown session: tell the client to re-handshake
                    # rather than silently downgrading to plaintext.
                    return ORJSONResponse(
                        status_code=409,
                        content={"detail": "Session expired", "code": "e2e_session_expired"},
                    )
                return await original(request)

            # ---- unseal the request body ----
            body = await request.body()
            if body:
                try:
                    envelope = json.loads(body)
                    sealed = envelope.get("d") if isinstance(envelope, dict) else None
                    if sealed:
                        plaintext = crypto.unseal(key, sealed)
                        request._body = plaintext
                except Exception:
                    logger.warning("could not unseal request to %s", request.url.path)
                    return ORJSONResponse(
                        status_code=400,
                        content={"detail": "Malformed secure payload", "code": "e2e_bad_request"},
                    )

            response = await original(request)

            # ---- seal the response body ----
            payload = getattr(response, "body", None)
            if payload and response.headers.get("content-type", "").startswith(
                "application/json"
            ):
                sealed = crypto.seal(key, payload)
                out = ORJSONResponse(
                    status_code=response.status_code, content={"d": sealed}
                )
                # Carry over anything the handler set (cache hints, etc.).
                for name, value in response.headers.items():
                    if name.lower() not in {"content-length", "content-type"}:
                        out.headers[name] = value
                out.headers["X-E2E"] = "1"
                return out

            return response

        return handler
