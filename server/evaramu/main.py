"""FastAPI application factory.

Run in development:   uvicorn evaramu.main:app --reload --port 8000
Run in production:    see scripts/deploy.sh and deploy/evaramu-api.service
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from evaramu import __version__
from evaramu.core.config import get_settings
from evaramu.core.errors import install_error_handlers
from evaramu.modules.agreements.documents_router import router as documents_router
from evaramu.modules.agreements.router import router as agreements_router
from evaramu.modules.billing.router import router as billing_router
from evaramu.modules.identity.router import auth_router, roles_router, users_router
from evaramu.modules.properties.router import router as properties_router
from evaramu.modules.public.router import router as public_router
from evaramu.modules.reports.router import router as reports_router
from evaramu.modules.system.deletion import router as deletion_router
from evaramu.modules.system.router import router as system_router
from evaramu.modules.tenants.router import router as tenants_router

logger = logging.getLogger("evaramu")


@asynccontextmanager
async def lifespan(_: FastAPI):
    s = get_settings()
    s.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    s.PRIVATE_ROOT.mkdir(parents=True, exist_ok=True)
    yield


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(
        title=s.APP_NAME,
        version=__version__,
        lifespan=lifespan,
        docs_url=None if s.is_production else "/api/docs",
        redoc_url=None,
        openapi_url=None if s.is_production else "/api/openapi.json",
    )
    install_error_handlers(app)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        errors = []
        for e in exc.errors():
            loc = [str(p) for p in e.get("loc", []) if p not in ("body", "query", "path", "form")]
            msg = str(e.get("msg", "Invalid value")).removeprefix("Value error, ")
            errors.append({"field": ".".join(loc), "message": msg})
        first = errors[0] if errors else {"field": "", "message": "Invalid request"}
        detail = f"{first['field']}: {first['message']}" if first["field"] else first["message"]
        return JSONResponse(status_code=422, content={"detail": detail, "code": "validation_error", "errors": errors})

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):  # pragma: no cover - safety net
        # Log type and path only: request bodies may hold personal data.
        logger.error("Unhandled %s on %s %s", type(exc).__name__, request.method, request.url.path, exc_info=exc)
        return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again.",
                                                      "code": "server_error"})

    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
        max_age=600,
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        if request.url.path.startswith("/api/"):
            response.headers.setdefault("Cache-Control", "no-store")
        if s.COOKIE_SECURE:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response

    api = s.API_PREFIX
    for r in (auth_router, users_router, roles_router, properties_router, tenants_router, agreements_router, documents_router,
              billing_router, reports_router, system_router, deletion_router, public_router):
        app.include_router(r, prefix=api)

    # Public property photographs (re-encoded WebP only). Payment evidence
    # lives in PRIVATE_ROOT and is never mounted.
    s.MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=s.MEDIA_ROOT), name="media")
    return app


app = create_app()
