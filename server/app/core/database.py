import logging
import socket
from collections.abc import AsyncGenerator
from typing import Any

import asyncpg
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import AsyncAdaptedQueuePool

from app.core.config import settings

logger = logging.getLogger("evaramu.db")

#: Connecting to Postgres requires naming a database that already exists, so a
#: brand-new cluster is reached through one of these to create ours.
_MAINTENANCE_DATABASES = ("postgres", "template1")

#: Applied once, to a database we just created. Every migration and the seeder
#: assume these are present.
_BOOTSTRAP_EXTENSIONS = ("postgis", "pg_trgm")


class Base(DeclarativeBase):
    """Declarative base for every ORM model."""

    def as_dict(self) -> dict[str, Any]:
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}


engine = create_async_engine(
    settings.database_url,
    echo=settings.DB_ECHO,
    poolclass=AsyncAdaptedQueuePool,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    # Server-side statement cache is disabled because pgbouncer in transaction
    # mode (likely in production) cannot support prepared statements.
    connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


def _unreachable_message(exc: Exception | None, name: str) -> str:
    """Say which of the several 'cannot connect' failures this actually is.

    They look identical in a stack trace and have completely different fixes, so
    the message names the setting to go and look at.
    """
    where = f"{settings.DB_HOST}:{settings.DB_PORT}"
    head = f"Cannot reach Postgres at {where}, so the {name!r} database cannot be created."

    if isinstance(exc, socket.gaierror):
        return (
            f"{head} The hostname {settings.DB_HOST!r} does not resolve — this is DNS, not "
            "Postgres. Set DB_HOST in .env to a name this machine can resolve; use "
            "'localhost' when Postgres runs on the same host as the app."
        )
    if isinstance(exc, ConnectionRefusedError):
        return (
            f"{head} The host resolved but nothing is listening on port {settings.DB_PORT}. "
            "Check that Postgres is running and that DB_PORT matches the port it is bound to."
        )
    if isinstance(exc, asyncpg.InvalidPasswordError):
        return f"{head} The password for {settings.DB_USER!r} was rejected. Check DB_PASSWORD in .env."
    if isinstance(exc, asyncpg.InvalidAuthorizationSpecificationError):
        return (
            f"{head} The server refused the connection for role {settings.DB_USER!r} — usually "
            "pg_hba.conf not permitting this host, or the role not existing."
        )
    if isinstance(exc, TimeoutError):
        return (
            f"{head} The connection timed out, which usually means a firewall is dropping "
            f"traffic to port {settings.DB_PORT} rather than refusing it."
        )
    return (
        f"{head} ({type(exc).__name__}: {exc}) Check that the server is running and that the "
        "DB_ settings in .env are correct."
    )


async def ensure_database_exists() -> bool:
    """Create `DB_NAME` on the configured server when it is not there yet.

    Returns True when this call created it. A running server is still a
    prerequisite — an unreachable host raises, because there is nothing
    sensible to bootstrap against.
    """
    name = settings.DB_NAME
    conn: asyncpg.Connection | None = None
    unreachable: Exception | None = None

    for maintenance in _MAINTENANCE_DATABASES:
        try:
            conn = await asyncpg.connect(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=maintenance,
            )
            break
        except asyncpg.InvalidCatalogNameError:
            continue  # this cluster has no such maintenance database, try the next
        except (OSError, asyncpg.PostgresError) as exc:
            unreachable = exc
            break

    if conn is None:
        raise RuntimeError(_unreachable_message(unreachable, name)) from unreachable

    try:
        if await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name):
            return False
        try:
            await conn.execute(f'CREATE DATABASE "{name}"')
        except asyncpg.PostgresError:
            # Racing workers land here — as DuplicateDatabase, or as a unique
            # violation on pg_database when two CREATEs truly overlap. Either
            # way the database being there now is the outcome we wanted.
            if await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name):
                return False
            raise
        logger.info("created database %r", name)
    finally:
        await conn.close()

    return True


async def ensure_extensions() -> None:
    """Enable the extensions the migrations assume, if they are not on yet.

    Creating one needs elevated rights, so this only issues CREATE for the ones
    genuinely missing and warns instead of failing — the migration that needs
    the extension will report the real problem in context.
    """
    async with engine.connect() as conn:
        # Autocommit, so one refused CREATE does not poison the next statement.
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        installed = set(
            (await conn.execute(text("SELECT extname FROM pg_extension"))).scalars()
        )
        for extension in _BOOTSTRAP_EXTENSIONS:
            if extension in installed:
                continue
            try:
                await conn.execute(text(f"CREATE EXTENSION IF NOT EXISTS {extension}"))
                logger.info("enabled extension %s", extension)
            except SQLAlchemyError as exc:
                logger.warning("could not enable %s: %s", extension, exc)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Request-scoped session. Commits are explicit in the routers."""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    await engine.dispose()
