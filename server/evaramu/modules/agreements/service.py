"""Rental agreement lifecycle.

draft ──activate──▶ active ──terminate──▶ terminated
                      │  └──(end date passes, daily job)──▶ expired
                      └──renew──▶ expired + new active agreement

Occupancy is coupled to the lifecycle but kept separate from payment status:
activation marks the unit *occupied*; ending a tenancy moves the unit to
*turnover* only once the move-out is recorded; the unit returns to
*available* only when staff confirm it is inspected and ready
(``POST /units/{id}/status``). Unpaid rent never changes occupancy.
"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from fastapi import Request
from sqlalchemy import exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from evaramu.core.errors import Conflict, DomainError, NotFound
from evaramu.core.money import validate_amount
from evaramu.modules.agreements.models import (
    AgreementStatus,
    DepositKind,
    DepositTransaction,
    RentalAgreement,
)
from evaramu.modules.identity.models import User
from evaramu.modules.properties import availability
from evaramu.modules.properties.models import UnitStatus
from evaramu.modules.properties.service import get_unit, record_status
from evaramu.modules.system.services import audit, next_number, notify
from evaramu.modules.tenants.models import Tenant


def get_agreement(db: Session, agreement_id: int, *, for_update: bool = False) -> RentalAgreement:
    stmt = select(RentalAgreement).where(RentalAgreement.id == agreement_id)
    if for_update:
        stmt = stmt.with_for_update(of=RentalAgreement)
    ag = db.execute(stmt).unique().scalar_one_or_none()
    if ag is None:
        raise NotFound("Rental agreement not found")
    return ag


def _amount(value: Decimal, currency: str, *, allow_zero: bool = False) -> Decimal:
    try:
        return validate_amount(value, currency, allow_zero=allow_zero)
    except ValueError as exc:
        raise DomainError(str(exc)) from exc


def create_draft(db: Session, data: dict, *, actor: User, request: Request | None) -> RentalAgreement:
    tenant = db.get(Tenant, data["tenant_id"])
    if tenant is None or tenant.is_archived:
        raise DomainError("Choose an existing, non-archived tenant")
    unit = get_unit(db, data["unit_id"])
    if unit.is_archived or unit.property.is_archived:
        raise DomainError("This unit is archived")
    currency = data.get("currency") or unit.currency
    rent = _amount(data.get("monthly_rent") or unit.monthly_rent, currency)
    deposit = _amount(data.get("deposit_required") or Decimal("0"), currency, allow_zero=True)
    if data.get("end_date") and data["end_date"] < data["start_date"]:
        raise DomainError("The agreement cannot end before it starts")
    ag = RentalAgreement(
        agreement_number=next_number(db, "AGR", period=data["start_date"]),
        tenant_id=tenant.id, unit_id=unit.id, status=AgreementStatus.DRAFT.value,
        start_date=data["start_date"], end_date=data.get("end_date"), monthly_rent=rent,
        currency=currency, due_day=data.get("due_day") or 5, deposit_required=deposit,
        special_conditions=data.get("special_conditions") or "", created_by_id=actor.id,
        termination_reason="",
    )
    db.add(ag)
    db.flush()
    audit(db, actor=actor, action="agreement.created", entity_type="agreement", entity_id=ag.id,
          summary=f"Drafted agreement {ag.agreement_number}: {tenant.full_name} → {unit.code}", request=request)
    return ag


def update_draft(db: Session, ag: RentalAgreement, data: dict, *, actor: User, request: Request | None) -> None:
    if ag.status != AgreementStatus.DRAFT.value:
        raise Conflict("Only draft agreements can be edited. Use renew or terminate for active ones.")
    currency = data.get("currency") or ag.currency
    if "monthly_rent" in data or "currency" in data:
        data["monthly_rent"] = _amount(data.get("monthly_rent") or ag.monthly_rent, currency)
    if "deposit_required" in data:
        data["deposit_required"] = _amount(data["deposit_required"], currency, allow_zero=True)
    if "unit_id" in data:
        unit = get_unit(db, data["unit_id"])
        if unit.is_archived:
            raise DomainError("This unit is archived")
    start = data.get("start_date", ag.start_date)
    end = data.get("end_date", ag.end_date)
    if end and end < start:
        raise DomainError("The agreement cannot end before it starts")
    changes = {}
    for k, v in data.items():
        if getattr(ag, k) != v:
            changes[k] = {"from": getattr(ag, k), "to": v}
            setattr(ag, k, v)
    audit(db, actor=actor, action="agreement.updated", entity_type="agreement", entity_id=ag.id,
          summary=f"Updated draft {ag.agreement_number}", changes=changes, request=request)


def activate(db: Session, ag: RentalAgreement, *, actor: User, request: Request | None) -> None:
    if ag.status != AgreementStatus.DRAFT.value:
        raise Conflict("Only draft agreements can be activated")
    if ag.tenant.is_archived:
        raise Conflict("The tenant is archived")
    unit = get_unit(db, ag.unit_id, for_update=True)
    reason = availability.blocked_reason(db, unit)
    if reason:
        raise Conflict(f"Unit {unit.code} cannot be let: {reason}", code="unit_unavailable")
    ag.status = AgreementStatus.ACTIVE.value
    ag.activated_at = datetime.now(UTC)
    try:
        db.flush()  # the partial unique index is the final race guard
    except IntegrityError as exc:
        raise Conflict(f"Unit {unit.code} already has an active agreement", code="unit_unavailable") from exc
    record_status(db, unit, UnitStatus.OCCUPIED.value, actor=actor,
                  reason=f"Tenancy {ag.agreement_number} activated", agreement_id=ag.id)
    audit(db, actor=actor, action="agreement.activated", entity_type="agreement", entity_id=ag.id,
          summary=f"Activated {ag.agreement_number}; unit {unit.code} is now occupied", request=request)


def _move_out(db: Session, ag: RentalAgreement, move_out: date, *, actor: User) -> None:
    ag.move_out_date = move_out
    unit = get_unit(db, ag.unit_id, for_update=True)
    still_active = db.execute(select(exists().where(
        RentalAgreement.unit_id == unit.id, RentalAgreement.status == AgreementStatus.ACTIVE.value,
        RentalAgreement.id != ag.id,
    ))).scalar()
    if not still_active and unit.status == UnitStatus.OCCUPIED.value:
        record_status(db, unit, UnitStatus.TURNOVER.value, actor=actor,
                      reason=f"Tenant moved out ({ag.agreement_number}); inspection pending",
                      agreement_id=ag.id)


def terminate(db: Session, ag: RentalAgreement, *, terminated_on: date, reason: str, tenant_vacated: bool,
              move_out_date: date | None, actor: User, request: Request | None) -> None:
    if not reason.strip():
        raise DomainError("A termination reason is required")
    if ag.status == AgreementStatus.DRAFT.value:
        ag.status = AgreementStatus.TERMINATED.value
        ag.terminated_on = terminated_on
        ag.termination_reason = reason
        audit(db, actor=actor, action="agreement.cancelled", entity_type="agreement", entity_id=ag.id,
              summary=f"Cancelled draft {ag.agreement_number}: {reason}", request=request)
        return
    if ag.status != AgreementStatus.ACTIVE.value:
        raise Conflict("Only active or draft agreements can be terminated")
    if terminated_on < ag.start_date:
        raise DomainError("Termination date cannot be before the agreement start date")
    ag.status = AgreementStatus.TERMINATED.value
    ag.terminated_on = terminated_on
    ag.termination_reason = reason
    db.flush()
    if tenant_vacated:
        _move_out(db, ag, move_out_date or terminated_on, actor=actor)
    audit(db, actor=actor, action="agreement.terminated", entity_type="agreement", entity_id=ag.id,
          summary=f"Terminated {ag.agreement_number} on {terminated_on}: {reason}"
                  + ("" if tenant_vacated else " (tenant not yet moved out)"), request=request)


def record_move_out(db: Session, ag: RentalAgreement, move_out: date, *, actor: User, request: Request | None) -> None:
    if ag.status not in (AgreementStatus.EXPIRED.value, AgreementStatus.TERMINATED.value) or ag.activated_at is None:
        raise Conflict("Move-out can be recorded only for an ended tenancy")
    if ag.move_out_date is not None:
        raise Conflict("Move-out has already been recorded")
    if is_renewed(db, ag):
        raise Conflict("This agreement was renewed; record the move-out on the latest agreement")
    if move_out < ag.start_date:
        raise DomainError("Move-out date cannot be before the start date")
    _move_out(db, ag, move_out, actor=actor)
    audit(db, actor=actor, action="agreement.move_out", entity_type="agreement", entity_id=ag.id,
          summary=f"Recorded move-out for {ag.agreement_number} on {move_out}", request=request)


def is_renewed(db: Session, ag: RentalAgreement) -> bool:
    return db.execute(select(exists().where(RentalAgreement.renewed_from_id == ag.id))).scalar()


def renew(db: Session, ag: RentalAgreement, data: dict, *, actor: User, request: Request | None) -> RentalAgreement:
    if ag.status not in (AgreementStatus.ACTIVE.value, AgreementStatus.EXPIRED.value):
        raise Conflict("Only active or expired agreements can be renewed")
    if ag.move_out_date is not None:
        raise Conflict("The tenant has moved out; create a new agreement instead")
    if is_renewed(db, ag):
        raise Conflict("This agreement has already been renewed")
    start = data.get("start_date") or ((ag.end_date + timedelta(days=1)) if ag.end_date else date.today())
    end = data["end_date"]
    if end < start:
        raise DomainError("The renewal cannot end before it starts")
    if ag.end_date and start <= ag.start_date:
        raise DomainError("The renewal must start after the current agreement started")
    rent = _amount(data.get("monthly_rent") or ag.monthly_rent, ag.currency)
    old_status = ag.status
    if ag.status == AgreementStatus.ACTIVE.value:
        ag.status = AgreementStatus.EXPIRED.value
        if ag.end_date is None or ag.end_date >= start:
            ag.end_date = start - timedelta(days=1)
        db.flush()
    new = RentalAgreement(
        agreement_number=next_number(db, "AGR", period=start), tenant_id=ag.tenant_id, unit_id=ag.unit_id,
        status=AgreementStatus.ACTIVE.value, start_date=start, end_date=end, monthly_rent=rent,
        currency=ag.currency, due_day=data.get("due_day") or ag.due_day,
        deposit_required=ag.deposit_required, special_conditions=data.get("special_conditions", ag.special_conditions),
        activated_at=datetime.now(UTC), renewed_from_id=ag.id, created_by_id=actor.id, termination_reason="",
    )
    db.add(new)
    try:
        db.flush()
    except IntegrityError as exc:
        raise Conflict("Unit already has another active agreement") from exc
    unit = get_unit(db, ag.unit_id, for_update=True)
    if unit.status != UnitStatus.OCCUPIED.value:
        record_status(db, unit, UnitStatus.OCCUPIED.value, actor=actor,
                      reason=f"Renewed as {new.agreement_number}", agreement_id=new.id)
    audit(db, actor=actor, action="agreement.renewed", entity_type="agreement", entity_id=new.id,
          summary=f"Renewed {ag.agreement_number} ({old_status}) as {new.agreement_number} until {end}",
          request=request)
    return new


def expire_due(db: Session, today: date) -> list[RentalAgreement]:
    """Mark active agreements whose end date has passed as expired.

    The unit stays occupied: the tenant is still in place until a move-out is
    recorded or the agreement is renewed. Staff are notified.
    """
    due = list(db.execute(
        select(RentalAgreement).where(
            RentalAgreement.status == AgreementStatus.ACTIVE.value,
            RentalAgreement.end_date.is_not(None),
            RentalAgreement.end_date < today,
        ).with_for_update(of=RentalAgreement)
    ).unique().scalars())
    for ag in due:
        ag.status = AgreementStatus.EXPIRED.value
        audit(db, actor=None, action="agreement.expired", entity_type="agreement", entity_id=ag.id,
              summary=f"{ag.agreement_number} expired on {ag.end_date}")
        notify(db, permission="agreements.manage", kind="agreement_expired",
               title=f"Agreement {ag.agreement_number} has expired",
               body=f"{ag.tenant.full_name} · unit {ag.unit.code}. Renew it or record the move-out.",
               link=f"/admin/agreements/{ag.id}", dedupe_key=f"agreement-expired-{ag.id}")
    return due


def pending_move_outs_query():
    renewal = aliased(RentalAgreement)
    return select(RentalAgreement).where(
        RentalAgreement.status.in_([AgreementStatus.EXPIRED.value, AgreementStatus.TERMINATED.value]),
        RentalAgreement.activated_at.is_not(None),
        RentalAgreement.move_out_date.is_(None),
        ~exists().where(renewal.renewed_from_id == RentalAgreement.id),
    )


# ---------------------------------------------------------------- deposits ----


def deposit_balance(ag: RentalAgreement) -> Decimal:
    total = Decimal("0")
    for d in ag.deposits:
        total += d.amount if d.kind == DepositKind.RECEIVED.value else -d.amount
    return total


def record_deposit(db: Session, ag: RentalAgreement, data: dict, *, actor: User, request: Request | None) -> DepositTransaction:
    if ag.status == AgreementStatus.DRAFT.value and data["kind"] != DepositKind.RECEIVED.value:
        raise Conflict("Only deposit receipts can be recorded on a draft agreement")
    amount = _amount(data["amount"], ag.currency)
    if data["kind"] != DepositKind.RECEIVED.value and amount > deposit_balance(ag):
        raise Conflict("Cannot refund or deduct more than the deposit currently held")
    tx = DepositTransaction(
        agreement_id=ag.id, kind=data["kind"], amount=amount, currency=ag.currency,
        transaction_date=data["transaction_date"], method=data.get("method") or "",
        reference=data.get("reference") or "", notes=data.get("notes") or "", recorded_by_id=actor.id,
    )
    db.add(tx)
    db.flush()
    db.refresh(ag)
    audit(db, actor=actor, action=f"deposit.{data['kind']}", entity_type="agreement", entity_id=ag.id,
          summary=f"Deposit {data['kind']}: {amount} {ag.currency} on {ag.agreement_number}", request=request)
    return tx
