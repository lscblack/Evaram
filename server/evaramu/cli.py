"""Operations CLI.

    python -m evaramu.cli check                 # config + database connectivity + migration state
    python -m evaramu.cli create-admin --email you@example.com --name "Full Name"
    python -m evaramu.cli ensure-admin          # create SUPER_ADMIN_* from server/.env if missing
    python -m evaramu.cli sync-permissions      # run after every migration (deploy does this)
    python -m evaramu.cli generate-invoices --period 2026-11
    python -m evaramu.cli run-daily             # cron: expire agreements, invoices, overdue, alerts

The administrator password is read interactively (or from the environment
variable EVARAMU_ADMIN_PASSWORD for unattended setups) — never from arguments,
which would leak into shell history and process listings.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
from datetime import date

from sqlalchemy import func, select, text


def _cmd_check(_: argparse.Namespace) -> int:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    from evaramu.core.config import SERVER_ROOT, get_settings
    from evaramu.core.database import get_engine

    s = get_settings()
    print(f"environment : {s.APP_ENV}")
    print(f"database    : {s.DB_NAME} on {s.DB_HOST}:{s.DB_PORT}")
    print(f"media root  : {s.MEDIA_ROOT}")
    problems = []
    if s.is_production and not s.COOKIE_SECURE:
        problems.append("COOKIE_SECURE should be true in production (HTTPS)")
    if len(s.SECRET_KEY) < 32:
        (problems.append if s.is_production else print)("warning     : SECRET_KEY is not set (development fallback in use)")
    try:
        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
            try:
                current = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            except Exception:
                current = None
    except Exception as exc:
        print(f"database    : UNREACHABLE ({type(exc).__name__})")
        return 2
    head = ScriptDirectory.from_config(Config(str(SERVER_ROOT / "alembic.ini"))).get_current_head()
    print("connection  : ok")
    print(f"migration   : current={current or 'none'} head={head}")
    if current != head:
        print("              pending migrations: run `alembic upgrade head`")
    for p in problems:
        print(f"problem     : {p}")
    return 1 if problems else 0


def _cmd_create_admin(args: argparse.Namespace) -> int:
    from pydantic import EmailStr, TypeAdapter, ValidationError

    from evaramu.core.database import session_scope
    from evaramu.core.security import hash_password, validate_password_strength
    from evaramu.modules.identity.models import Role, User
    from evaramu.modules.identity.permissions import ADMIN_ROLE
    from evaramu.modules.identity.service import sync_permissions
    from evaramu.modules.system.services import audit

    try:  # same rules as the login endpoint, so the account can actually sign in
        args.email = str(TypeAdapter(EmailStr).validate_python(args.email)).lower()
    except ValidationError:
        print("Invalid email address (reserved domains such as .test or .local are not accepted)", file=sys.stderr)
        return 1
    password = os.environ.get("EVARAMU_ADMIN_PASSWORD")
    if not password:
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Repeat password: "):
            print("Passwords do not match", file=sys.stderr)
            return 1
    try:
        validate_password_strength(password)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    with session_scope() as db:
        sync_permissions(db)
        role = db.execute(select(Role).where(Role.name == ADMIN_ROLE)).scalar_one()
        existing = db.execute(select(User).where(func.lower(User.email) == args.email.lower())).scalar_one_or_none()
        if existing:
            if not args.reset:
                print("A user with this email already exists (use --reset to set a new password).", file=sys.stderr)
                return 1
            existing.password_hash = hash_password(password)
            existing.role_id = role.id
            existing.is_active = True
            existing.token_version += 1
            existing.locked_until = None
            audit(db, actor=None, action="user.password_reset", entity_type="user", entity_id=existing.id,
                  summary=f"Administrator access reset for {existing.email} from the command line")
            print(f"Updated administrator {existing.email}")
            return 0
        user = User(email=args.email.lower(), full_name=args.name, password_hash=hash_password(password),
                    role_id=role.id, is_active=True, token_version=0, failed_login_count=0)
        db.add(user)
        db.flush()
        audit(db, actor=None, action="user.created", entity_type="user", entity_id=user.id,
              summary=f"Administrator {user.email} created from the command line")
        print(f"Created administrator {user.email}")
    return 0


def _cmd_ensure_admin(_: argparse.Namespace) -> int:
    """Create the administrator configured in server/.env, if it is missing.

    Never prints the password, never changes an existing account.
    """
    from pydantic import EmailStr, TypeAdapter, ValidationError

    from evaramu.core.config import get_settings
    from evaramu.core.database import session_scope
    from evaramu.core.security import hash_password, validate_password_strength
    from evaramu.modules.identity.models import Role, User
    from evaramu.modules.identity.permissions import ADMIN_ROLE
    from evaramu.modules.identity.service import sync_permissions
    from evaramu.modules.system.services import audit

    s = get_settings()
    password = s.SUPER_ADMIN_PASSWORD.get_secret_value()
    if not s.SUPER_ADMIN_EMAIL or not password:
        print("skipped: SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set")
        return 0
    try:
        email = str(TypeAdapter(EmailStr).validate_python(s.SUPER_ADMIN_EMAIL)).lower()
    except ValidationError:
        print("SUPER_ADMIN_EMAIL is not a valid email address", file=sys.stderr)
        return 1
    with session_scope() as db:
        if db.execute(select(User.id).where(func.lower(User.email) == email)).first():
            print("ok: administrator from SUPER_ADMIN_EMAIL already exists (left unchanged)")
            return 0
        try:
            validate_password_strength(password)
        except ValueError as exc:
            print(f"SUPER_ADMIN_PASSWORD rejected: {exc}", file=sys.stderr)
            return 1
        sync_permissions(db)
        role = db.execute(select(Role).where(Role.name == ADMIN_ROLE)).scalar_one()
        user = User(email=email, full_name=s.SUPER_ADMIN_NAME or "Administrator",
                    password_hash=hash_password(password), role_id=role.id, is_active=True,
                    token_version=0, failed_login_count=0)
        db.add(user)
        db.flush()
        audit(db, actor=None, action="user.created", entity_type="user", entity_id=user.id,
              summary="Administrator created from SUPER_ADMIN_EMAIL configuration")
        print("ok: administrator from SUPER_ADMIN_EMAIL created")
    return 0


def _cmd_sync_permissions(_: argparse.Namespace) -> int:
    from evaramu.core.database import session_scope
    from evaramu.modules.identity.service import sync_permissions

    with session_scope() as db:
        print(json.dumps(sync_permissions(db)))
    return 0


def _cmd_generate(args: argparse.Namespace) -> int:
    from evaramu.core.database import session_scope
    from evaramu.modules.billing.service import generate_rent_invoices

    period = args.period or date.today().strftime("%Y-%m")
    year, month = map(int, period.split("-"))
    with session_scope() as db:
        result = generate_rent_invoices(db, year, month, actor=None)
        print(json.dumps({"period": result["period"], "created": len(result["created"]), "skipped": result["skipped"]}))
    return 0


def _cmd_daily(_: argparse.Namespace) -> int:
    from evaramu.core.database import session_scope
    from evaramu.jobs import run_daily

    with session_scope() as db:
        print(json.dumps(run_daily(db)))
    return 0


def main(argv: list[str] | None = None) -> int:
    # Register every model so cross-module relationships resolve in every command.
    import evaramu.db.registry  # noqa: F401

    parser = argparse.ArgumentParser(prog="python -m evaramu.cli", description="Evaramu operations")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("check", help="validate configuration and database").set_defaults(fn=_cmd_check)
    p = sub.add_parser("create-admin", help="create the initial administrator")
    p.add_argument("--email", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--reset", action="store_true", help="reset password/role if the user exists")
    p.set_defaults(fn=_cmd_create_admin)
    sub.add_parser("ensure-admin", help="create the SUPER_ADMIN_* account from .env if missing").set_defaults(
        fn=_cmd_ensure_admin)
    sub.add_parser("sync-permissions").set_defaults(fn=_cmd_sync_permissions)
    g = sub.add_parser("generate-invoices")
    g.add_argument("--period", help="YYYY-MM (default: current month)")
    g.set_defaults(fn=_cmd_generate)
    sub.add_parser("run-daily").set_defaults(fn=_cmd_daily)
    args = parser.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    raise SystemExit(main())
