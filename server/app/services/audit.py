import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import AuditLog
from app.models.user import User


async def record(
    db: AsyncSession,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    summary: str | None = None,
    changes: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """
    Append-only trail. Never raises — an audit failure must not roll back the
    business operation it was recording.
    """
    try:
        entry = AuditLog(
            actor_id=actor.id if actor else None,
            actor_email=actor.email if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            summary=summary,
            changes=changes,
        )
        if request is not None:
            forwarded = request.headers.get("x-forwarded-for")
            entry.ip_address = (
                forwarded.split(",")[0].strip()
                if forwarded
                else (request.client.host if request.client else None)
            )
            entry.user_agent = request.headers.get("user-agent", "")[:320]
        db.add(entry)
    except Exception:  # pragma: no cover - defensive
        pass


def _jsonable(value: Any) -> Any:
    """Coerce a column value into something JSONB will accept.

    Money columns come back as `Decimal`, dates as `date`, foreign keys as
    `UUID` — none of which json can encode. Without this, auditing an edit that
    touched a price raised mid-transaction and took the whole update with it.
    """
    if isinstance(value, Decimal):
        # float() is right here: this is a human-readable trail, not a ledger.
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    return value


def diff(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
    """Only the keys that actually changed, as `{key: [old, new]}`."""
    changed: dict[str, Any] = {}
    for key, new_value in after.items():
        old_value = before.get(key)
        if old_value != new_value:
            changed[key] = [_jsonable(old_value), _jsonable(new_value)]
    return changed
