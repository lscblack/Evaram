# Evaramu Property & Rent Management Platform

Rental operations platform for **Evaramu Group Ltd** (Kigali, Rwanda):

* a **public website** listing only the houses, apartments and rooms that are genuinely available to rent, with viewing requests;
* a **management dashboard** for properties, rental units, tenants, rental agreements, monthly invoicing, manual payment approval, outstanding balances and financial reporting, with role-based access.

Payments are recorded by staff and **only count once an approver confirms them**. There is no mobile-money or payment-gateway integration (by design, for now).

---

## Architecture

```
Evaram/
├── client/                    React 19 + TypeScript + Vite + Tailwind CSS 4
│   ├── src/app/               router, providers, admin shell (sidebar, header, mobile tab bar)
│   ├── src/features/          one folder per business area
│   │   ├── public/            public website (home, listing detail, layout)
│   │   ├── auth/              staff sign-in
│   │   ├── dashboard/         financial & occupancy overview
│   │   ├── properties/        properties, buildings, rental units, availability, photos
│   │   ├── tenants/           tenants, viewing requests
│   │   ├── agreements/        rental agreements, renewals, terminations, deposits
│   │   ├── finance/           invoices, payments, approvals, outstanding balances, reports
│   │   └── admin/             staff, roles & permissions, settings, audit log, notifications, account
│   ├── src/shared/            API client + generated types, auth, UI kit, formatting
│   ├── e2e/                   Playwright browser tests (run via scripts/e2e.sh)
│   └── public/brand/          logo derivatives cropped from the supplied logo files
├── server/                    Python FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL
│   ├── evaramu/
│   │   ├── core/              config, database, security, rate limiting, storage, errors
│   │   ├── db/                declarative base + model registry
│   │   ├── modules/           one package per domain: models · schemas · service · router
│   │   │   ├── identity/      users, roles, permissions, auth (JWT + rotating refresh cookie)
│   │   │   ├── properties/    properties, units, photos, code registry, availability rules
│   │   │   ├── tenants/
│   │   │   ├── agreements/    lifecycle, occupancy coupling, deposits
│   │   │   ├── billing/       invoices, adjustments, payments, allocations, ledger
│   │   │   ├── reports/       dashboard + reports (always per currency)
│   │   │   ├── public/        public listing API (no auth, no tenant data)
│   │   │   └── system/        audit log, notifications, settings, inquiries, health
│   │   ├── jobs.py            daily maintenance (expire agreements, invoices, overdue, alerts)
│   │   ├── cli.py             operations CLI
│   │   └── main.py            app factory
│   ├── migrations/            Alembic environment + versioned migrations
│   ├── tests/                 pytest suite (isolated <DB_NAME>_test database)
│   └── storage/               uploaded photos (media/) and payment evidence (private/) — not in git
├── scripts/                   setup, migrate, dev, build, deploy, backup/restore, health, e2e
│   └── templates/             nginx site, systemd units/timers
├── media/                     company media assets
├── *_logo*.png                original logo files (brand source)
└── Evarum_Group_Ltd_Business_Plan_2026.pdf
```

**Brand.** Colours are sampled from the supplied logos — navy `#032A4E` and gold `#BC7A26` — and defined once as Tailwind tokens in `client/src/styles/index.css` (`brand-*`, `gold-*`). The company name, contact details and social links are editable in *System Settings* (seeded from the previous website's settings).

---

## Key business rules

| Rule | Where it is enforced |
| --- | --- |
| A unit appears publicly only if it is published, `available`, not archived, its property is not archived, it has no active agreement, and no related unit (parent apartment / child room) is occupied, reserved or in turnover. | `server/evaramu/modules/properties/availability.py` (one SQL clause used by every public query and by agreement activation) |
| Two active agreements on one unit are impossible. | Service check **and** a partial unique index `uq_rental_agreements_one_active_per_unit` |
| Activating an agreement marks the unit *occupied*. Ending it moves the unit to *turnover* only once the move-out is recorded; it returns to *available* only when staff confirm it is inspected and ready. | `agreements/service.py`, `properties/service.py` |
| Payment status never changes occupancy. | — |
| Unit/property codes are unique and never reused, even after archival. | `reserved_codes` table (rows are never deleted) |
| Payments are recorded as *pending*; only *approved* payments affect balances. Rejection requires a reason; reversals keep the record; nothing financial is ever deleted. | `billing/service.py`, `billing/ledger.py` |
| Duplicate protection: the same provider reference cannot back two live payments; a look-alike approved payment (same tenant, amount, date, method) requires explicit confirmation. | partial unique index `uq_payments_live_reference` + approval check |
| RWF and USD are never added together. Each agreement has its own currency; payments must match it; every total is per currency. RWF amounts are whole francs, USD up to 2 decimals. | `core/money.py`, reports |
| Invoice balance = charged − credited − approved payments. "Previous balance" on an invoice is shown for information only and never double-counted. | `billing/models.py` |

---

## Requirements

* Python 3.12+ (developed on 3.14), PostgreSQL 14+ (developed on 17)
* Node.js 20+ and pnpm 10
* PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) for backups

## Installation (clean environment)

```bash
scripts/setup-backend.sh --dev     # venv + dependencies; creates server/.env from the example if missing
$EDITOR server/.env                # DB_*, SECRET_KEY, CORS_ORIGINS …
scripts/check-env.sh               # validates config + database connectivity
scripts/migrate.sh                 # creates the schema via Alembic (never create_all)
cd server && .venv/bin/python -m evaramu.cli create-admin --email you@example.com --name "Your Name"
cd .. && scripts/setup-frontend.sh
scripts/dev.sh                     # API :8000 (+ /api/docs) and web :5173 (admin at /admin)
```

The administrator password is asked for interactively (or read from `EVARAMU_ADMIN_PASSWORD` for unattended setups). No credentials are hard-coded anywhere.

## Environment variables (`server/.env`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENV` | yes | `development`, `staging` or `production` |
| `SECRET_KEY` | **production** | ≥ 32 random characters; signs access tokens. Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSLMODE` | yes | PostgreSQL connection |
| `CORS_ORIGINS` | no | comma-separated origins (only needed if the browser calls the API cross-origin; the shipped setup is same-origin) |
| `COOKIE_SECURE` | production | `true` when served over HTTPS (refresh cookie `Secure` + HSTS) |
| `MEDIA_ROOT`, `PRIVATE_ROOT` | no | upload folders (default `server/storage/media`, `server/storage/private`) |
| `MAX_UPLOAD_MB` | no | per-file upload limit (default 8) |
| `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS` | no | session lifetimes (15 min / 14 days) |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCKOUT_MINUTES` | no | account lockout (5 attempts / 15 min) |
| `PUBLIC_SITE_URL` | no | public URL of the site |
| `TEST_DB_NAME` | no | test database (default `<DB_NAME>_test`; must end in `_test`) |
| `MAIL_BACKEND`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURITY` | for email codes | `MAIL_BACKEND=smtp` turns on "Email me a sign-in code" (6 digits, 10 minutes, single use). `disabled` hides it; `file` (development only) writes `.eml` files to `MAIL_OUTBOX_DIR` |
| `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGINS` | no | passkeys; default to the host and origin of `PUBLIC_SITE_URL` — set `PUBLIC_SITE_URL=https://evaramu.rw` in production. Passkeys only work over HTTPS (or on `localhost`), never on a bare IP address |

`client/.env`: `VITE_API_URL` — **required** backend origin (e.g. `https://evaramu.rw` or `https://api.evaramu.rw`). The frontend calls `${VITE_API_URL}/api/v1` and loads uploads from `${VITE_API_URL}/media`; there is no built-in default and `vite dev/build` stop if it is missing. It is baked in at build time, so rebuild after changing it. When it is a different origin from the site, add the site's origin to the backend `CORS_ORIGINS`, and keep both on the same domain (a subdomain is fine) so the `SameSite=Strict` refresh cookie is sent.

## Database & migrations

* The schema is created and changed **only** by Alembic (`server/migrations/versions/`).
  * `0001` — complete initial schema (24 tables, foreign keys, check constraints, partial unique indexes).
  * `0002` — reference data: permission catalogue, built-in roles (Administrator, Property Manager, Accountant, Viewer), payment methods (MTN MoMo, Airtel Money, Bank transfer, Cash, Other), company settings.
* `scripts/migrate.sh` backs up the database (when migrations are pending), runs `alembic upgrade head`, and syncs permissions. It never drops data.
* Creating a new migration: `cd server && .venv/bin/alembic revision --autogenerate -m "describe change"`, review it (see the data-safety checklist in each migration's header), then `scripts/migrate.sh`.
* Upgrades preserve properties, tenants, agreements, invoices, payments and history; this is covered by `tests/test_migrations.py` (clean install, downgrade/upgrade, and upgrading a populated older database).

### Moving from the previous application

If `scripts/migrate.sh` says the database *"still holds the PREVIOUS application's schema"*, run once:

```bash
scripts/migrate.sh --replace-legacy
```

It renames the old database to `<db>_legacy_<date>` (kept as it is, no dump), creates a fresh empty
`<db>` (so `server/.env` stays unchanged), builds the schema, permissions and administrator. Run it as
root (it uses the `postgres` superuser locally) or as a role that owns the database and has CREATEDB.
Once you no longer need the old data: `sudo -u postgres dropdb <db>_legacy_<date>`.

### Which Python the scripts use

The scripts use, in order: `EVARAMU_PYTHON` if set, the active virtualenv / conda environment (not
`base`) when it has the backend packages, then `server/.venv`. With a conda environment, activate it
and run `scripts/setup-backend.sh` once to install `server/requirements.txt` into it.

## Deployment

One-time server setup (Ubuntu/Debian example, app in `/srv/evaramu`, user `evaramu`):

1. Install Python 3.12+, PostgreSQL client tools, Node 20+, pnpm, nginx.
2. Clone the repository to `/srv/evaramu`; create `server/.env` (`chmod 600`), with `APP_ENV=production`, `COOKIE_SECURE=true`, a real `SECRET_KEY` and the database settings.
3. `scripts/setup-backend.sh && scripts/setup-frontend.sh && scripts/migrate.sh`, then create the administrator (above).
4. Install the templates from `scripts/templates/` (adjust paths/domain):
   * `nginx.conf` → `/etc/nginx/sites-available/evaramu` (serves `client/dist`, proxies `/api`, serves `/media` from `server/storage/media`); add TLS with certbot.
   * `evaramu-api.service` → systemd (uvicorn, 3 workers, behind nginx).
   * `evaramu-daily.{service,timer}` → daily jobs at 05:30 (expire agreements, generate the month's rent invoices, flag overdue, alerts).
   * `evaramu-backup.{service,timer}` → nightly database backup.

**Every release** (upgrade-safe, no data loss):

```bash
scripts/deploy.sh --pull
```

`deploy.sh` installs pinned dependencies, validates configuration and database connectivity (stops before changing anything if the database is unreachable), backs up the database, runs pending migrations, rebuilds the frontend into `client/dist` with an atomic swap (uploads live in `server/storage` and are never touched), restarts the API **only if backend code or dependencies changed**, and runs health checks. It never resets the database.

## Operational commands

| Task | Command |
| --- | --- |
| Backend setup | `scripts/setup-backend.sh [--dev]` |
| Frontend setup | `scripts/setup-frontend.sh` |
| Validate environment | `scripts/check-env.sh` |
| Migration status / apply | `scripts/migrate.sh --status` · `scripts/migrate.sh` |
| Development servers | `scripts/dev.sh` |
| Production build | `scripts/build.sh` |
| Deploy / upgrade | `scripts/deploy.sh [--pull] [--skip-frontend]` |
| Database backup | `scripts/backup-db.sh [label]` (keeps newest 30; `EVARAMU_BACKUP_KEEP`) |
| Database restore | `scripts/restore-db.sh backups/<file>.dump` (asks you to type the DB name; takes a safety backup first) |
| Health check | `scripts/health-check.sh` (`API_URL=…`, `SITE_URL=…`) |
| Create / reset administrator | `cd server && .venv/bin/python -m evaramu.cli create-admin --email … --name … [--reset]` |
| Generate invoices manually | `cd server && .venv/bin/python -m evaramu.cli generate-invoices --period 2026-11` |
| Daily jobs manually | `cd server && .venv/bin/python -m evaramu.cli run-daily` |
| Backend tests | `cd server && .venv/bin/pytest` |
| Frontend unit tests | `cd client && pnpm test` |
| Browser end-to-end tests | `scripts/e2e.sh` (disposable `<DB_NAME>_e2e_test` database) |
| Regenerate API types | `cd client && pnpm api:types` |

## Security

* Passwords hashed with Argon2; strength policy (≥ 10 chars, 3 character classes).
* 15-minute access tokens held in memory; 14-day refresh token in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/v1/auth`, rotated on every use, reuse detection revokes all sessions; password change / deactivation / role change invalidate tokens.
* Account lockout after repeated failures; rate limits on login, refresh and public inquiries.
* Role-based permissions checked on every endpoint; tenant identification numbers are masked unless the role has `tenants.view_sensitive`, and are never written to the audit log.
* Uploads: photos are decoded and re-encoded to WebP (strips EXIF/GPS, defeats disguised files), size-limited; payment evidence is stored outside the web root and served only to authorised staff.
* SQL via SQLAlchemy parameter binding only; strict Pydantic validation; security headers; CSV exports neutralise spreadsheet formulas; API docs disabled in production; no secrets in logs.

## Legacy application

The previous real-estate/construction website was archived before the rebuild:

* code: `backups/legacy_code_20261108_*.tar.gz`; old uploads: `backups/legacy_server_media_*`;
* database: full copy in the PostgreSQL database `evaramu_legacy_backup_20261108`, plus `backups/legacy_evaramu_pre_rebuild_nongeo_20261108.dump` (all non-geometry tables).

Its source files are still in the tree but inert; remove them with `scripts/remove-legacy.sh`.
