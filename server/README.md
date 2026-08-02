# Evaramu API

FastAPI backend for the Evaramu Group Ltd platform: property catalogue,
admin-managed site content, role-based access and OTP authentication.

Everything the marketing site renders as "static" — settings, logos, theme
colours, navigation, UI strings, page copy, testimonials, FAQs, articles,
packages, consultation types — is a database row an admin can edit.

## Running it

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env          # then fill in the secrets

# Postgres 16 + PostGIS (the parcel polygons need it)
docker run -d --name evaramu-db \
  -e POSTGRES_USER=evaramu -e POSTGRES_PASSWORD=evaramu_dev_pwd \
  -e POSTGRES_DB=evaramu -p 5433:5432 postgis/postgis:16-3.4

.venv/bin/alembic upgrade head        # schema
.venv/bin/python -m app.seeds.run     # data (idempotent; --reset to rebuild)
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

Interactive docs at `/docs`, health at `/health`.

## Accounts

| Account | Role | Notes |
| --- | --- | --- |
| `louesauveur18@gmail.com` / `Chriss@123` | super_admin | May use the OTP bypass |
| `aline@evaramu.rw`, `patrick@evaramu.rw`, `divine@evaramu.rw`, `josiane@evaramu.rw` | admin | Seeded password `Evaramu@2026Temp` |
| `eric@`, `claudine@`, `sandrine@`, `bosco@`, `kevin@`, `yves@` | agent | Same seeded password |

Change the seeded passwords before this touches a real network.

## Authentication

Two steps. `POST /auth/login` verifies the password and emails a six-character
code; `POST /auth/verify-otp` exchanges it for an access + refresh pair.

Codes are **alphanumeric**, drawn from `ACDEFGHJKMNPQRTUVWXY34679` — uppercase
letters and digits minus the glyphs people misread when retyping (`0/O`, `1/I/L`,
`5/S`, `8/B`, `2/Z`). That is a 244,140,625 keyspace against 1,000,000 for six
digits. Verification is case-insensitive and tolerates spaces and dashes.

Delivery never blocks the response: the send is awaited for 1.2 seconds and then
handed to the background, so a slow mail relay cannot stall the sign-in screen.
Login answers in ~1.4s instead of the ~6s a synchronous SMTP round trip cost.

- **Passwords** — Argon2id (`time_cost=2, memory=64MB, parallelism=2`).
- **Access token** — 30 minutes. **Refresh** — 14 days, rotated on every use.
  Presenting an already-rotated refresh token revokes the whole family, on the
  assumption it was stolen.
- **Lockout** — 8 failed passwords locks the account for 15 minutes.
- **OTP bypass** — `555555` is accepted **only** for `SUPER_ADMIN`, so a broken
  SMTP relay can never lock the founder out. Every other role is rejected, and
  there is a test asserting exactly that.

### Captcha

In-house, not reCAPTCHA — no third-party request on the page, no visitor data
leaving the country, and difficulty tunable per endpoint.

`GET /auth/captcha?scope=login` returns a token, a prompt and a rendered SVG
(distorted glyphs plus noise). **The answer is never sent to the client** — only
its hash is stored, single-use, with a 5-minute TTL and a 3-attempt cap. Scopes
(`login`, `register`, `booking`, `listing`, `enquiry`, `contact`, `application`)
mean a token minted for one form cannot be replayed against another — the client
must request the same scope it will submit against.

Set `CAPTCHA_REQUIRED=false` to disable it in development.

## Roles

`USER < AGENT < ADMIN < SUPER_ADMIN`, compared by rank in `require_role()`.

- **Agent** — creates listings (which land in `pending_review`), edits only
  their own, cannot publish. Editing a live listing sends it back for review.
- **Admin** — verifies and publishes listings, manages taxonomy, content, users
  and bookings.
- **Super admin** — additionally owns branding, theme and security settings
  (`is_protected`) and the audit log. Cannot be disabled by anyone.

Nobody can create or promote an account at or above their own role.

## Data model

30 tables. The parts worth knowing:

**`properties`** — `reference_number` is the manually-entered agency reference
and is required before a listing can be verified; it is unique and indexed, and
the public detail endpoint accepts it as a lookup key alongside the UUID and
slug. Immersive media lives in `boundary_geojson` (parcel polygon),
`boundary_points` (lightweight ring for simple map libraries), `video_360_url`,
`vr_tour_url` + `vr_tour_provider`, `panorama_scenes` and `drone_footage_url`.

**Taxonomy** — `property_categories → property_subcategories →
property_form_fields`. The 24 seeded forms are rows, not code: an admin adds a
category, a form and its fields through the API and the client renders them
without a deploy. `option_sets` holds the shared choice lists (`YES_NO`,
`FENCE_MATERIALS`, …); editing one propagates to every field built from it.

**Answers** land in `properties.details` as JSONB, keyed by field name, with a
GIN index.

### Agriculture

The brief asked for agricultural land use covered properly, so that category
goes well beyond the original two forms — seven forms (seasonal crops,
plantation, livestock, aquaculture, greenhouse, farm house, farm building) with
shared blocks for soil (type, fertility, pH, depth), terrain (topography,
altitude, erosion control, marshland, flood risk), water (sources, reliability,
irrigation method, irrigated area, abstraction permit), access (road quality,
market distance, tenure) and on-farm infrastructure, equipment, certifications
and processing. `seasonal_crops` alone carries 40 fields.

## Performance

- Async SQLAlchemy 2.0 on asyncpg, pooled (20 + 10 overflow, `pool_pre_ping`).
  Prepared-statement caches are off so pgbouncer in transaction mode works.
- Composite indexes on the paths the marketplace actually filters and sorts
  (`status+intent+created`, `category+status`, `district+status`, `price`).
- Trigram GIN index on a denormalised `search_text` column, so `ILIKE '%term%'`
  stays an index scan. The hot marketplace query plans at ~0.4 ms on the seed
  data.
- Taxonomy loads with `selectinload`, never N+1. Counts run against a subquery
  with `ORDER BY` stripped.
- Public reads sit behind a 60-second in-process TTL cache; every mutating
  admin route invalidates the relevant prefix. Swap `app/core/cache.py` for
  Redis when you run more than one instance.
- GZip over 800 bytes, ORJSON serialisation.

## End-to-end encryption

Every request and response body outside the handshake travels sealed. The client
opens with `POST /secure/handshake`, sending an ephemeral P-256 public key; the
server answers with its own point and a salt. Both sides run ECDH → HKDF-SHA256
→ a 256-bit AES-GCM key held only in memory.

From then on bodies are `{"d": base64(nonce || ciphertext || tag)}` and responses
carry `X-E2E: 1`. `SecureRoute` (an `APIRoute` subclass) does the unsealing and
sealing transparently, so endpoint code never sees ciphertext. Requests with no
`X-E2E-Session` header are still accepted in plaintext, which keeps `/docs`,
curl and health checks working. A stale session gets a `409 e2e_session_expired`
rather than a silent downgrade, and the client re-handshakes and retries once.

Measured cost: **−0.09 ms per request** (i.e. inside the noise floor) and 0.56 ms
to seal and unseal a 100 KB payload. In a browser the Network tab shows only
ciphertext — no field names, no values, and no password on the login request.

This defeats network inspection, proxies, logs and scrapers. It does not defeat
the device owner: the page must decrypt to render, so a developer with a
breakpoint can still reach plaintext. That limit is documented in `crypto.ts`.

## Security

Argon2id passwords · rotating refresh tokens with reuse detection · per-route
rate limits (slowapi) · in-house scoped captcha · account lockout · strict CORS
allow-list · `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, HSTS in production · append-only audit log of every admin
mutation with actor, IP, user agent and a field-level diff.

## Layout

```
app/
  core/       config, database, security, deps (RBAC), captcha, email, cache,
              limiter, crypto + secure_route (end-to-end encryption)
  models/     user, taxonomy, property, content
  schemas/    pydantic request/response contracts
  api/v1/     auth, secure (handshake), public, admin_taxonomy,
              admin_properties, admin_content
  services/   auth, captcha, property, audit
  seeds/      form_config (the 24 forms), site_content, demo_content,
              sample_properties, run.py
alembic/      migrations
```

## Endpoints

| Group | Path | Auth |
| --- | --- | --- |
| Handshake | `/api/v1/secure/handshake` | public, always plaintext |
| Auth | `/api/v1/auth/*` | public |
| Public site | `/api/v1/public/*` | public |
| Taxonomy admin | `/api/v1/admin/taxonomy/*` | admin |
| Properties | `/api/v1/admin/properties/*` | agent (scoped) / admin |
| CMS, users, inbox | `/api/v1/admin/*` | admin |
| Audit log | `/api/v1/admin/audit` | super admin |

`GET /api/v1/public/bootstrap` is the one call the client makes at first paint:
settings, UI strings in all three languages, navigation tree and districts.

`POST /api/v1/public/listing-submissions` takes a seller's own listing from the
public Sell page and files it as `pending_review`, so it enters the same
verification queue as anything an agent enters.

## Not done yet

- File uploads take URLs; there is no storage backend wired up.
- Insight bodies are edited as JSON blocks; there is no rich-text editor.
- SMTP credentials are real but unverified from this machine; `EMAIL_FAIL_SILENTLY`
  is on so a dead relay logs instead of breaking a request.
- Kinyarwanda strings need a native-speaker review (`GET /admin/ui-strings?needs_review=true`).
