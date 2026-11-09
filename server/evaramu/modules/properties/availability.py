"""Availability rules — the single place deciding whether a unit can be let.

A unit is publicly listed (and can receive a new tenancy) only when ALL hold:

* it is published and not archived, and its property is not archived;
* its status is ``available`` (occupied, reserved, turnover, maintenance and
  off-market units are excluded);
* no *active* rental agreement exists on it;
* its parent unit (if it is a room inside a rentable apartment/house) is not
  occupied, reserved, in turnover, or under an active agreement;
* none of its child rooms is occupied, reserved, in turnover, or under an
  active agreement (renting a whole house blocks its rooms and vice versa).

The public website query and the agreement activation check both use these
rules, so the frontend never decides availability on its own.
"""

from __future__ import annotations

from sqlalchemy import and_, exists, or_, select
from sqlalchemy.orm import Session, aliased

from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.properties.models import Property, RentalUnit, UnitStatus

#: Statuses of a related unit (parent/child) that block letting this unit.
FAMILY_BLOCKING = (UnitStatus.OCCUPIED.value, UnitStatus.RESERVED.value, UnitStatus.TURNOVER.value)
#: Statuses from which a new tenancy may start on the unit itself.
LETTABLE = (UnitStatus.AVAILABLE.value, UnitStatus.RESERVED.value)


def _has_active_agreement(unit_id_col):
    # Own alias + correlate_except: safe inside queries that already join
    # rental_agreements or properties.
    ra = aliased(RentalAgreement)
    return exists(
        select(ra.id).where(ra.unit_id == unit_id_col, ra.status == AgreementStatus.ACTIVE.value)
        .correlate_except(ra)
    )


def family_free_clause(unit=RentalUnit):
    parent = aliased(RentalUnit)
    child = aliased(RentalUnit)
    parent_blocked = exists(
        select(parent.id).where(
            parent.id == unit.parent_unit_id,
            or_(parent.status.in_(FAMILY_BLOCKING), _has_active_agreement(parent.id)),
        ).correlate_except(parent)
    )
    child_blocked = exists(
        select(child.id).where(
            child.parent_unit_id == unit.id,
            child.is_archived.is_(False),
            or_(child.status.in_(FAMILY_BLOCKING), _has_active_agreement(child.id)),
        ).correlate_except(child)
    )
    return and_(~parent_blocked, ~child_blocked)


def _property_live(unit):
    prop = aliased(Property)
    return exists(
        select(prop.id).where(prop.id == unit.property_id, prop.is_archived.is_(False)).correlate_except(prop)
    )


def public_listing_clause(unit=RentalUnit):
    """SQL condition: the unit may be shown on the public website."""
    return and_(
        unit.is_published.is_(True),
        unit.is_archived.is_(False),
        unit.status == UnitStatus.AVAILABLE.value,
        _property_live(unit),
        ~_has_active_agreement(unit.id),
        family_free_clause(unit),
    )


def is_publicly_listed(db: Session, unit_id: int) -> bool:
    return db.execute(
        select(RentalUnit.id).where(RentalUnit.id == unit_id, public_listing_clause())
    ).first() is not None


def blocked_reason(db: Session, unit: RentalUnit) -> str | None:
    """Human-readable reason a unit cannot take a new tenancy, or None."""
    if unit.is_archived:
        return "Unit is archived"
    if unit.property.is_archived:
        return "Property is archived"
    if unit.status not in LETTABLE:
        return f"Unit status is {unit.status.replace('_', ' ')}"
    if db.execute(select(_has_active_agreement(unit.id))).scalar():
        return "Unit already has an active rental agreement"
    if unit.parent_unit_id:
        parent = db.get(RentalUnit, unit.parent_unit_id)
        if parent is not None and (
            parent.status in FAMILY_BLOCKING
            or db.execute(select(_has_active_agreement(parent.id))).scalar()
        ):
            return f"Parent unit {parent.code} is {parent.status.replace('_', ' ')}"
    for child in db.execute(
        select(RentalUnit).where(RentalUnit.parent_unit_id == unit.id, RentalUnit.is_archived.is_(False))
    ).scalars():
        if child.status in FAMILY_BLOCKING or db.execute(select(_has_active_agreement(child.id))).scalar():
            return f"Room {child.code} inside this unit is {child.status.replace('_', ' ')}"
    return None
