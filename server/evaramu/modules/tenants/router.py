from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from evaramu.core.deps import DB, CurrentUser, Paging, require
from evaramu.core.errors import Conflict, NotFound
from evaramu.core.schemas import CurrencyAmount, Page
from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.billing import ledger
from evaramu.modules.identity.models import User
from evaramu.modules.system.services import audit, diff
from evaramu.modules.tenants.models import Tenant
from evaramu.modules.tenants.schemas import (
    CurrentTenancy,
    TenantAgreementRow,
    TenantCreate,
    TenantDetail,
    TenantOut,
    TenantUpdate,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])
Manager = Annotated[User, Depends(require("tenants.manage"))]


def _mask(value: str | None) -> str | None:
    if not value:
        return value
    tail = value[-4:] if len(value) > 4 else ""
    return f"•••• {tail}" if tail else "••••"


def _tenants_out(db: Session, tenants: list[Tenant], viewer: User) -> list[TenantOut]:
    ids = [t.id for t in tenants]
    sensitive = "tenants.view_sensitive" in viewer.permission_codes
    current: dict[int, list[CurrentTenancy]] = {}
    if ids:
        for a in db.execute(select(RentalAgreement).where(
            RentalAgreement.tenant_id.in_(ids), RentalAgreement.status == AgreementStatus.ACTIVE.value
        )).unique().scalars():
            current.setdefault(a.tenant_id, []).append(CurrentTenancy(
                agreement_id=a.id, agreement_number=a.agreement_number, unit_id=a.unit_id,
                unit_code=a.unit.code, property_name=a.unit.property.name))
    outstanding = ledger.outstanding_by_tenant(db, ids)
    out = []
    for t in tenants:
        out.append(TenantOut(
            id=t.id, full_name=t.full_name, phone=t.phone, email=t.email, id_type=t.id_type,
            id_number=t.id_number if sensitive else _mask(t.id_number),
            id_number_masked=not sensitive and bool(t.id_number),
            nationality=t.nationality, occupation=t.occupation,
            emergency_contact_name=t.emergency_contact_name, emergency_contact_phone=t.emergency_contact_phone,
            emergency_contact_relationship=t.emergency_contact_relationship, notes=t.notes,
            registered_on=t.registered_on, is_archived=t.is_archived, created_at=t.created_at,
            current_tenancies=current.get(t.id, []),
            outstanding=[CurrencyAmount(currency=c, amount=a) for c, a in sorted(outstanding.get(t.id, {}).items()) if a],
        ))
    return out


def _get(db: Session, tenant_id: int) -> Tenant:
    t = db.get(Tenant, tenant_id)
    if t is None:
        raise NotFound("Tenant not found")
    return t


@router.get("", response_model=Page[TenantOut], dependencies=[Depends(require("tenants.view"))])
def list_tenants(
    db: DB, paging: Paging, user: CurrentUser,
    search: str | None = None,
    status: str | None = None,  # "active" (has an active agreement) | "former" | None
    with_balance: bool = False,
    archived: bool = False,
):
    stmt = select(Tenant).where(Tenant.is_archived.is_(archived))
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Tenant.full_name.ilike(term), Tenant.phone.ilike(term), Tenant.email.ilike(term)))
    active_q = select(RentalAgreement.tenant_id).where(RentalAgreement.status == AgreementStatus.ACTIVE.value)
    if status == "active":
        stmt = stmt.where(Tenant.id.in_(active_q))
    elif status == "former":
        stmt = stmt.where(Tenant.id.not_in(active_q))
    if with_balance:
        stmt = stmt.where(Tenant.id.in_(ledger.tenants_with_balance_query()))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = list(db.execute(stmt.order_by(Tenant.full_name).offset(paging.offset).limit(paging.page_size)).scalars())
    return Page(items=_tenants_out(db, rows, user), total=total, page=paging.page, page_size=paging.page_size)


@router.post("", response_model=TenantDetail, status_code=201)
def create_tenant(body: TenantCreate, request: Request, db: DB, actor: Manager):
    dup = db.execute(select(Tenant.id).where(
        func.lower(Tenant.full_name) == body.full_name.strip().lower(), Tenant.phone == body.phone,
        Tenant.is_archived.is_(False),
    )).first()
    if dup:
        raise Conflict("A tenant with the same name and phone number is already registered",
                       code="duplicate_tenant", details={"tenant_id": dup[0]})
    data = body.model_dump()
    data["full_name"] = data["full_name"].strip()
    data["id_type"] = body.id_type.value if body.id_type else None
    if data.get("registered_on") is None:
        data.pop("registered_on")
    tenant = Tenant(**data, created_by_id=actor.id, is_archived=False)
    db.add(tenant)
    db.flush()
    audit(db, actor=actor, action="tenant.created", entity_type="tenant", entity_id=tenant.id,
          summary=f"Registered tenant {tenant.full_name}", request=request)
    db.commit()
    db.refresh(tenant)
    return tenant_detail(tenant.id, db, actor)


@router.get("/{tenant_id}", response_model=TenantDetail, dependencies=[Depends(require("tenants.view"))])
def tenant_detail(tenant_id: int, db: DB, user: CurrentUser):
    tenant = _get(db, tenant_id)
    base = _tenants_out(db, [tenant], user)[0]
    agreements = db.execute(select(RentalAgreement).where(RentalAgreement.tenant_id == tenant.id)
                            .order_by(RentalAgreement.start_date.desc())).unique().scalars()
    rows = [TenantAgreementRow(
        id=a.id, agreement_number=a.agreement_number, status=a.status, unit_id=a.unit_id,
        unit_code=a.unit.code, property_name=a.unit.property.name, start_date=a.start_date,
        end_date=a.end_date, monthly_rent=format(a.monthly_rent, "f"), currency=a.currency,
        move_out_date=a.move_out_date) for a in agreements]
    credit = ledger.credit_by_tenant(db, [tenant.id]).get(tenant.id, {})
    paid = ledger.paid_by_tenant(db, tenant.id)
    return TenantDetail(
        **base.model_dump(), agreements=rows,
        credit=[CurrencyAmount(currency=c, amount=a) for c, a in sorted(credit.items()) if a > Decimal(0)],
        total_paid=[CurrencyAmount(currency=c, amount=a) for c, a in sorted(paid.items())],
    )


@router.patch("/{tenant_id}", response_model=TenantDetail)
def update_tenant(tenant_id: int, body: TenantUpdate, request: Request, db: DB, actor: Manager):
    tenant = _get(db, tenant_id)
    data = body.model_dump(exclude_unset=True)
    if "id_type" in data and data["id_type"] is not None:
        data["id_type"] = data["id_type"].value
    if ("id_number" in data or "id_type" in data) and "tenants.view_sensitive" not in actor.permission_codes:
        data.pop("id_number", None)
        data.pop("id_type", None)
    data = {k: v for k, v in data.items() if v is not None or k in ("email", "id_number", "id_type")}
    changes = diff(tenant, data)
    if "id_number" in changes:
        changes["id_number"] = {"from": "[redacted]", "to": "[redacted]"}
    audit(db, actor=actor, action="tenant.updated", entity_type="tenant", entity_id=tenant.id,
          summary=f"Updated tenant {tenant.full_name}", changes=changes, request=request)
    db.commit()
    return tenant_detail(tenant.id, db, actor)


@router.post("/{tenant_id}/archive", response_model=TenantDetail)
def archive_tenant(tenant_id: int, request: Request, db: DB, actor: Manager):
    tenant = _get(db, tenant_id)
    open_count = db.execute(select(func.count()).select_from(RentalAgreement).where(
        RentalAgreement.tenant_id == tenant.id,
        RentalAgreement.status.in_([AgreementStatus.ACTIVE.value, AgreementStatus.DRAFT.value]),
    )).scalar_one()
    if open_count:
        raise Conflict("Tenants with an active or draft agreement cannot be archived")
    if any(ledger.outstanding_by_tenant(db, [tenant.id]).get(tenant.id, {}).values()):
        raise Conflict("This tenant still has an outstanding balance")
    tenant.is_archived = True
    tenant.archived_at = datetime.now(UTC)
    audit(db, actor=actor, action="tenant.archived", entity_type="tenant", entity_id=tenant.id,
          summary=f"Archived tenant {tenant.full_name}", request=request)
    db.commit()
    return tenant_detail(tenant.id, db, actor)
