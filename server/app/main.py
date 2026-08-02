import logging
import time
from contextlib import asynccontextmanager

import orjson
from pathlib import Path

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api.v1 import admin_content, admin_properties, admin_taxonomy, auth, public, secure
from app.core.config import settings
from app.core.database import SessionLocal, dispose_engine, engine
from app.core.limiter import limiter
from app.core.secure_route import SecureRoute

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)
logger = logging.getLogger("evaramu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("database reachable at %s:%s/%s", settings.DB_HOST, settings.DB_PORT, settings.DB_NAME)
    yield
    await dispose_engine()
    logger.info("connection pool closed")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Backend for the Evaramu Group Ltd platform — property catalogue, "
        "admin-managed content, role-based access and OTP authentication."
    ),
    default_response_class=ORJSONResponse,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------- middleware
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=800)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept-Language",
                   "X-Requested-With", "X-E2E-Session", "X-E2E-Accept"],
    expose_headers=["X-Process-Time", "X-E2E"],
    max_age=3600,
)


@app.middleware("http")
async def security_and_timing(request: Request, call_next) -> Response:
    started = time.perf_counter()
    response: Response = await call_next(request)
    elapsed = (time.perf_counter() - started) * 1000
    response.headers["X-Process-Time"] = f"{elapsed:.1f}ms"

    # Hardening headers. HSTS is only meaningful once TLS terminates upstream.
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"

    if elapsed > 500:
        logger.warning("slow request %s %s took %.0fms", request.method, request.url.path, elapsed)
    return response


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    return ORJSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too many requests. Please slow down and try again shortly."},
    )


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError) -> Response:
    """Flatten pydantic errors into something a form can render field-by-field."""
    fields: dict[str, str] = {}
    for error in exc.errors():
        location = [str(p) for p in error["loc"] if p not in ("body", "query", "path")]
        fields[".".join(location) or "_"] = error["msg"]
    return ORJSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Some fields need attention", "fields": fields},
    )


# ---------------------------------------------------------------- routes
API = settings.API_V1_PREFIX

# The handshake must stay in the clear — it is what establishes the key.
# Uploaded media is served straight from disk. It sits outside the API prefix
# and outside SecureRoute on purpose: these are public images fetched by <img>,
# which cannot negotiate an encrypted session.
_media_root = Path(settings.MEDIA_ROOT)
_media_root.mkdir(parents=True, exist_ok=True)
app.mount(settings.MEDIA_URL, StaticFiles(directory=_media_root), name="media")

app.include_router(secure.router, prefix=API)

# Everything else runs through SecureRoute, which unseals request bodies and
# seals responses whenever the caller presents a negotiated session.
for router in (auth.router, public.router, admin_taxonomy.router,
               admin_properties.router, admin_content.router):
    router.route_class = SecureRoute
    for route in router.routes:
        route.__class__ = SecureRoute
    app.include_router(router, prefix=API)


@app.get("/health", tags=["meta"], summary="Liveness and database check")
async def health() -> dict:
    started = time.perf_counter()
    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception as exc:  # noqa: BLE001
        logger.error("health check failed: %s", exc)
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "database": "up" if db_ok else "down",
        "environment": settings.APP_ENV,
        "latency_ms": round((time.perf_counter() - started) * 1000, 2),
    }


@app.get("/", tags=["meta"], include_in_schema=False)
async def root() -> dict:
    return {
        "name": settings.APP_NAME,
        "docs": "/docs" if not settings.is_production else None,
        "api": API,
    }
