"""Alembic environment — reads the same settings object the app uses."""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.core.database import Base
import app.models  # noqa: F401 — registers every table on Base.metadata

config = context.config
config.set_main_option("sqlalchemy.url", settings.sync_database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

#: PostGIS installs its own tables (tiger geocoder, topology, spatial_ref_sys)
#: into the database. Autogenerate would otherwise emit DROP statements for
#: every one of them.
POSTGIS_SCHEMAS = {"tiger", "tiger_data", "topology"}
POSTGIS_TABLES = {"spatial_ref_sys", "geography_columns", "geometry_columns", "raster_columns",
                  "raster_overviews"}


def include_object(obj, name, type_, reflected, compare_to) -> bool:
    if type_ == "table":
        if getattr(obj, "schema", None) in POSTGIS_SCHEMAS:
            return False
        if name in POSTGIS_TABLES:
            return False
        # Anything reflected that we do not declare is not ours to drop.
        if reflected and compare_to is None and name not in Base.metadata.tables:
            return False
    return True


def run_migrations_offline() -> None:
    context.configure(
        url=settings.sync_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        include_object=include_object,
        include_schemas=False,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_object=include_object,
            include_schemas=False,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
