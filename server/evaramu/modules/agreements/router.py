from __future__ import annotations

from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from evaramu.core.deps import DB, Paging, require
from evaramu.core.schemas import Page
from evaramu.modules.agreements import service
from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.agreements.schemas import (
    AgreementCreate,
    AgreementDetail,
    AgreementOut,
    AgreementUpdate,
    DepositIn,
    DepositOut,
    MoveOutIn,
    RenewIn,
    TerminateIn,
)
from evaramu.modules.billing import ledger
from evaramu.modules.identity.models import User
from evaramu.modules.properties.models import Property, RentalUnit
from evaramu.modules.tenants.models import Tenant

router = APIRouter(prefix="/agreements", tags=["agreements"])
Manager = Annotated[User, Depends(require("agreements.manage"))]
View = Depends(require("agreements.view"))


def agreements_out(db: Session, rows: list[RentalAgreement], today: date | None = None) -> list[AgreementOut]:
    today = today or date.today()
    ids = [a.id for a in rows]
    renewed_to = dict(db.execute(select(RentalAgreement.renewed_from_id, RentalAgreement.id)
                                 .where(RentalAgreement.renewed_from_id.in_(ids))).all()) if ids else {}
    out = []
    for a in rows:
        u = a.unit
        out.append(AgreementOut(
            id=a.id, agreement_number=a.agreement_number, status=a.status, tenant_id=a.tenant_id,
            tenant_name=a.tenant.full_name, tenant_phone=a.tenant.phone, unit_id=a.unit_id,
            unit_code=u.code, unit_name=u.name, property_id=u.property_id, property_name=u.property.name,
            location=u.property.location_label, start_date=a.start_date, end_date=a.end_date,
            monthly_rent=a.monthly_rent, currency=a.currency, due_day=a.due_day,
            deposit_required=a.deposit_required, deposit_held=service.deposit_balance(a),
            special_conditions=a.special_conditions, activated_at=a.activated_at,
            terminated_on=a.terminated_on, termination_reason=a.termination_reason,
            move_out_date=a.move_out_date, renewed_from_id=a.renewed_from_id,
            renewed_to_id=renewed_to.get(a.id),
            awaiting_move_out=(a.status in (AgreementStatus.EXPIRED.value, AgreementStatus.TERMINATED.value)
                               and a.activated_at is not None and a.move_out_date is None
                               and a.id not in renewed_to),
            days_to_expiry=(a.end_date - today).days if a.end_date and a.status == AgreementStatus.ACTIVE.value else None,
            created_at=a.created_at,
        ))
    return out


def _detail(db: Session, ag: RentalAgreement) -> AgreementDetail:
    db.refresh(ag)
    base = agreements_out(db, [ag])[0]
    return AgreementDetail(
        **base.model_dump(),
        deposits=[DepositOut.model_validate(d) for d in ag.deposits],
        outstanding=ledger.outstanding_for_agreement(db, ag.id, ag.currency),
    )


@router.get("", response_model=Page[AgreementOut], dependencies=[View])
def list_agreements(
    db: DB, paging: Paging,
    search: str | None = None,
    status: AgreementStatus | None = None,
    tenant_id: int | None = None,
    unit_id: int | None = None,
    expiring_within_days: int | None = None,
    awaiting_move_out: bool = False,
):
    stmt = (select(RentalAgreement)
            .join(Tenant, Tenant.id == RentalAgreement.tenant_id)
            .join(RentalUnit, RentalUnit.id == RentalAgreement.unit_id)
            .join(Property, Property.id == RentalUnit.property_id))
    if awaiting_move_out:
        stmt = service.pending_move_outs_query().join(Tenant, Tenant.id == RentalAgreement.tenant_id) \
            .join(RentalUnit, RentalUnit.id == RentalAgreement.unit_id) \
            .join(Property, Property.id == RentalUnit.property_id)
    if status:
        stmt = stmt.where(RentalAgreement.status == status.value)
    if tenant_id:
        stmt = stmt.where(RentalAgreement.tenant_id == tenant_id)
    if unit_id:
        stmt = stmt.where(RentalAgreement.unit_id == unit_id)
    if expiring_within_days is not None:
        stmt = stmt.where(RentalAgreement.status == AgreementStatus.ACTIVE.value,
                          RentalAgreement.end_date.is_not(None),
                          RentalAgreement.end_date <= date.today() + timedelta(days=expiring_within_days))
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(RentalAgreement.agreement_number.ilike(term), Tenant.full_name.ilike(term),
                              RentalUnit.code.ilike(term), Property.name.ilike(term)))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    order = (RentalAgreement.end_date.asc() if expiring_within_days is not None
             else RentalAgreement.created_at.desc())
    rows = list(db.execute(stmt.order_by(order).offset(paging.offset).limit(paging.page_size)).unique().scalars())
    return Page(items=agreements_out(db, rows), total=total, page=paging.page, page_size=paging.page_size)


@router.post("", response_model=AgreementDetail, status_code=201)
def create_agreement(body: AgreementCreate, request: Request, db: DB, actor: Manager):
    data = body.model_dump(exclude={"activate"})
    if body.currency:
        data["currency"] = body.currency.value
    ag = service.create_draft(db, data, actor=actor, request=request)
    if body.activate:
        service.activate(db, ag, actor=actor, request=request)
    db.commit()
    return _detail(db, ag)


@router.get("/{agreement_id}", response_model=AgreementDetail, dependencies=[View])
def get_agreement(agreement_id: int, db: DB):
    return _detail(db, service.get_agreement(db, agreement_id))


@router.patch("/{agreement_id}", response_model=AgreementDetail)
def update_agreement(agreement_id: int, body: AgreementUpdate, request: Request, db: DB, actor: Manager):
    ag = service.get_agreement(db, agreement_id, for_update=True)
    data = {k: (v.value if hasattr(v, "value") else v) for k, v in body.model_dump(exclude_unset=True).items()}
    data = {k: v for k, v in data.items() if v is not None or k == "end_date"}
    service.update_draft(db, ag, data, actor=actor, request=request)
    db.commit()
    return _detail(db, ag)


@router.post("/{agreement_id}/activate", response_model=AgreementDetail)
def activate(agreement_id: int, request: Request, db: DB, actor: Manager):
    ag = service.get_agreement(db, agreement_id, for_update=True)
    service.activate(db, ag, actor=actor, request=request)
    db.commit()
    return _detail(db, ag)


@router.post("/{agreement_id}/terminate", response_model=AgreementDetail)
def terminate(agreement_id: int, body: TerminateIn, request: Request, db: DB, actor: Manager):
    ag = service.get_agreement(db, agreement_id, for_update=True)
    service.terminate(db, ag, terminated_on=body.terminated_on, reason=body.reason,
                      tenant_vacated=body.tenant_vacated, move_out_date=body.move_out_date,
                      actor=actor, request=request)
    db.commit()
    return _detail(db, ag)


@router.post("/{agreement_id}/move-out", response_model=AgreementDetail)
def move_out(agreement_id: int, body: MoveOutIn, request: Request, db: DB, actor: Manager):
    ag = service.get_agreement(db, agreement_id, for_update=True)
    service.record_move_out(db, ag, body.move_out_date, actor=actor, request=request)
    db.commit()
    return _detail(db, ag)


@router.post("/{agreement_id}/renew", response_model=AgreementDetail, status_code=201)
def renew(agreement_id: int, body: RenewIn, request: Request, db: DB, actor: Manager):
    ag = service.get_agreement(db, agreement_id, for_update=True)
    new = service.renew(db, ag, body.model_dump(exclude_unset=True), actor=actor, request=request)
    db.commit()
    return _detail(db, new)


@router.post("/{agreement_id}/deposits", response_model=AgreementDetail, status_code=201)
def record_deposit(agreement_id: int, body: DepositIn, request: Request, db: DB,
                   actor: Annotated[User, Depends(require("deposits.manage"))]):
    ag = service.get_agreement(db, agreement_id, for_update=True)
    data = body.model_dump()
    data["kind"] = body.kind.value
    service.record_deposit(db, ag, data, actor=actor, request=request)
    db.commit()
    return _detail(db, ag)
