from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from evaramu.core.config import get_settings
from evaramu.core.errors import Conflict, DomainError, NotFound, Unauthorized
from evaramu.core.security import (
    create_access_token,
    hash_password,
    hash_token,
    needs_rehash,
    new_refresh_token,
    verify_password,
)
from evaramu.modules.identity.models import Permission, RefreshToken, Role, User
from evaramu.modules.identity.permissions import ADMIN_ROLE, BUILTIN_ROLES, PERMISSIONS

#: A rotated refresh token presented again within this window is treated as a
#: concurrent refresh, not as theft.
REUSE_GRACE_SECONDS = 30


def _now() -> datetime:
    return datetime.now(UTC)


def authenticate(db: Session, email: str, password: str) -> User:
    s = get_settings()
    user = db.execute(select(User).where(func.lower(User.email) == email.lower())).scalar_one_or_none()
    generic = Unauthorized("Incorrect email or password", code="bad_credentials")
    if user is None:
        verify_password(password, None)  # equalise timing
        raise generic
    if user.locked_until and user.locked_until > _now():
        raise Unauthorized(
            "Too many failed attempts. The account is temporarily locked; try again later.",
            code="account_locked",
        )
    if not verify_password(password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= s.LOGIN_MAX_ATTEMPTS:
            user.locked_until = _now() + timedelta(minutes=s.LOGIN_LOCKOUT_MINUTES)
            user.failed_login_count = 0
        db.commit()
        raise generic
    if not user.is_active:
        raise Unauthorized("This account has been deactivated", code="account_inactive")
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = _now()
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    return user


def issue_tokens(db: Session, user: User, user_agent: str | None) -> tuple[str, int, str]:
    access, ttl = create_access_token(user.id, user.token_version)
    raw, digest = new_refresh_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=digest,
            created_at=_now(),
            expires_at=_now() + timedelta(days=get_settings().REFRESH_TOKEN_TTL_DAYS),
            user_agent=(user_agent or "")[:300],
        )
    )
    return access, ttl, raw


def rotate_refresh(db: Session, raw: str | None, user_agent: str | None) -> tuple[User, str, int, str]:
    if not raw:
        raise Unauthorized("Not signed in", code="no_session")
    token = db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw)).with_for_update()
    ).scalar_one_or_none()
    if token is None or token.expires_at < _now():
        raise Unauthorized("Session expired. Please sign in again.", code="no_session")
    if token.revoked_at is not None:
        if token.revoked_at > _now() - timedelta(seconds=REUSE_GRACE_SECONDS):
            # Benign race: two tabs/requests refreshed with the same cookie at
            # the same moment. Refuse this one without ending the session.
            raise Unauthorized("Session refreshed elsewhere. Please retry.", code="refresh_race")
        # Re-use of a rotated token: assume theft and end every session.
        db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == token.user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=_now())
        )
        db.commit()
        raise Unauthorized("Session expired. Please sign in again.", code="no_session")
    user = db.get(User, token.user_id)
    if user is None or not user.is_active:
        raise Unauthorized("Session expired. Please sign in again.", code="no_session")
    token.revoked_at = _now()
    access, ttl, new_raw = issue_tokens(db, user, user_agent)
    return user, access, ttl, new_raw


def revoke_refresh(db: Session, raw: str | None) -> None:
    if not raw:
        return
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == hash_token(raw), RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )


def end_all_sessions(db: Session, user: User) -> None:
    user.token_version += 1
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )


# ---------------------------------------------------------------- roles ----


def get_role(db: Session, role_id: int) -> Role:
    role = db.get(Role, role_id)
    if role is None:
        raise NotFound("Role not found")
    return role


def resolve_permissions(db: Session, codes: list[str]) -> list[Permission]:
    perms = list(db.execute(select(Permission).where(Permission.code.in_(codes))).scalars())
    unknown = set(codes) - {p.code for p in perms}
    if unknown:
        raise DomainError(f"Unknown permissions: {', '.join(sorted(unknown))}")
    return perms


def active_admin_count(db: Session) -> int:
    return db.execute(
        select(func.count(User.id))
        .join(Role, Role.id == User.role_id)
        .where(Role.name == ADMIN_ROLE, User.is_active.is_(True))
    ).scalar_one()


def sync_permissions(db: Session) -> dict[str, int]:
    """Make the permission table and built-in roles match the code catalogue.

    Adds new permissions, updates descriptions, gives the Administrator role
    every permission, and creates any missing built-in role. Never removes a
    permission an operator granted to a custom role.
    """
    added = 0
    existing = {p.code: p for p in db.execute(select(Permission)).scalars()}
    for code, (group, desc) in PERMISSIONS.items():
        perm = existing.get(code)
        if perm is None:
            perm = Permission(code=code, group=group, description=desc)
            db.add(perm)
            existing[code] = perm
            added += 1
        else:
            perm.group, perm.description = group, desc
    db.flush()
    roles_created = 0
    for name, (desc, codes) in BUILTIN_ROLES.items():
        role = db.execute(select(Role).where(Role.name == name)).scalar_one_or_none()
        if role is None:
            role = Role(name=name, description=desc, is_system=True)
            role.permissions = [existing[c] for c in codes]
            db.add(role)
            roles_created += 1
        elif name == ADMIN_ROLE:
            role.permissions = sorted(existing.values(), key=lambda p: p.code)
    db.flush()
    return {"permissions_added": added, "roles_created": roles_created}


def ensure_unique_email(db: Session, email: str, exclude_id: int | None = None) -> None:
    stmt = select(User.id).where(func.lower(User.email) == email.lower())
    if exclude_id:
        stmt = stmt.where(User.id != exclude_id)
    if db.execute(stmt).first():
        raise Conflict("A user with this email already exists")
