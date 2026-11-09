from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from sqlalchemy import func, select

from evaramu.core.config import get_settings
from evaramu.core.deps import DB, Paging, require
from evaramu.core.errors import Conflict, DomainError, NotFound
from evaramu.core.schemas import Message, Page
from evaramu.core.storage import delete_media, save_image
from evaramu.modules.identity.models import User
from evaramu.modules.properties import availability, service
from evaramu.modules.properties.models import (
    Property,
    PropertyImage,
    PropertyType,
    RentalUnit,
    UnitStatus,
    UnitStatusHistory,
)
from evaramu.modules.properties.schemas import (
    AvailabilitySummary,
    CodeSuggestion,
    HistoryEntry,
    ImageOut,
    ImageUpdate,
    LocationDefaults,
    MarketChange,
    PropertyCreate,
    PropertyDetail,
    PropertyOut,
    PropertyUpdate,
    PublishChange,
    StatusChange,
    UnitCounts,
    UnitCreate,
    UnitDetail,
    UnitOut,
    UnitUpdate,
)
from evaramu.modules.system.models import AppSetting, AuditLog
from evaramu.modules.system.services import audit, diff

router = APIRouter(tags=["properties"])

View = Depends(require("properties.view"))
Manager = Annotated[User, Depends(require("properties.manage"))]


# ------------------------------------------------------------- properties ----


@router.get("/properties", response_model=Page[PropertyOut], dependencies=[View])
def list_properties(
    db: DB, paging: Paging,
    search: str | None = None,
    property_type: PropertyType | None = None,
    district: str | None = None,
    archived: bool = False,
    multi_unit: bool | None = Query(default=None, description="Only properties with more than one unit"),
):
    stmt = select(Property).where(Property.is_archived.is_(archived))
    if property_type:
        stmt = stmt.where(Property.property_type == property_type.value)
    if district:
        stmt = stmt.where(Property.district.ilike(district))
    if multi_unit:
        sub = (select(RentalUnit.property_id).where(RentalUnit.is_archived.is_(False))
               .group_by(RentalUnit.property_id).having(func.count() > 1))
        stmt = stmt.where(Property.id.in_(sub))
    stmt = service.search_filter(stmt, Property, search, Property.name, Property.code,
                                 Property.district, Property.sector, Property.address)
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = list(db.execute(stmt.order_by(Property.code).offset(paging.offset).limit(paging.page_size)).scalars())
    return Page(items=service.properties_out(db, rows), total=total, page=paging.page, page_size=paging.page_size)


@router.post("/properties", response_model=PropertyDetail, status_code=201)
def create_property(body: PropertyCreate, request: Request, db: DB, actor: Manager):
    prop = service.create_property(db, body, actor=actor, request=request)
    db.commit()
    db.refresh(prop)
    return service.property_detail(db, prop)


@router.get("/properties/location-defaults", response_model=LocationDefaults, dependencies=[View])
def location_defaults(db: DB):
    """Pre-fills a new property's location (Settings → Agreement documents)."""
    rows = dict(db.execute(select(AppSetting.key, AppSetting.value).where(AppSetting.key.like("landlord.%"))).all())
    pick = lambda k: str(rows.get(f"landlord.default_{k}") or "")  # noqa: E731
    return LocationDefaults(city=str(rows.get("landlord.city") or "Kigali"), district=pick("district"),
                            sector=pick("sector"), cell=pick("cell"), village=pick("village"))


@router.get("/properties/{property_id}", response_model=PropertyDetail, dependencies=[View])
def get_property(property_id: int, db: DB):
    return service.property_detail(db, service.get_property(db, property_id))


@router.patch("/properties/{property_id}", response_model=PropertyDetail)
def update_property(property_id: int, body: PropertyUpdate, request: Request, db: DB, actor: Manager):
    prop = service.get_property(db, property_id)
    if prop.is_archived:
        raise Conflict("Archived properties cannot be edited")
    if body.usage is not None and body.usage.value != prop.usage:
        service.check_usage_change(prop, body.usage.value)
    changes = diff(prop, {k: v.value if hasattr(v, "value") else v
                          for k, v in body.model_dump(exclude_unset=True).items() if v is not None})
    audit(db, actor=actor, action="property.updated", entity_type="property", entity_id=prop.id,
          summary=f"Updated property {prop.code}", changes=changes, request=request)
    db.commit()
    return service.property_detail(db, prop)


@router.post("/properties/{property_id}/archive", response_model=PropertyDetail)
def archive_property(property_id: int, request: Request, db: DB, actor: Manager):
    prop = service.get_property(db, property_id)
    service.archive_property(db, prop, actor=actor, request=request)
    db.commit()
    return service.property_detail(db, prop)


@router.get("/properties/{property_id}/history", response_model=list[HistoryEntry], dependencies=[View])
def property_history(property_id: int, db: DB):
    prop = service.get_property(db, property_id)
    unit_codes = dict(db.execute(select(RentalUnit.id, RentalUnit.code).where(RentalUnit.property_id == prop.id)).all())
    entries: list[HistoryEntry] = []
    logs = db.execute(
        select(AuditLog).where(
            ((AuditLog.entity_type == "property") & (AuditLog.entity_id == str(prop.id)))
            | ((AuditLog.entity_type == "unit") & (AuditLog.entity_id.in_([str(i) for i in unit_codes])))
        ).order_by(AuditLog.created_at.desc()).limit(300)
    ).unique().scalars()
    for log in logs:
        entries.append(HistoryEntry(
            at=log.created_at, kind=log.action, summary=log.summary,
            actor=log.actor.full_name if log.actor else None,
            unit_code=unit_codes.get(int(log.entity_id)) if log.entity_type == "unit" and log.entity_id else None,
        ))
    for h in db.execute(
        select(UnitStatusHistory).where(UnitStatusHistory.unit_id.in_(list(unit_codes)),
                                        UnitStatusHistory.agreement_id.is_not(None))
    ).scalars():
        entries.append(HistoryEntry(at=h.changed_at, kind="unit.tenancy_status",
                                    summary=f"{unit_codes[h.unit_id]}: {h.from_status} → {h.to_status}. {h.reason}",
                                    unit_code=unit_codes[h.unit_id]))
    entries.sort(key=lambda e: e.at, reverse=True)
    return entries


# ---------------------------------------------------------------- images ----


@router.post("/properties/{property_id}/images", response_model=list[ImageOut], status_code=201)
def upload_images(
    property_id: int, request: Request, db: DB, actor: Manager,
    files: Annotated[list[UploadFile], File(description="JPEG, PNG or WebP photographs")],
    unit_id: Annotated[int | None, Form()] = None,
):
    prop = service.get_property(db, property_id)
    if unit_id is not None:
        unit = service.get_unit(db, unit_id)
        if unit.property_id != prop.id:
            raise DomainError("The unit does not belong to this property")
    if not files or len(files) > 20:
        raise DomainError("Upload between 1 and 20 photographs at a time")
    limit = get_settings().MAX_UPLOAD_MB * 1024 * 1024
    next_order = (db.execute(
        select(func.max(PropertyImage.sort_order)).where(
            PropertyImage.property_id == prop.id,
            PropertyImage.unit_id.is_(None) if unit_id is None else PropertyImage.unit_id == unit_id,
        )
    ).scalar() or 0) + 1
    created: list[PropertyImage] = []
    stored_keys: list[str] = []
    try:
        for f in files:
            stored = save_image(f.file.read(limit + 1))
            stored_keys += [stored.storage_key, stored.thumb_key]
            img = PropertyImage(
                property_id=prop.id, unit_id=unit_id, storage_key=stored.storage_key,
                thumb_key=stored.thumb_key, original_name=(f.filename or "")[:255],
                width=stored.width, height=stored.height, size_bytes=stored.size_bytes,
                sort_order=next_order, caption="", uploaded_by_id=actor.id,
            )
            next_order += 1
            db.add(img)
            created.append(img)
        db.flush()
        audit(db, actor=actor, action="property.images_uploaded", entity_type="property", entity_id=prop.id,
              summary=f"Uploaded {len(created)} photo(s) to {prop.code}", request=request)
        db.commit()
    except Exception:
        db.rollback()
        delete_media(*stored_keys)
        raise
    return [service.image_out(i) for i in created]


@router.patch("/images/{image_id}", response_model=ImageOut)
def update_image(image_id: int, body: ImageUpdate, db: DB, actor: Manager):
    img = db.get(PropertyImage, image_id)
    if img is None:
        raise NotFound("Photo not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(img, k, v)
    db.commit()
    return service.image_out(img)


@router.delete("/images/{image_id}", response_model=Message)
def delete_image(image_id: int, request: Request, db: DB, actor: Manager):
    img = db.get(PropertyImage, image_id)
    if img is None:
        raise NotFound("Photo not found")
    keys = (img.storage_key, img.thumb_key)
    audit(db, actor=actor, action="property.image_deleted", entity_type="property", entity_id=img.property_id,
          summary="Removed a photo", request=request)
    db.delete(img)
    db.commit()
    delete_media(*keys)
    return Message(detail="Photo removed")


# ----------------------------------------------------------------- units ----


@router.get("/units", response_model=Page[UnitOut], dependencies=[View])
def list_units(
    db: DB, paging: Paging,
    search: str | None = None,
    status: UnitStatus | None = None,
    property_id: int | None = None,
    currency: str | None = None,
    published: bool | None = None,
    listed: bool | None = Query(default=None, description="Only units currently on the public website"),
    archived: bool = False,
):
    stmt = select(RentalUnit).join(Property, Property.id == RentalUnit.property_id).where(
        RentalUnit.is_archived.is_(archived))
    if status:
        stmt = stmt.where(RentalUnit.status == status.value)
    if property_id:
        stmt = stmt.where(RentalUnit.property_id == property_id)
    if currency:
        stmt = stmt.where(RentalUnit.currency == currency.upper())
    if published is not None:
        stmt = stmt.where(RentalUnit.is_published.is_(published))
    if listed is not None:
        clause = availability.public_listing_clause()
        stmt = stmt.where(clause if listed else ~clause)
    stmt = service.search_filter(stmt, RentalUnit, search, RentalUnit.code, RentalUnit.name,
                                 Property.name, Property.code, Property.district)
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = list(db.execute(stmt.order_by(RentalUnit.code).offset(paging.offset).limit(paging.page_size)).unique().scalars())
    return Page(items=service.units_out(db, rows), total=total, page=paging.page, page_size=paging.page_size)


@router.post("/units", response_model=UnitDetail, status_code=201)
def create_unit(body: UnitCreate, request: Request, db: DB, actor: Manager):
    unit = service.create_unit_from_schema(db, body, actor=actor, request=request)
    db.commit()
    db.refresh(unit)
    return service.unit_detail(db, unit)


@router.get("/units/{unit_id}", response_model=UnitDetail, dependencies=[View])
def get_unit(unit_id: int, db: DB):
    return service.unit_detail(db, service.get_unit(db, unit_id))


@router.patch("/units/{unit_id}", response_model=UnitDetail)
def update_unit(unit_id: int, body: UnitUpdate, request: Request, db: DB, actor: Manager):
    unit = service.get_unit(db, unit_id, for_update=True)
    if unit.is_archived:
        raise Conflict("Archived units cannot be edited")
    data = {k: (v.value if hasattr(v, "value") else v) for k, v in body.model_dump(exclude_unset=True).items()}
    if "parent_unit_id" in data and data["parent_unit_id"] is not None:
        parent = service.get_unit(db, data["parent_unit_id"])
        if parent.property_id != unit.property_id or parent.id == unit.id or parent.parent_unit_id is not None:
            raise DomainError("Parent must be a top-level unit of the same property")
    data = {k: v for k, v in data.items() if v is not None or k in ("size_sqm", "parent_unit_id")}
    new_type = data.get("unit_type", unit.unit_type)
    if new_type != unit.unit_type:
        service.check_unit_fits(unit.property.usage, new_type)
    service.normalise_unit_fields(data, new_type)
    from evaramu.core.money import validate_amount
    try:
        validate_amount(data.get("monthly_rent", unit.monthly_rent), data.get("currency", unit.currency), allow_zero=True)
    except ValueError as exc:
        raise DomainError(str(exc)) from exc
    changes = diff(unit, data)
    audit(db, actor=actor, action="unit.updated", entity_type="unit", entity_id=unit.id,
          summary=f"Updated unit {unit.code}", changes=changes, request=request)
    db.commit()
    return service.unit_detail(db, unit)


@router.post("/units/{unit_id}/status", response_model=UnitDetail)
def change_unit_status(unit_id: int, body: StatusChange, request: Request, db: DB, actor: Manager):
    unit = service.get_unit(db, unit_id, for_update=True)
    service.change_status(db, unit, body.status.value, body.reason, actor=actor, request=request)
    db.commit()
    return service.unit_detail(db, unit)


@router.post("/units/{unit_id}/publish", response_model=UnitDetail)
def publish_unit(unit_id: int, body: PublishChange, request: Request, db: DB, actor: Manager):
    unit = service.get_unit(db, unit_id, for_update=True)
    if unit.is_archived and body.is_published:
        raise Conflict("Archived units cannot be published")
    if body.is_published and unit.monthly_rent <= 0:
        raise DomainError("Set a monthly rent before publishing the unit")
    if unit.is_published != body.is_published:
        unit.is_published = body.is_published
        audit(db, actor=actor, action="unit.published" if body.is_published else "unit.unpublished",
              entity_type="unit", entity_id=unit.id,
              summary=f"{'Published' if body.is_published else 'Unpublished'} unit {unit.code}", request=request)
    db.commit()
    return service.unit_detail(db, unit)


@router.post("/units/{unit_id}/market", response_model=UnitDetail)
def set_unit_market(unit_id: int, body: MarketChange, request: Request, db: DB, actor: Manager):
    """One step: available + published on the website, or off market + unpublished."""
    unit = service.get_unit(db, unit_id, for_update=True)
    if unit.is_archived:
        raise Conflict("Archived units cannot be put on the market")
    if body.on_market:
        if unit.status == UnitStatus.TURNOVER.value:
            raise DomainError("Mark the unit ready to let first (inspection note required)")
        if unit.monthly_rent <= 0:
            raise DomainError("Set a monthly rent before putting the unit on the market")
        if unit.status != UnitStatus.AVAILABLE.value:
            service.change_status(db, unit, UnitStatus.AVAILABLE.value, "Put on market", actor=actor, request=request)
    elif unit.status == UnitStatus.AVAILABLE.value:
        service.change_status(db, unit, UnitStatus.OFF_MARKET.value, "Taken off market", actor=actor, request=request)
    if unit.is_published != body.on_market:
        unit.is_published = body.on_market
        audit(db, actor=actor, action="unit.published" if body.on_market else "unit.unpublished",
              entity_type="unit", entity_id=unit.id,
              summary=f"{'Published' if body.on_market else 'Unpublished'} unit {unit.code}", request=request)
    db.commit()
    return service.unit_detail(db, unit)


@router.post("/units/{unit_id}/archive", response_model=UnitDetail)
def archive_unit(unit_id: int, request: Request, db: DB, actor: Manager):
    unit = service.get_unit(db, unit_id, for_update=True)
    service.archive_unit(db, unit, actor=actor, request=request)
    db.commit()
    return service.unit_detail(db, unit)


@router.get("/units/{unit_id}/history", response_model=list[HistoryEntry], dependencies=[View])
def unit_history(unit_id: int, db: DB):
    unit = service.get_unit(db, unit_id)
    entries = [
        HistoryEntry(at=h.changed_at, kind="status",
                     summary=f"{h.from_status or '—'} → {h.to_status}" + (f": {h.reason}" if h.reason else ""),
                     unit_code=unit.code)
        for h in db.execute(select(UnitStatusHistory).where(UnitStatusHistory.unit_id == unit.id)).scalars()
    ]
    for log in db.execute(select(AuditLog).where(AuditLog.entity_type == "unit", AuditLog.entity_id == str(unit.id),
                                                 AuditLog.action != "unit.status_changed")).unique().scalars():
        entries.append(HistoryEntry(at=log.created_at, kind=log.action, summary=log.summary,
                                    actor=log.actor.full_name if log.actor else None, unit_code=unit.code))
    entries.sort(key=lambda e: e.at, reverse=True)
    return entries


@router.get("/codes/suggest", response_model=CodeSuggestion, dependencies=[View])
def suggest_code(db: DB, prefix: str = Query(min_length=1, max_length=4),
                 kind: str = Query(default="unit", pattern="^(unit|property)$")):
    return CodeSuggestion(code=service.suggest_code(db, kind, prefix))


@router.get("/availability", response_model=AvailabilitySummary, dependencies=[View])
def availability_summary(db: DB):
    per_property = service.unit_counts(db)
    totals = UnitCounts()
    for c in per_property.values():
        for field in UnitCounts.model_fields:
            setattr(totals, field, getattr(totals, field) + getattr(c, field))
    listed = db.execute(select(func.count()).select_from(RentalUnit).where(availability.public_listing_clause())).scalar_one()
    props = {p.id: p for p in db.execute(select(Property).where(Property.id.in_(list(per_property)))).scalars()}
    by_property = sorted(
        [{"property_id": pid, "code": props[pid].code, "name": props[pid].name, **c.model_dump()}
         for pid, c in per_property.items() if pid in props and not props[pid].is_archived],
        key=lambda r: r["code"],
    )
    return AvailabilitySummary(counts=totals, publicly_listed=listed, by_property=by_property)
