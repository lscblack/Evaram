# Evaramu API (server)

FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL backend of the Evaramu Property & Rent Management Platform.
See the repository [README](../README.md) for installation, deployment and operations.

## Layout

```
evaramu/
  core/        config (env/.env), database sessions, security (Argon2, JWT), rate limiting, storage, errors, money
  db/          declarative base with naming convention; registry.py imports every model
  modules/<domain>/
    models.py  SQLAlchemy models (enums stored as VARCHAR + CHECK constraints for painless migrations)
    schemas.py Pydantic request/response models
    service.py business rules and transactions
    router.py  HTTP endpoints (thin: validate → service → serialise)
  jobs.py      daily maintenance
  cli.py       operations CLI
  main.py      app factory
migrations/    Alembic (0001 schema, 0002 reference data)
tests/         pytest — runs on an isolated <DB_NAME>_test database, migrated with Alembic
```

## Everyday commands

```bash
.venv/bin/uvicorn evaramu.main:app --reload --port 8000   # API docs at /api/docs (not in production)
.venv/bin/pytest                                          # 56 tests: auth, RBAC, properties, availability,
                                                          # agreements, billing, payments, reports, workflow, migrations
.venv/bin/ruff check evaramu migrations tests
.venv/bin/alembic revision --autogenerate -m "…"          # then review the generated file
.venv/bin/python -m evaramu.cli --help
```

## API overview (`/api/v1`)

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`, `GET /auth/me` |
| Staff & roles | `/users`, `/users/{id}/reset-password`, `/roles`, `/permissions` |
| Properties | `/properties`, `/properties/{id}/archive`, `/properties/{id}/history`, `/properties/{id}/images`, `/images/{id}` |
| Units | `/units`, `/units/{id}/status`, `/units/{id}/publish`, `/units/{id}/archive`, `/units/{id}/history`, `/codes/suggest`, `/availability` |
| Tenants | `/tenants`, `/tenants/{id}/archive` |
| Agreements | `/agreements`, `/agreements/{id}/activate`, `/terminate`, `/move-out`, `/renew`, `/deposits` |
| Invoices | `/invoices`, `/invoices/generate`, `/invoices/{id}/adjustments`, `/invoices/{id}/void` |
| Payments | `/payments` (multipart, optional evidence), `/payments/{id}/approve`, `/reject`, `/reverse`, `/apply-credit`, `/evidence`, `/payment-methods` |
| Reports | `/dashboard`, `/reports/payments`, `/reports/invoices`, `/reports/monthly`, `/reports/outstanding` (+ `.csv` exports) |
| System | `/notifications`, `/settings`, `/audit-logs`, `/inquiries`, `/health` |
| Public (no auth) | `/public/listings`, `/public/listings/{code}`, `/public/filters`, `/public/settings`, `POST /public/inquiries` |

Errors are JSON: `{"detail": "...", "code": "..."}` (validation errors add `errors: [{field, message}]`).
