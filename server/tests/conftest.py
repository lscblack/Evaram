"""Test harness.

Tests run against an isolated database, ``TEST_DB_NAME`` or ``<DB_NAME>_test``,
which is created if missing, migrated with Alembic (never create_all), and
emptied between tests. A guard refuses to run if the name does not end in
``_test`` so the suite can never touch a real database.
"""

from __future__ import annotations

import io
import os
import tempfile
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest

# ---- isolate configuration BEFORE the application is imported -------------
from evaramu.core.config import SERVER_ROOT, Settings

_base = Settings()
TEST_DB = _base.TEST_DB_NAME or f"{_base.DB_NAME}_test"
if not TEST_DB.endswith("_test") or TEST_DB == _base.DB_NAME:
    raise RuntimeError(f"Refusing to run tests against database {TEST_DB!r}")
_tmp = Path(tempfile.mkdtemp(prefix="evaramu-tests-"))
os.environ.update({
    "DB_NAME": TEST_DB,
    "APP_ENV": "test",
    "MEDIA_ROOT": str(_tmp / "media"),
    "PRIVATE_ROOT": str(_tmp / "private"),
    "SECRET_KEY": "test-secret-key-that-is-long-enough-0123456789",
})

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from evaramu.core.config import get_settings  # noqa: E402
from evaramu.core.database import SessionLocal, configure_engine  # noqa: E402
from evaramu.core.ratelimit import limiter  # noqa: E402
from evaramu.core.security import hash_password  # noqa: E402

get_settings.cache_clear()
SETTINGS = get_settings()
assert SETTINGS.DB_NAME == TEST_DB

REFERENCE_TABLES = {"permissions", "roles", "role_permissions", "payment_methods", "app_settings", "alembic_version",
                    "agreement_templates"}
PASSWORD = "Str0ng!Passw0rd"


def _create_database() -> None:
    admin = create_engine(SETTINGS.database_url("postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        if not c.execute(text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": TEST_DB}).first():
            c.execute(text(f'CREATE DATABASE "{TEST_DB}" TEMPLATE template0'))
    admin.dispose()


def alembic_config(url=None) -> Config:
    cfg = Config(str(SERVER_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(SERVER_ROOT / "migrations"))
    cfg.attributes["skip_logging_config"] = True
    if url is not None:
        cfg.set_main_option("sqlalchemy.url", url.render_as_string(hide_password=False).replace("%", "%%"))
    return cfg


@pytest.fixture(scope="session", autouse=True)
def database():
    _create_database()
    engine = create_engine(SETTINGS.database_url())
    with engine.begin() as c:
        c.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public"))
    command.upgrade(alembic_config(SETTINGS.database_url()), "head")
    configure_engine(engine)
    yield engine
    engine.dispose()


def _migration_0004():
    import importlib.util

    path = SERVER_ROOT / "migrations" / "versions" / "0004_agreement_documents.py"
    spec = importlib.util.spec_from_file_location("migration_0004", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


#: Exchange rate the tests see instead of calling the internet (RWF per USD).
FX_RATE = "1400"


@pytest.fixture(autouse=True)
def offline_fx(monkeypatch):
    from datetime import UTC, datetime
    from decimal import Decimal

    from evaramu.modules.public import fx

    fx.reset_cache()
    monkeypatch.setattr(fx, "fetch_remote",
                        lambda: fx.Rate(rate=Decimal(FX_RATE), source="test", updated_at=datetime.now(UTC)))
    yield
    fx.reset_cache()


@pytest.fixture(autouse=True)
def clean(database):
    yield
    with database.begin() as c:
        tables = [r[0] for r in c.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname='public'")).all() if r[0] not in REFERENCE_TABLES]
        c.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))
        # Reset role grants changed by a test to the migrated defaults.
        c.execute(text("DELETE FROM roles WHERE NOT is_system"))
        c.execute(text("DELETE FROM app_settings WHERE key = 'currency.usd_rwf_last'"))
        c.execute(text("UPDATE app_settings SET value = '0' WHERE key = 'currency.usd_rwf_rate'"))
        # Restore the seeded agreement template exactly as migration 0004 created it.
        seed = _migration_0004()
        c.execute(text("TRUNCATE agreement_templates RESTART IDENTITY CASCADE"))
        c.execute(text("INSERT INTO agreement_templates (name, description, title, body, is_default, is_archived, "
                       "version) VALUES ('Commercial unit lease (Kinyarwanda)', '', :t, :b, true, false, 1)"),
                  {"t": seed.TEMPLATE_TITLE, "b": seed.TEMPLATE_BODY})
    limiter.reset()


@pytest.fixture
def db():
    s = SessionLocal()
    yield s
    s.close()


@pytest.fixture
def client():
    from evaramu.main import app
    with TestClient(app) as c:
        yield c


def make_user(email: str, role: str, name: str = "Staff Member") -> None:
    with SessionLocal() as s:
        role_id = s.execute(text("SELECT id FROM roles WHERE name = :r"), {"r": role}).scalar_one()
        s.execute(text(
            "INSERT INTO users (email, full_name, password_hash, role_id, is_active, token_version, "
            "failed_login_count) VALUES (:e, :n, :p, :r, true, 0, 0)"),
            {"e": email, "n": name, "p": hash_password(PASSWORD), "r": role_id})
        s.commit()


def login(client: TestClient, email: str) -> dict:
    r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def admin(client):
    make_user("admin@example.com", "Administrator", "Alice Admin")
    return login(client, "admin@example.com")


class Api:
    """Thin helper around the HTTP API for readable tests."""

    def __init__(self, client: TestClient, headers: dict):
        self.c = client
        self.h = headers

    def get(self, url, **kw):
        return self.c.get(f"/api/v1{url}", headers=self.h, **kw)

    def post(self, url, json=None, **kw):
        return self.c.post(f"/api/v1{url}", json=json, headers=self.h, **kw)

    def patch(self, url, json=None):
        return self.c.patch(f"/api/v1{url}", json=json, headers=self.h)

    def ok(self, resp, status=200):
        assert resp.status_code == status, f"{resp.status_code}: {resp.text}"
        return resp.json()

    # ---- builders ----
    def property(self, code="B01", **kw):
        body = {"code": code, "name": kw.pop("name", "Kimihurura Residences"), "property_type": "building",
                "district": "Gasabo", "sector": "Kimihurura", **kw}
        return self.ok(self.post("/properties", body), 201)

    def unit(self, property_id, code="R101", rent="150000", currency="RWF", publish=True, available=True, **kw):
        body = {"property_id": property_id, "code": code, "name": kw.pop("name", f"Room {code}"),
                "unit_type": kw.pop("unit_type", "room"), "monthly_rent": rent, "currency": currency,
                "bedrooms": kw.pop("bedrooms", 1), **kw}
        u = self.ok(self.post("/units", body), 201)
        if available:
            u = self.ok(self.post(f"/units/{u['id']}/status", {"status": "available"}))
        if publish:
            u = self.ok(self.post(f"/units/{u['id']}/publish", {"is_published": True}))
        return u

    def tenant(self, name="Jean Mugisha", phone="+250788000001", **kw):
        return self.ok(self.post("/tenants", {"full_name": name, "phone": phone, **kw}), 201)

    def agreement(self, tenant_id, unit_id, start="2026-01-01", end="2026-12-31", activate=True, **kw):
        body = {"tenant_id": tenant_id, "unit_id": unit_id, "start_date": start, "end_date": end,
                "due_day": kw.pop("due_day", 5), "activate": activate, **kw}
        return self.ok(self.post("/agreements", body), 201)

    def generate(self, period):
        return self.ok(self.post("/invoices/generate", {"period": period}))

    def pay(self, agreement_id, amount, *, method="mtn_momo", ref="", when=None, allocations=None, files=None):
        data = {"agreement_id": str(agreement_id), "amount": str(amount), "method_code": method,
                "payment_date": (when or date.today()).isoformat(), "transaction_reference": ref}
        if allocations is not None:
            import json as _j
            data["allocations"] = _j.dumps(allocations)
        return self.c.post("/api/v1/payments", data=data, files=files, headers=self.h)

    def approve(self, payment_id, **kw):
        return self.post(f"/payments/{payment_id}/approve", {"auto_allocate": True, **kw})

    def invoice(self, invoice_id):
        return self.ok(self.get(f"/invoices/{invoice_id}"))


@pytest.fixture
def api(client, admin) -> Api:
    return Api(client, admin)


def png_bytes(color=(10, 40, 80), size=(64, 48)) -> bytes:
    from PIL import Image
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, "PNG")
    return buf.getvalue()


D = Decimal
