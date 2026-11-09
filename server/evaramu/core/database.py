"""SQLAlchemy engine and session management.

All request handlers receive a session from :func:`get_db`; the session is
committed by the service layer at the end of a unit of work and rolled back on
any exception, so a financial operation is either recorded completely or not
at all.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from evaramu.core.config import get_settings

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        s = get_settings()
        _engine = create_engine(
            s.database_url(),
            pool_size=s.DB_POOL_SIZE,
            max_overflow=s.DB_MAX_OVERFLOW,
            pool_pre_ping=True,
            pool_recycle=1800,
        )
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, expire_on_commit=False)
    return _engine


def configure_engine(engine: Engine) -> None:
    """Point the app at a specific engine (used by the test-suite)."""
    global _engine, _SessionLocal
    _engine = engine
    _SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def SessionLocal() -> Session:  # noqa: N802 - factory, reads like a class
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal()


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional scope for CLI jobs."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
