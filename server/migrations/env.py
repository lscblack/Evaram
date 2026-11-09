"""Alembic environment.

The connection target is resolved in this order:
1. a connection handed in programmatically (``config.attributes["connection"]``,
   used by the test-suite),
2. ``sqlalchemy.url`` set on the Alembic config (``-x`` free, programmatic),
3. the application settings (``server/.env`` / environment variables).

Credentials are never printed.
"""

from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from evaramu.core.config import Settings
from evaramu.db.registry import metadata

config = context.config
if config.config_file_name is not None and not config.attributes.get("skip_logging_config"):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = metadata


def _url():
    url = config.get_main_option("sqlalchemy.url")
    return url or Settings().database_url()


def run_migrations_offline() -> None:
    context.configure(
        url=str(_url()),
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def _run(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        # Each migration runs in one transaction: a failure leaves the
        # database exactly at the previous revision.
        transaction_per_migration=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return
    engine = create_engine(_url(), poolclass=pool.NullPool)
    with engine.connect() as conn:
        _run(conn)
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
