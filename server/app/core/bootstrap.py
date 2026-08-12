"""First-run database setup.

Brings an empty server up to a usable state in one call: create the database,
enable its extensions, run the migrations, then load the baseline seed data.
Every step is skipped when it has already been done, so this is cheap on a
normal restart.
"""

import asyncio
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, ensure_database_exists, ensure_extensions

logger = logging.getLogger("evaramu.db")

#: `server/`, so the paths below hold regardless of the working directory.
_ROOT = Path(__file__).resolve().parents[2]

#: Presence of this table is what tells us the schema has been built.
_SENTINEL_TABLE = "users"

#: Arbitrary but fixed key. Workers starting together take this lock in turn, so
#: the migration and the seed run exactly once.
_LOCK_KEY = 8_246_113_907_551_004


def _alembic_config() -> Config:
    config = Config(str(_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", settings.alembic_url)
    config.attributes["configure_logger"] = False
    return config


async def _schema_exists(conn) -> bool:
    return bool(await conn.scalar(text(f"SELECT to_regclass('public.{_SENTINEL_TABLE}')")))


async def _migrate() -> None:
    """`alembic upgrade head`. Alembic is synchronous, so it runs off-loop."""
    await asyncio.to_thread(command.upgrade, _alembic_config(), "head")


async def stamp_head() -> None:
    """Record the database as being at the latest revision, without running it.

    For schemas built by `Base.metadata.create_all` rather than by migrations —
    the seeder's path. Without this the table exists but `alembic_version` does
    not, so the next `alembic upgrade head` tries to create everything a second
    time and fails on the first CREATE TABLE.
    """
    await asyncio.to_thread(command.stamp, _alembic_config(), "head")


async def bootstrap_database() -> None:
    if await ensure_database_exists():
        logger.info("database %r did not exist and was created", settings.DB_NAME)

    async with engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")

        # Held for the whole check-and-build. A second worker waits here and
        # then sees the finished schema rather than migrating on top of it.
        await conn.execute(text("SELECT pg_advisory_lock(:key)"), {"key": _LOCK_KEY})
        try:
            await ensure_extensions()

            if await _schema_exists(conn):
                return

            logger.info("no schema found in %r — building it", settings.DB_NAME)
            await _migrate()

            # Imported here: the seeds pull in every model and all of their
            # sample content, dead weight on startups that skip this branch.
            from app.seeds.run import seed_all

            await seed_all()
            logger.info("schema created and seeded")
        finally:
            await conn.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": _LOCK_KEY})
