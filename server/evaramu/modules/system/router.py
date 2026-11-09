from __future__ import annotations

from datetime import UTC, date, datetime, time
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select, text, update

from evaramu import __version__
from evaramu.core.deps import DB, CurrentUser, Paging, require
from evaramu.core.errors import DomainError, NotFound
from evaramu.core.schemas import Message, ORMModel, Page
from evaramu.modules.identity.models import User
from evaramu.modules.system.models import (
    AppSetting,
    AuditLog,
    Inquiry,
    InquiryStatus,
    Notification,
)
from evaramu.modules.system.services import audit

router = APIRouter(tags=["system"])


# ------------------------------------------------------------------ health ----


@router.get("/health")
def health(db: DB):
    db.execute(text("SELECT 1"))
    revision = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
    return {"status": "ok", "database": "ok", "version": __version__, "migration": revision}


# ----------------------------------------------------------- notifications ----


class NotificationOut(ORMModel):
    id: int
    kind: str
    title: str
    body: str
    link: str
    read_at: datetime | None
    created_at: datetime


@router.get("/notifications", response_model=Page[NotificationOut])
def my_notifications(db: DB, user: CurrentUser, paging: Paging, unread_only: bool = False):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = db.execute(stmt.order_by(Notification.created_at.desc()).offset(paging.offset).limit(paging.page_size)).scalars()
    return Page(items=list(rows), total=total, page=paging.page, page_size=paging.page_size)


@router.get("/notifications/unread-count")
def unread_count(db: DB, user: CurrentUser):
    n = db.execute(select(func.count()).select_from(Notification)
                   .where(Notification.user_id == user.id, Notification.read_at.is_(None))).scalar_one()
    return {"count": n}


@router.post("/notifications/{notification_id}/read", response_model=Message)
def mark_read(notification_id: int, db: DB, user: CurrentUser):
    db.execute(update(Notification).where(Notification.id == notification_id, Notification.user_id == user.id,
                                          Notification.read_at.is_(None)).values(read_at=datetime.now(UTC)))
    db.commit()
    return Message(detail="ok")


@router.post("/notifications/read-all", response_model=Message)
def mark_all_read(db: DB, user: CurrentUser):
    db.execute(update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
               .values(read_at=datetime.now(UTC)))
    db.commit()
    return Message(detail="ok")


# ---------------------------------------------------------------- settings ----


class SettingOut(ORMModel):
    key: str
    value: Any
    label: str
    group: str
    is_public: bool


class SettingsUpdate(BaseModel):
    values: dict[str, Any] = Field(min_length=1, max_length=50)


@router.get("/settings", response_model=list[SettingOut], dependencies=[Depends(require("settings.manage"))])
def list_settings(db: DB):
    return list(db.execute(select(AppSetting).order_by(AppSetting.group, AppSetting.key)).scalars())


@router.patch("/settings", response_model=list[SettingOut])
def update_settings(body: SettingsUpdate, request: Request, db: DB,
                    actor: Annotated[User, Depends(require("settings.manage"))]):
    changes = {}
    for key, value in body.values.items():
        s = db.get(AppSetting, key)
        if s is None:
            raise DomainError(f"Unknown setting: {key}")
        if isinstance(s.value, int) and not isinstance(s.value, bool):
            try:
                value = int(value)
            except (TypeError, ValueError) as exc:
                raise DomainError(f"{s.label} must be a whole number") from exc
            if key == "billing.default_due_day" and not 1 <= value <= 28:
                raise DomainError("The due day must be between 1 and 28")
        elif isinstance(s.value, bool):
            value = bool(value)
        else:
            value = str(value).strip()[:2000]
        if s.value != value:
            changes[key] = {"from": s.value, "to": value}
            s.value = value
            s.updated_by_id = actor.id
    audit(db, actor=actor, action="settings.updated", entity_type="settings", summary="Updated system settings",
          changes=changes, request=request)
    db.commit()
    return list_settings(db)


# ---------------------------------------------------------------- audit log ----


class AuditOut(BaseModel):
    id: int
    at: datetime
    actor: str | None
    action: str
    entity_type: str
    entity_id: str | None
    summary: str
    changes: dict
    ip_address: str | None


@router.get("/audit-logs", response_model=Page[AuditOut], dependencies=[Depends(require("audit.view"))])
def audit_logs(db: DB, paging: Paging, search: str | None = None, entity_type: str | None = None,
               action: str | None = None, actor_id: int | None = None,
               date_from: date | None = None, date_to: date | None = None):
    stmt = select(AuditLog)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"{action}%"))
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if date_from:
        stmt = stmt.where(AuditLog.created_at >= datetime.combine(date_from, time.min, UTC))
    if date_to:
        stmt = stmt.where(AuditLog.created_at <= datetime.combine(date_to, time.max, UTC))
    if search:
        stmt = stmt.where(or_(AuditLog.summary.ilike(f"%{search}%"), AuditLog.action.ilike(f"%{search}%")))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = db.execute(stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
                      .offset(paging.offset).limit(paging.page_size)).unique().scalars()
    return Page(items=[AuditOut(id=r.id, at=r.created_at, actor=r.actor.full_name if r.actor else None,
                                action=r.action, entity_type=r.entity_type, entity_id=r.entity_id,
                                summary=r.summary, changes=r.changes or {}, ip_address=r.ip_address) for r in rows],
                total=total, page=paging.page, page_size=paging.page_size)


# --------------------------------------------------------------- inquiries ----


class InquiryOut(BaseModel):
    id: int
    full_name: str
    phone: str
    email: str | None
    message: str
    preferred_date: date | None
    status: str
    staff_notes: str
    unit_id: int | None
    unit_code: str | None
    unit_name: str | None
    created_at: datetime


class InquiryUpdate(BaseModel):
    status: InquiryStatus | None = None
    staff_notes: str | None = Field(default=None, max_length=5000)


def _inq_out(i: Inquiry) -> InquiryOut:
    return InquiryOut(id=i.id, full_name=i.full_name, phone=i.phone, email=i.email, message=i.message,
                      preferred_date=i.preferred_date, status=i.status, staff_notes=i.staff_notes,
                      unit_id=i.unit_id, unit_code=i.unit.code if i.unit else None,
                      unit_name=i.unit.name if i.unit else None, created_at=i.created_at)


@router.get("/inquiries", response_model=Page[InquiryOut], dependencies=[Depends(require("inquiries.manage"))])
def list_inquiries(db: DB, paging: Paging, status: InquiryStatus | None = None, search: str | None = None):
    stmt = select(Inquiry)
    if status:
        stmt = stmt.where(Inquiry.status == status.value)
    if search:
        stmt = stmt.where(or_(Inquiry.full_name.ilike(f"%{search}%"), Inquiry.phone.ilike(f"%{search}%")))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = db.execute(stmt.order_by(Inquiry.created_at.desc()).offset(paging.offset).limit(paging.page_size)).unique().scalars()
    return Page(items=[_inq_out(i) for i in rows], total=total, page=paging.page, page_size=paging.page_size)


@router.patch("/inquiries/{inquiry_id}", response_model=InquiryOut)
def update_inquiry(inquiry_id: int, body: InquiryUpdate, request: Request, db: DB,
                   actor: Annotated[User, Depends(require("inquiries.manage"))]):
    inq = db.get(Inquiry, inquiry_id)
    if inq is None:
        raise NotFound("Request not found")
    if body.status is not None:
        inq.status = body.status.value
    if body.staff_notes is not None:
        inq.staff_notes = body.staff_notes
    inq.handled_by_id = actor.id
    audit(db, actor=actor, action="inquiry.updated", entity_type="inquiry", entity_id=inq.id,
          summary=f"Viewing request from {inq.full_name} → {inq.status}", request=request)
    db.commit()
    return _inq_out(inq)


# --------------------------------------------------------------- demo data ----

SettingsManager = Annotated[User, Depends(require("settings.manage"))]


class DemoStatus(BaseModel):
    loaded: bool
    properties: int
    units: int
    tenants: int


class DemoCleared(BaseModel):
    properties: int
    units: int
    agreements: int
    invoices: int
    payments: int
    tenants: int


@router.get("/system/demo-data", response_model=DemoStatus, dependencies=[Depends(require("settings.manage"))])
def demo_status(db: DB):
    from evaramu.modules.system import demo

    return demo.status(db)


@router.post("/system/demo-data", response_model=DemoStatus, status_code=201)
def load_demo(request: Request, db: DB, actor: SettingsManager):
    from evaramu.modules.system import demo

    result = demo.seed(db, actor=actor, request=request)
    db.commit()
    return result


@router.delete("/system/demo-data", response_model=DemoCleared)
def clear_demo(request: Request, db: DB, actor: SettingsManager):
    from evaramu.core.storage import delete_media
    from evaramu.modules.system import demo

    result = demo.clear(db, actor=actor, request=request)
    db.commit()
    delete_media(*result.pop("media"))  # files go only once the rows are gone
    return result
