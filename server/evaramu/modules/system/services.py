"""Cross-cutting services: audit trail, document numbering, notifications."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from evaramu.modules.identity.models import Permission, Role, User, role_permissions
from evaramu.modules.system.models import AuditLog, Notification, NumberSequence

#: Never written to the audit log, whatever the caller passes.
_REDACT = {"password", "password_hash", "id_number", "token", "refresh_token", "secret"}


def _sanitize(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: ("[redacted]" if k in _REDACT else _sanitize(v)) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_sanitize(v) for v in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)


def audit(
    db: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: Any = None,
    summary: str,
    changes: dict | None = None,
    request: Request | None = None,
) -> None:
    ip = request.client.host if request is not None and request.client else None
    db.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            summary=summary[:500],
            changes=_sanitize(changes or {}),
            ip_address=ip,
        )
    )


def diff(obj: Any, data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Apply ``data`` to ``obj`` and return {field: {"from":..., "to":...}}."""
    changes: dict[str, dict[str, Any]] = {}
    for key, new in data.items():
        old = getattr(obj, key)
        if old != new:
            changes[key] = {"from": old, "to": new}
            setattr(obj, key, new)
    return changes


def next_number(db: Session, prefix: str, *, period: date | None = None, width: int = 4) -> str:
    """Return the next number such as ``INV-202611-0007`` (per-period counter)."""
    stamp = period.strftime("%Y%m") if period else None
    name = f"{prefix}-{stamp}" if stamp else prefix
    db.execute(pg_insert(NumberSequence).values(name=name, last_value=0).on_conflict_do_nothing())
    seq = db.execute(
        select(NumberSequence).where(NumberSequence.name == name).with_for_update()
    ).scalar_one()
    seq.last_value += 1
    db.flush()
    return f"{name}-{seq.last_value:0{width}d}"


def users_with_permission(db: Session, code: str) -> list[User]:
    stmt = (
        select(User)
        .join(Role, Role.id == User.role_id)
        .join(role_permissions, role_permissions.c.role_id == Role.id)
        .join(Permission, Permission.id == role_permissions.c.permission_id)
        .where(Permission.code == code, User.is_active.is_(True))
    )
    return list(db.execute(stmt).unique().scalars())


def notify(
    db: Session,
    *,
    permission: str,
    kind: str,
    title: str,
    body: str = "",
    link: str = "",
    dedupe_key: str | None = None,
) -> int:
    """Create an in-app notification for every active user holding ``permission``."""
    created = 0
    for user in users_with_permission(db, permission):
        stmt = pg_insert(Notification).values(
            user_id=user.id, kind=kind, title=title[:200], body=body, link=link, dedupe_key=dedupe_key
        )
        if dedupe_key:
            stmt = stmt.on_conflict_do_nothing(index_elements=["user_id", "dedupe_key"])
        created += len(db.execute(stmt.returning(Notification.id)).all())
    return created
