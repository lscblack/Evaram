from __future__ import annotations

import re
from datetime import UTC, datetime

from fastapi import Request
from sqlalchemy import exists, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from evaramu.core.errors import Conflict, DomainError, NotFound
from evaramu.core.storage import media_url
from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.identity.models import User
from evaramu.modules.properties import availability
from evaramu.modules.properties.models import (
    Property,
    PropertyImage,
    PropertyUsage,
    RentalUnit,
    ReservedCode,
    UnitStatus,
    UnitStatusHistory,
    UnitType,
)
from evaramu.modules.properties.schemas import (
    ImageOut,
    OccupancyBrief,
    PropertyBrief,
    PropertyCreate,
    PropertyDetail,
    PropertyOut,
    UnitCounts,
    UnitCreate,
    UnitDetail,
    UnitOut,
)
from evaramu.modules.system.services import audit

#: Statuses an operator may set by hand. "occupied" and "turnover" are only
#: reached through the tenancy workflow so occupancy can never be faked.
MANUAL_STATUSES = {
    UnitStatus.AVAILABLE.value,
    UnitStatus.RESERVED.value,
    UnitStatus.MAINTENANCE.value,
    UnitStatus.OFF_MARKET.value,
}


# ------------------------------------------------------------------ codes ----


def reserve_code(db: Session, entity_type: str, code: str, entity_id: int) -> None:
    try:
        with db.begin_nested():
            db.add(ReservedCode(entity_type=entity_type, code=code, entity_id=entity_id))
            db.flush()
    except IntegrityError as exc:
        raise Conflict(
            f"Code {code} has already been used and cannot be reassigned", code="code_taken"
        ) from exc


def ensure_code_free(db: Session, entity_type: str, code: str) -> None:
    if db.get(ReservedCode, (entity_type, code)) is not None:
        raise Conflict(f"Code {code} has already been used and cannot be reassigned", code="code_taken")


def suggest_code(db: Session, entity_type: str, prefix: str) -> str:
    prefix = re.sub(r"[^A-Z]", "", prefix.upper())[:4] or "U"
    codes = db.execute(
        select(ReservedCode.code).where(
            ReservedCode.entity_type == entity_type, ReservedCode.code.like(f"{prefix}%")
        )
    ).scalars()
    highest = 100
    for c in codes:
        m = re.fullmatch(rf"{prefix}(\d+)", c)
        if m:
            highest = max(highest, int(m.group(1)))
    return f"{prefix}{highest + 1}"


# --------------------------------------------------------------- loaders ----


def get_property(db: Session, property_id: int) -> Property:
    prop = db.get(Property, property_id)
    if prop is None:
        raise NotFound("Property not found")
    return prop


def get_unit(db: Session, unit_id: int, *, for_update: bool = False) -> RentalUnit:
    stmt = select(RentalUnit).where(RentalUnit.id == unit_id)
    if for_update:
        stmt = stmt.with_for_update(of=RentalUnit)
    unit = db.execute(stmt).unique().scalar_one_or_none()
    if unit is None:
        raise NotFound("Rental unit not found")
    return unit


# ------------------------------------------------------------ serialisers ----


def image_out(img: PropertyImage) -> ImageOut:
    return ImageOut(
        id=img.id, unit_id=img.unit_id, url=media_url(img.storage_key) or "",
        thumb_url=media_url(img.thumb_key) or "", width=img.width, height=img.height,
        caption=img.caption, sort_order=img.sort_order,
    )


def _active_agreements(db: Session, unit_ids: list[int]) -> dict[int, RentalAgreement]:
    if not unit_ids:
        return {}
    rows = db.execute(
        select(RentalAgreement).where(
            RentalAgreement.unit_id.in_(unit_ids),
            RentalAgreement.status == AgreementStatus.ACTIVE.value,
        )
    ).unique().scalars()
    return {a.unit_id: a for a in rows}


def _cover_urls(db: Session, unit_ids: list[int], property_ids: list[int]) -> tuple[dict, dict]:
    unit_cover: dict[int, str] = {}
    prop_cover: dict[int, str] = {}
    if unit_ids:
        for img in db.execute(
            select(PropertyImage).where(PropertyImage.unit_id.in_(unit_ids))
            .order_by(PropertyImage.sort_order, PropertyImage.id)
        ).scalars():
            unit_cover.setdefault(img.unit_id, media_url(img.thumb_key))
    if property_ids:
        for img in db.execute(
            select(PropertyImage).where(PropertyImage.property_id.in_(property_ids), PropertyImage.unit_id.is_(None))
            .order_by(PropertyImage.sort_order, PropertyImage.id)
        ).scalars():
            prop_cover.setdefault(img.property_id, media_url(img.thumb_key))
    return unit_cover, prop_cover


def units_out(db: Session, units: list[RentalUnit], *, include_occupancy: bool = True) -> list[UnitOut]:
    ids = [u.id for u in units]
    active = _active_agreements(db, ids) if include_occupancy else {}
    listed = set(
        db.execute(
            select(RentalUnit.id).where(RentalUnit.id.in_(ids), availability.public_listing_clause())
        ).scalars()
    ) if ids else set()
    unit_cover, prop_cover = _cover_urls(db, ids, list({u.property_id for u in units}))
    parent_codes = dict(
        db.execute(
            select(RentalUnit.id, RentalUnit.code).where(
                RentalUnit.id.in_({u.parent_unit_id for u in units if u.parent_unit_id})
            )
        ).all()
    ) if any(u.parent_unit_id for u in units) else {}
    out = []
    for u in units:
        ag = active.get(u.id)
        blocked = None
        if u.status == UnitStatus.AVAILABLE.value and u.id not in listed and not u.is_archived:
            blocked = availability.blocked_reason(db, u) or ("Not published" if not u.is_published else None)
        out.append(
            UnitOut(
                id=u.id, code=u.code, name=u.name, unit_type=u.unit_type,
                property=PropertyBrief.model_validate(u.property), parent_unit_id=u.parent_unit_id,
                parent_code=parent_codes.get(u.parent_unit_id), bedrooms=u.bedrooms,
                bathrooms=u.bathrooms, toilet=u.toilet, size_sqm=u.size_sqm, floor=u.floor, furnished=u.furnished,
                monthly_rent=u.monthly_rent, currency=u.currency, description=u.description,
                amenities=u.amenities or [], status=u.status, is_published=u.is_published,
                is_featured=u.is_featured, is_archived=u.is_archived,
                is_publicly_listed=u.id in listed, blocked_reason=blocked,
                occupancy=OccupancyBrief(
                    agreement_id=ag.id, agreement_number=ag.agreement_number, tenant_id=ag.tenant_id,
                    tenant_name=ag.tenant.full_name, start_date=ag.start_date, end_date=ag.end_date,
                ) if ag else None,
                cover_url=unit_cover.get(u.id) or prop_cover.get(u.property_id),
                created_at=u.created_at,
            )
        )
    return out


def unit_detail(db: Session, unit: RentalUnit) -> UnitDetail:
    base = units_out(db, [unit])[0]
    children = [c for c in unit.children if not c.is_archived]
    images = [image_out(i) for i in unit.images]
    if not images:
        images = [image_out(i) for i in unit.property.images]
    return UnitDetail(**base.model_dump(), images=images, children=units_out(db, children))


def unit_counts(db: Session, property_ids: list[int] | None = None) -> dict[int | None, UnitCounts]:
    stmt = (
        select(RentalUnit.property_id, RentalUnit.status, func.count())
        .where(RentalUnit.is_archived.is_(False))
        .group_by(RentalUnit.property_id, RentalUnit.status)
    )
    if property_ids is not None:
        stmt = stmt.where(RentalUnit.property_id.in_(property_ids))
    result: dict[int | None, UnitCounts] = {}
    for pid, status, n in db.execute(stmt).all():
        c = result.setdefault(pid, UnitCounts())
        setattr(c, status, getattr(c, status) + n)
        c.total += n
    return result


def properties_out(db: Session, props: list[Property]) -> list[PropertyOut]:
    counts = unit_counts(db, [p.id for p in props])
    _, prop_cover = _cover_urls(db, [], [p.id for p in props])
    out = []
    for p in props:
        po = PropertyOut.model_validate(p)
        po.unit_counts = counts.get(p.id, UnitCounts())
        po.cover_url = prop_cover.get(p.id)
        out.append(po)
    return out


def property_detail(db: Session, prop: Property) -> PropertyDetail:
    base = properties_out(db, [prop])[0]
    units = [u for u in prop.units if not u.is_archived]
    all_images = db.execute(
        select(PropertyImage).where(PropertyImage.property_id == prop.id)
        .order_by(PropertyImage.unit_id.nulls_first(), PropertyImage.sort_order, PropertyImage.id)
    ).scalars()
    return PropertyDetail(**base.model_dump(), units=units_out(db, units),
                          images=[image_out(i) for i in all_images])


# -------------------------------------------------------------- mutations ----


def record_status(
    db: Session, unit: RentalUnit, to_status: str, *, actor: User | None, reason: str = "",
    agreement_id: int | None = None,
) -> None:
    if unit.status == to_status:
        return
    db.add(UnitStatusHistory(
        unit_id=unit.id, from_status=unit.status, to_status=to_status, reason=reason[:255],
        agreement_id=agreement_id, changed_by_id=actor.id if actor else None,
    ))
    unit.status = to_status
    if to_status != UnitStatus.AVAILABLE.value and unit.is_featured and to_status == UnitStatus.OCCUPIED.value:
        unit.is_featured = False


SHOP = UnitType.COMMERCIAL.value


def check_unit_fits(usage: str, unit_type: str) -> None:
    """Commercial properties hold shop rooms only; residential ones hold no shops."""
    if usage == PropertyUsage.COMMERCIAL.value and unit_type != SHOP:
        raise DomainError("A commercial property only has shop rooms. Choose \"Shop room\" as the unit type, "
                          "or change the property's use to mixed.")
    if usage == PropertyUsage.RESIDENTIAL.value and unit_type == SHOP:
        raise DomainError("Shop rooms belong in a commercial or mixed-use property. Change the property's use first.")


def normalise_unit_fields(data: dict, unit_type: str) -> dict:
    """Shop rooms have no bedrooms or bathrooms; the toilet field says what they have."""
    if unit_type == SHOP:
        data["bedrooms"] = 0
        data["bathrooms"] = 0
    return data


def check_usage_change(prop: Property, usage: str) -> None:
    clash = [u.code for u in prop.units if not u.is_archived and (
        (usage == PropertyUsage.COMMERCIAL.value and u.unit_type != SHOP)
        or (usage == PropertyUsage.RESIDENTIAL.value and u.unit_type == SHOP)
    )]
    if clash:
        kind = "homes" if usage == PropertyUsage.COMMERCIAL.value else "shop rooms"
        raise DomainError(f"This property still has {kind} ({', '.join(clash[:6])}"
                          f"{'…' if len(clash) > 6 else ''}). Choose \"Mixed\" or change those units first.")


def create_unit(db: Session, data: dict, *, prop: Property, actor: User, request: Request | None) -> RentalUnit:
    unit_type = str(getattr(data.get("unit_type"), "value", data.get("unit_type")))
    check_unit_fits(prop.usage, unit_type)
    normalise_unit_fields(data, unit_type)
    code = data.pop("code")
    ensure_code_free(db, "unit", code)
    parent_id = data.get("parent_unit_id")
    if parent_id:
        parent = get_unit(db, parent_id)
        if parent.property_id != prop.id:
            raise DomainError("A room's parent unit must belong to the same property")
        if parent.parent_unit_id is not None:
            raise DomainError("Rooms can only be nested one level deep")
    unit = RentalUnit(
        property_id=prop.id, code=code, status=UnitStatus.OFF_MARKET.value,
        is_published=False, is_archived=False, **data,
    )
    db.add(unit)
    db.flush()
    reserve_code(db, "unit", code, unit.id)
    db.add(UnitStatusHistory(unit_id=unit.id, from_status=None, to_status=unit.status,
                             reason="Unit created", changed_by_id=actor.id))
    audit(db, actor=actor, action="unit.created", entity_type="unit", entity_id=unit.id,
          summary=f"Created unit {code} in {prop.code}", request=request)
    return unit


def create_property(db: Session, body: PropertyCreate, *, actor: User, request: Request | None) -> Property:
    ensure_code_free(db, "property", body.code)
    data = body.model_dump(exclude={"standalone_unit", "code"})
    prop = Property(code=body.code, created_by_id=actor.id, is_archived=False, **data)
    db.add(prop)
    db.flush()
    reserve_code(db, "property", body.code, prop.id)
    audit(db, actor=actor, action="property.created", entity_type="property", entity_id=prop.id,
          summary=f"Created property {prop.code} — {prop.name}", request=request)
    if body.standalone_unit is not None:
        create_unit(db, body.standalone_unit.model_dump(), prop=prop, actor=actor, request=request)
    return prop


def create_unit_from_schema(db: Session, body: UnitCreate, *, actor: User, request: Request | None) -> RentalUnit:
    prop = get_property(db, body.property_id)
    if prop.is_archived:
        raise Conflict("Cannot add units to an archived property")
    return create_unit(db, body.model_dump(exclude={"property_id"}), prop=prop, actor=actor, request=request)


def change_status(db: Session, unit: RentalUnit, status: str, reason: str, *, actor: User,
                  request: Request | None) -> None:
    if status not in MANUAL_STATUSES:
        raise DomainError("Occupied and turnover statuses are set by the tenancy workflow")
    if unit.is_archived:
        raise Conflict("Archived units cannot change status")
    active = _active_agreements(db, [unit.id]).get(unit.id)
    if active is not None or unit.status == UnitStatus.OCCUPIED.value:
        raise Conflict("This unit has a tenant in place. End the tenancy and record the move-out first.")
    if unit.status == UnitStatus.TURNOVER.value and status == UnitStatus.AVAILABLE.value and not reason.strip():
        raise DomainError("Confirm the unit was inspected and is ready to let (add a note)")
    if status == UnitStatus.AVAILABLE.value:
        # A still-unvacated ended tenancy keeps the unit out of the market.
        renewal = aliased(RentalAgreement)
        pending = db.execute(
            select(RentalAgreement.agreement_number).where(
                RentalAgreement.unit_id == unit.id,
                RentalAgreement.status.in_([AgreementStatus.EXPIRED.value, AgreementStatus.TERMINATED.value]),
                RentalAgreement.move_out_date.is_(None),
                RentalAgreement.activated_at.is_not(None),
                ~exists().where(renewal.renewed_from_id == RentalAgreement.id),
            )
        ).scalars().first()
        if pending:
            raise Conflict(f"Record the tenant's move-out on agreement {pending} before making the unit available")
    before = unit.status
    record_status(db, unit, status, actor=actor, reason=reason)
    audit(db, actor=actor, action="unit.status_changed", entity_type="unit", entity_id=unit.id,
          summary=f"{unit.code}: {before} → {status}" + (f" ({reason})" if reason else ""),
          changes={"status": {"from": before, "to": status}}, request=request)


def archive_unit(db: Session, unit: RentalUnit, *, actor: User, request: Request | None) -> None:
    if unit.is_archived:
        return
    open_agreements = db.execute(
        select(func.count()).select_from(RentalAgreement).where(
            RentalAgreement.unit_id == unit.id,
            RentalAgreement.status.in_([AgreementStatus.ACTIVE.value, AgreementStatus.DRAFT.value]),
        )
    ).scalar_one()
    if open_agreements or unit.status in (UnitStatus.OCCUPIED.value, UnitStatus.TURNOVER.value):
        raise Conflict("Units with an active/draft agreement or awaiting move-out cannot be archived")
    if db.execute(select(func.count()).select_from(RentalUnit).where(
        RentalUnit.parent_unit_id == unit.id, RentalUnit.is_archived.is_(False)
    )).scalar_one():
        raise Conflict("Archive the rooms inside this unit first")
    record_status(db, unit, UnitStatus.OFF_MARKET.value, actor=actor, reason="Archived")
    unit.is_archived = True
    unit.is_published = False
    unit.is_featured = False
    unit.archived_at = datetime.now(UTC)
    audit(db, actor=actor, action="unit.archived", entity_type="unit", entity_id=unit.id,
          summary=f"Archived unit {unit.code}", request=request)


def archive_property(db: Session, prop: Property, *, actor: User, request: Request | None) -> None:
    if prop.is_archived:
        return
    units = sorted([u for u in prop.units if not u.is_archived], key=lambda u: u.parent_unit_id is None)
    for unit in units:  # rooms first, then their parents
        archive_unit(db, unit, actor=actor, request=request)
    prop.is_archived = True
    prop.archived_at = datetime.now(UTC)
    audit(db, actor=actor, action="property.archived", entity_type="property", entity_id=prop.id,
          summary=f"Archived property {prop.code}", request=request)


def search_filter(stmt, model, search: str | None, *cols):
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(*[c.ilike(term) for c in cols]))
    return stmt
