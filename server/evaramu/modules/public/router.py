"""Public website API. No authentication; never returns tenant or agreement data.

Every listing query goes through ``availability.public_listing_clause`` so
occupied, reserved, turnover, maintenance, off-market, unpublished or
archived units can never appear, whatever the client asks for.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func, select

from evaramu.core.deps import DB
from evaramu.core.errors import DomainError, NotFound
from evaramu.core.money import Currency
from evaramu.core.ratelimit import rate_limit
from evaramu.core.schemas import Message, MoneyOut, Page
from evaramu.core.storage import media_url
from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.properties import availability
from evaramu.modules.properties.models import (
    Property,
    PropertyImage,
    RentalUnit,
    UnitStatus,
    UnitType,
)
from evaramu.modules.system.models import AppSetting, Inquiry, InquiryStatus
from evaramu.modules.system.services import notify
from evaramu.modules.tenants.schemas import _phone

router = APIRouter(prefix="/public", tags=["public"])


class PublicImage(BaseModel):
    url: str
    thumb_url: str
    caption: str
    width: int
    height: int


class PublicListing(BaseModel):
    code: str
    name: str
    unit_type: str
    property_name: str
    property_type: str
    city: str
    district: str
    sector: str
    location: str
    monthly_rent: MoneyOut
    currency: str
    bedrooms: int
    bathrooms: int
    #: "private" (own toilet) or "shared".
    toilet: str = "private"
    size_sqm: Decimal | None
    furnished: bool
    is_featured: bool
    availability: str = "available"
    cover_url: str | None
    #: Full-size version of the cover photo (cover_url is the thumbnail).
    cover_image_url: str | None = None
    image_count: int


class PublicListingDetail(PublicListing):
    description: str
    property_description: str
    amenities: list[str]
    address_area: str
    images: list[PublicImage]


def _images(db, units: list[RentalUnit]) -> dict[int, list[PropertyImage]]:
    """Unit photos, falling back to the property's own photos."""
    if not units:
        return {}
    unit_ids = [u.id for u in units]
    prop_ids = list({u.property_id for u in units})
    by_unit: dict[int, list[PropertyImage]] = {}
    by_prop: dict[int, list[PropertyImage]] = {}
    for img in db.execute(select(PropertyImage).where(
        (PropertyImage.unit_id.in_(unit_ids)) | (PropertyImage.property_id.in_(prop_ids) & PropertyImage.unit_id.is_(None))
    ).order_by(PropertyImage.sort_order, PropertyImage.id)).scalars():
        if img.unit_id:
            by_unit.setdefault(img.unit_id, []).append(img)
        else:
            by_prop.setdefault(img.property_id, []).append(img)
    return {u.id: by_unit.get(u.id) or by_prop.get(u.property_id, []) for u in units}


def _listing(u: RentalUnit, imgs: list[PropertyImage]) -> dict:
    p = u.property
    return dict(
        code=u.code, name=u.name, unit_type=u.unit_type, property_name=p.name, property_type=p.property_type,
        city=p.city, district=p.district, sector=p.sector, location=p.location_label,
        monthly_rent=u.monthly_rent, currency=u.currency, bedrooms=u.bedrooms, bathrooms=u.bathrooms,
        toilet=u.toilet, size_sqm=u.size_sqm, furnished=u.furnished, is_featured=u.is_featured,
        cover_url=media_url(imgs[0].thumb_key) if imgs else None,
        cover_image_url=media_url(imgs[0].storage_key) if imgs else None, image_count=len(imgs),
    )


@router.get("/listings", response_model=Page[PublicListing])
def listings(
    db: DB,
    location: Annotated[str | None, Query(max_length=80)] = None,
    unit_type: UnitType | None = None,
    min_rent: Annotated[Decimal | None, Query(ge=0)] = None,
    max_rent: Annotated[Decimal | None, Query(ge=0)] = None,
    currency: Currency | None = None,
    bedrooms: Annotated[int | None, Query(ge=0, le=20, description="Minimum bedrooms")] = None,
    featured: bool | None = None,
    sort: Literal["newest", "price_asc", "price_desc"] = "newest",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=48)] = 12,
):
    stmt = (select(RentalUnit).join(Property, Property.id == RentalUnit.property_id)
            .where(availability.public_listing_clause()))
    if location:
        term = f"%{location.strip()}%"
        stmt = stmt.where(Property.district.ilike(term) | Property.sector.ilike(term) | Property.city.ilike(term))
    if unit_type:
        stmt = stmt.where(RentalUnit.unit_type == unit_type.value)
    if (min_rent is not None or max_rent is not None) and currency is None:
        raise DomainError("Choose a currency to filter by rent")
    if currency:
        stmt = stmt.where(RentalUnit.currency == currency.value)
    if min_rent is not None:
        stmt = stmt.where(RentalUnit.monthly_rent >= min_rent)
    if max_rent is not None:
        stmt = stmt.where(RentalUnit.monthly_rent <= max_rent)
    if bedrooms is not None:
        stmt = stmt.where(RentalUnit.bedrooms >= bedrooms)
    if featured is not None:
        stmt = stmt.where(RentalUnit.is_featured.is_(featured))
    order = {"newest": [RentalUnit.is_featured.desc(), RentalUnit.created_at.desc()],
             "price_asc": [RentalUnit.currency, RentalUnit.monthly_rent.asc()],
             "price_desc": [RentalUnit.currency, RentalUnit.monthly_rent.desc()]}[sort]
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    units = list(db.execute(stmt.order_by(*order, RentalUnit.id).offset((page - 1) * page_size)
                            .limit(page_size)).unique().scalars())
    imgs = _images(db, units)
    return Page(items=[PublicListing(**_listing(u, imgs[u.id])) for u in units],
                total=total, page=page, page_size=page_size)


@router.get("/listings/{code}", response_model=PublicListingDetail)
def listing_detail(code: str, db: DB):
    unit = db.execute(select(RentalUnit).where(RentalUnit.code == code.upper(),
                                               availability.public_listing_clause())).unique().scalar_one_or_none()
    if unit is None:
        raise NotFound("This property is no longer available")
    imgs = _images(db, [unit])[unit.id]
    p = unit.property
    return PublicListingDetail(
        **_listing(unit, imgs), description=unit.description, property_description=p.description,
        amenities=list(dict.fromkeys((unit.amenities or []) + (p.amenities or []))),
        address_area=", ".join(x for x in [p.sector, p.district, p.city] if x),
        images=[PublicImage(url=media_url(i.storage_key) or "", thumb_url=media_url(i.thumb_key) or "",
                            caption=i.caption, width=i.width, height=i.height) for i in imgs],
    )


@router.get("/filters")
def filters(db: DB):
    base = (select(RentalUnit).join(Property, Property.id == RentalUnit.property_id)
            .where(availability.public_listing_clause()).subquery())
    districts = [d for d in db.execute(select(Property.district).join(base, base.c.property_id == Property.id)
                                       .distinct().order_by(Property.district)).scalars() if d]
    types = list(db.execute(select(base.c.unit_type).distinct().order_by(base.c.unit_type)).scalars())
    ranges = db.execute(select(base.c.currency, func.min(base.c.monthly_rent), func.max(base.c.monthly_rent),
                               func.count()).group_by(base.c.currency)).all()
    beds = db.execute(select(func.max(base.c.bedrooms))).scalar() or 0
    return {
        "locations": districts,
        "unit_types": types,
        "currencies": [{"currency": c, "min": format(lo, "f"), "max": format(hi, "f"), "count": n}
                       for c, lo, hi, n in ranges],
        "max_bedrooms": beds,
        "total_available": sum(r[3] for r in ranges),
    }


class AreaPrice(BaseModel):
    currency: str
    min: MoneyOut
    max: MoneyOut


class PublicArea(BaseModel):
    """One neighbourhood (district) on the website: counts only, never who lives there."""

    name: str
    city: str
    #: Homes that can be let now (same rules as the listings).
    available: int
    #: Homes currently let (occupied or under an active agreement).
    taken: int
    #: Rent range of the available homes, per currency.
    prices: list[AreaPrice]


@router.get("/areas", response_model=list[PublicArea])
def areas(db: DB):
    """Neighbourhood summary for the home page: available, taken and rent range per district."""
    # Let homes are usually unpublished, so "taken" counts every unit that is not archived.
    live = (RentalUnit.is_archived.is_(False), Property.is_archived.is_(False), Property.district != "")
    joined = select(RentalUnit).join(Property, Property.id == RentalUnit.property_id)

    avail = db.execute(
        joined.with_only_columns(Property.district, func.min(Property.city), RentalUnit.currency,
                                 func.min(RentalUnit.monthly_rent), func.max(RentalUnit.monthly_rent), func.count())
        .where(availability.public_listing_clause(), *live)
        .group_by(Property.district, RentalUnit.currency)
    ).all()
    active = select(RentalAgreement.id).where(RentalAgreement.unit_id == RentalUnit.id,
                                              RentalAgreement.status == AgreementStatus.ACTIVE.value).exists()
    taken = db.execute(
        joined.with_only_columns(Property.district, func.min(Property.city), func.count())
        .where(*live, (RentalUnit.status == UnitStatus.OCCUPIED.value) | active)
        .group_by(Property.district)
    ).all()

    out: dict[str, dict] = {}
    for district, city, cur, lo, hi, n in avail:
        a = out.setdefault(district, {"name": district, "city": city or "", "available": 0, "taken": 0, "prices": []})
        a["available"] += n
        a["prices"].append({"currency": cur, "min": lo, "max": hi})
    for district, city, n in taken:
        out.setdefault(district, {"name": district, "city": city or "", "available": 0, "taken": 0, "prices": []})
        out[district]["taken"] = n
    for a in out.values():
        a["prices"].sort(key=lambda p: (p["currency"] != "RWF", p["currency"]))
    return sorted(out.values(), key=lambda a: (-a["available"], -a["taken"], a["name"]))


@router.get("/settings")
def public_settings(db: DB):
    return {s.key: s.value for s in db.execute(select(AppSetting).where(AppSetting.is_public.is_(True))).scalars()}


class InquiryIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str = Field(max_length=32)
    email: EmailStr | None = None
    message: str = Field(default="", max_length=2000)
    unit_code: str | None = Field(default=None, max_length=32)
    preferred_date: date | None = None
    #: Honeypot: humans never fill this hidden field.
    website: str = Field(default="", max_length=200)

    _p = field_validator("phone")(_phone)


@router.post("/inquiries", response_model=Message, status_code=201,
             dependencies=[Depends(rate_limit("inquiry", 5, 600))])
def create_inquiry(body: InquiryIn, request: Request, db: DB):
    if body.website:
        return Message(detail="Thank you. We will contact you shortly.")  # silently drop bots
    if body.preferred_date and body.preferred_date < date.today():
        raise DomainError("Choose a viewing date from today onwards")
    unit_id = None
    if body.unit_code:
        unit_id = db.execute(select(RentalUnit.id).where(RentalUnit.code == body.unit_code.upper(),
                                                         availability.public_listing_clause())).scalar()
    inq = Inquiry(unit_id=unit_id, full_name=body.full_name.strip(), phone=body.phone, email=body.email,
                  message=body.message.strip(), preferred_date=body.preferred_date,
                  status=InquiryStatus.NEW.value, staff_notes="")
    db.add(inq)
    db.flush()
    notify(db, permission="inquiries.manage", kind="inquiry",
           title=f"New viewing request from {inq.full_name}",
           body=(f"Unit {body.unit_code.upper()} · " if unit_id else "") + inq.phone,
           link="/admin/inquiries", dedupe_key=f"inquiry-{inq.id}")
    db.commit()
    return Message(detail="Thank you. Our team will contact you shortly to arrange a viewing.")
