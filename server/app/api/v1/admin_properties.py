"""Property lifecycle: agents draft, admins verify and publish."""

import uuid
from typing import Literal

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import cache
from app.core.database import get_db
from app.core.deps import require_admin, require_agent, require_super_admin
from app.core.security import utcnow
from app.models.property import (
    ListingIntent,
    MediaKind,
    Property,
    PropertyBid,
    PropertyEnquiry,
    PropertyMedia,
    PropertySaleRecord,
    PropertyStatus,
)
from app.models.crm import Commission
from app.models.taxonomy import PropertyCategory, PropertySubCategory
from app.models.user import User, UserRole
from app.schemas.common import Message, Page
from app.schemas.property import (
    BulkFeatureChange,
    BulkIds,
    BulkStatusChange,
    PropertyCardAdmin,
    PropertyDetailAdmin,
    BidAdminOut,
    BidDecision,
    BidOut,
    SaleRecordCreate,
    SaleCommission,
    SaleRecordDetail,
    SaleRecordOut,
    EnquiryOut,
    MediaCreate,
    MediaOut,
    PropertyCard,
    PropertyCreate,
    PropertyDetail,
    PropertyStatusChange,
    PropertyUpdate,
    PropertyVerify,
)
from app.services import bidding_service, property_service, storage_service
from app.services.filtering import PROPERTY_FILTERS, apply_filters, describe
from app.services.audit import diff, record

router = APIRouter(prefix="/admin/properties", tags=["admin:properties"])


async def _invalidate() -> None:
    await cache.invalidate("public:featured", "public:categories")


def _can_touch(actor: User, prop: Property) -> bool:
    """Agents own their own listings; admins own everything."""
    if actor.role.rank >= UserRole.ADMIN.rank:
        return True
    return prop.uploaded_by_id == actor.id or prop.agent_id == actor.id


async def _validate_taxonomy(
    db: AsyncSession, category_id: uuid.UUID, subcategory_id: uuid.UUID
) -> None:
    sub = await db.scalar(
        select(PropertySubCategory).where(PropertySubCategory.id == subcategory_id)
    )
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sub-category not found")
    if sub.category_id != category_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "That form does not belong to the selected category",
        )


@router.get("", response_model=Page[PropertyCardAdmin], summary="All listings, any status")
async def list_all(
    q: str | None = None,
    status_filter: PropertyStatus | None = Query(None, alias="status"),
    mine: bool = False,
    filter: list[str] | None = Query(
        None,
        description=(
            "Repeatable `column:operator:value`, e.g. district:eq:Gasabo, "
            "price:gte:20000000, is_verified:eq:false, created_at:gte:2026-01-01. "
            "GET /admin/properties/filterable lists every column and operator."
        ),
    ),
    match: Literal["all", "any"] = Query("all", description="Combine filters with AND or OR"),
    sort: str | None = Query(None, description="Column to order by; prefix with '-' for descending"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Page[PropertyCardAdmin]:
    stmt = (
        select(Property, PropertyCategory.label, PropertySubCategory.label)
        .join(PropertyCategory, Property.category_id == PropertyCategory.id)
        .join(PropertySubCategory, Property.subcategory_id == PropertySubCategory.id)
        .options(selectinload(Property.media))
    )

    # An agent may only ever see their own listings.
    if actor.role is UserRole.AGENT or mine:
        stmt = stmt.where(
            (Property.uploaded_by_id == actor.id) | (Property.agent_id == actor.id)
        )
    if status_filter:
        stmt = stmt.where(Property.status == status_filter)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            Property.search_text.ilike(needle) | Property.reference_number.ilike(needle)
        )

    stmt = apply_filters(stmt, Property, PROPERTY_FILTERS, filter, match)

    # Sorting is restricted to the same allow-list, so an unknown or unsortable
    # column is a clear 422 rather than a 500 from the database.
    order = Property.updated_at.desc()
    if sort:
        descending = sort.startswith("-")
        name = sort.lstrip("-").strip()
        if name not in PROPERTY_FILTERS:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Cannot sort by {name!r}. Allowed: {', '.join(sorted(PROPERTY_FILTERS))}",
            )
        column = getattr(Property, name)
        order = column.desc() if descending else column.asc()

    total = await property_service.count_for(db, stmt)
    rows = (
        await db.execute(
            stmt.order_by(order).offset((page - 1) * per_page).limit(per_page)
        )
    ).unique().all()

    return Page.build([property_service.to_admin_card(r) for r in rows], total, page, per_page)


@router.get("/filterable", summary="Columns the console may filter and sort on")
async def filterable_columns(_: User = Depends(require_agent)) -> dict:
    """Drives the filter builder, so the UI never has to hardcode the list."""
    return {"columns": describe(PROPERTY_FILTERS)}


# ==================================================================== bulk work
@router.post("/bulk/status", response_model=Message, summary="Change status on many listings")
async def bulk_status(
    request: Request,
    payload: BulkStatusChange,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    rows = await _selected(db, payload.ids, actor)

    for row in rows:
        row.status = payload.status
        # Mirrors the single-listing endpoint: a sold or withdrawn listing must
        # leave the public site, and returning it to available brings it back.
        if payload.status in (PropertyStatus.SOLD, PropertyStatus.RENTED, PropertyStatus.WITHDRAWN):
            row.show_on_public = False
        elif payload.status is PropertyStatus.AVAILABLE:
            row.show_on_public = True

    await record(
        db, actor=actor, action="property.bulk_status", entity_type="property",
        summary=f"{len(rows)} listing(s) set to {payload.status.value}",
        changes={"ids": [str(r.id) for r in rows], "status": payload.status.value},
        request=request,
    )
    await db.commit()
    await cache.invalidate("public:")
    return Message(detail=f"{len(rows)} listing(s) set to {payload.status.value}")


@router.post("/bulk/feature", response_model=Message, summary="Feature or unfeature many listings")
async def bulk_feature(
    request: Request,
    payload: BulkFeatureChange,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    rows = await _selected(db, payload.ids, actor)
    for row in rows:
        row.is_featured = payload.is_featured

    await record(
        db, actor=actor, action="property.bulk_feature", entity_type="property",
        summary=f"{len(rows)} listing(s) {'featured' if payload.is_featured else 'unfeatured'}",
        changes={"ids": [str(r.id) for r in rows], "is_featured": payload.is_featured},
        request=request,
    )
    await db.commit()
    await cache.invalidate("public:")
    return Message(detail=f"{len(rows)} listing(s) updated")


@router.post("/bulk/delete", response_model=Message, summary="Delete many listings")
async def bulk_delete(
    request: Request,
    payload: BulkIds,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_super_admin),
) -> Message:
    """Super admin only, and irreversible.

    A POST rather than DELETE because the ids travel in a body, and DELETE with
    a body is not reliably supported end to end.
    """
    rows = await _selected(db, payload.ids, actor)
    references = [r.reference_number for r in rows]

    await record(
        db, actor=actor, action="property.bulk_delete", entity_type="property",
        summary=f"Deleted {len(rows)} listing(s): {', '.join(references[:10])}",
        changes={"references": references}, request=request,
    )
    for row in rows:
        await db.delete(row)

    await db.commit()
    await cache.invalidate("public:")
    return Message(detail=f"{len(rows)} listing(s) deleted")


async def _selected(db: AsyncSession, ids: list[uuid.UUID], actor: User) -> list[Property]:
    """Load the chosen listings, enforcing the same scope the list endpoint uses.

    An agent may only ever act on their own listings, so a crafted id list
    cannot reach somebody else's — the ownership filter is applied here rather
    than trusted from the client.
    """
    stmt = select(Property).where(Property.id.in_(ids))
    if actor.role is UserRole.AGENT:
        stmt = stmt.where(
            (Property.uploaded_by_id == actor.id) | (Property.agent_id == actor.id)
        )

    rows = (await db.scalars(stmt)).unique().all()
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "None of those listings are yours to change")
    return list(rows)


@router.get("/stats", summary="Dashboard counters")
async def stats(
    db: AsyncSession = Depends(get_db), actor: User = Depends(require_agent)
) -> dict:
    stmt = select(Property.status, func.count(Property.id)).group_by(Property.status)
    if actor.role is UserRole.AGENT:
        stmt = stmt.where(
            (Property.uploaded_by_id == actor.id) | (Property.agent_id == actor.id)
        )
    by_status = {s.value: c for s, c in (await db.execute(stmt)).all()}

    return {
        "by_status": by_status,
        "total": sum(by_status.values()),
        "pending_review": by_status.get(PropertyStatus.PENDING_REVIEW.value, 0),
        "available": by_status.get(PropertyStatus.AVAILABLE.value, 0),
        "new_enquiries": await db.scalar(
            select(func.count(PropertyEnquiry.id)).where(PropertyEnquiry.status == "new")
        )
        or 0,
    }


@router.get("/{property_id}", response_model=PropertyDetailAdmin)
async def get_one(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> PropertyDetailAdmin:
    row = (
        await db.execute(
            select(Property, PropertyCategory.label, PropertySubCategory.label)
            .join(PropertyCategory, Property.category_id == PropertyCategory.id)
            .join(PropertySubCategory, Property.subcategory_id == PropertySubCategory.id)
            .options(selectinload(Property.media))
            .where(Property.id == property_id)
        )
    ).unique().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    prop = row[0]
    if not _can_touch(actor, prop):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This listing belongs to another agent")

    card = property_service.to_admin_card(row)
    return PropertyDetailAdmin(
        **card.model_dump(),
        description=prop.description, title_rw=prop.title_rw, title_fr=prop.title_fr,
        summary_rw=prop.summary_rw, summary_fr=prop.summary_fr, province=prop.province,
        cell=prop.cell, village=prop.village, latitude=prop.latitude, longitude=prop.longitude,
        gis_coordinates=prop.gis_coordinates, boundary_geojson=prop.boundary_geojson,
        boundary_points=prop.boundary_points, boundary_area_sqm=prop.boundary_area_sqm,
        parcel_id=prop.parcel_id, land_use=prop.land_use, right_type=prop.right_type,
        amount_paid=float(prop.amount_paid) if prop.amount_paid is not None else None,
        is_negotiable=prop.is_negotiable, details=prop.details,
        parcel_information=prop.parcel_information, amenities=prop.amenities,
        video_link=prop.video_link, video_360_url=prop.video_360_url,
        vr_tour_url=prop.vr_tour_url, vr_tour_provider=prop.vr_tour_provider,
        panorama_scenes=prop.panorama_scenes, drone_footage_url=prop.drone_footage_url,
        owner_name=prop.owner_name, uploader_type=prop.uploader_type,
        verified_at=prop.verified_at, published_at=prop.published_at,
        view_count=prop.view_count, seo_title=prop.seo_title,
        seo_description=prop.seo_description,
        media=[MediaOut.model_validate(m) for m in prop.media],
        agent=None, updated_at=prop.updated_at,
    )


@router.post("", response_model=PropertyDetailAdmin, status_code=status.HTTP_201_CREATED)
async def create_property(
    request: Request,
    payload: PropertyCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> PropertyDetailAdmin:
    await _validate_taxonomy(db, payload.category_id, payload.subcategory_id)

    if await db.scalar(
        select(Property.id).where(
            Property.reference_number == payload.reference_number,
            Property.is_archived.is_(False),
        )
    ):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Reference {payload.reference_number} is already in use",
        )
    if payload.upi and await db.scalar(
        select(Property.id).where(
            Property.upi == payload.upi, Property.is_archived.is_(False)
        )
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, "That UPI is already listed")

    data = payload.model_dump(exclude={"media", "boundary_geojson"})
    prop = Property(
        **data,
        boundary_geojson=payload.boundary_geojson.model_dump()
        if payload.boundary_geojson
        else None,
        slug=await property_service.unique_slug(db, payload.title, payload.reference_number),
        uploaded_by_id=actor.id,
        # Agents submit for review; admins can publish directly.
        status=PropertyStatus.PENDING_REVIEW
        if actor.role is UserRole.AGENT
        else PropertyStatus.DRAFT,
    )
    property_service.apply_commission(prop)
    property_service.refresh_derived(prop)
    db.add(prop)
    await db.flush()

    for index, item in enumerate(payload.media):
        db.add(
            PropertyMedia(
                property_id=prop.id,
                **item.model_dump(exclude={"display_order"}),
                display_order=item.display_order or index,
            )
        )

    await record(
        db, actor=actor, action="property.create", entity_type="property",
        entity_id=prop.reference_number, summary=f"Created {prop.title}", request=request,
    )
    await db.commit()
    await _invalidate()
    return await get_one(prop.id, db, actor)


@router.patch("/{property_id}", response_model=PropertyDetailAdmin)
async def update_property(
    request: Request,
    property_id: uuid.UUID,
    payload: PropertyUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> PropertyDetailAdmin:
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")
    if not _can_touch(actor, prop):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This listing belongs to another agent")

    updates = payload.model_dump(exclude_unset=True, exclude={"boundary_geojson"})

    # Only an admin may change the published status directly.
    if "status" in updates and actor.role.rank < UserRole.ADMIN.rank:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only an admin can change the listing status"
        )

    if updates.get("reference_number"):
        clash = await db.scalar(
            select(Property.id).where(
                Property.reference_number == updates["reference_number"],
                Property.id != property_id,
                Property.is_archived.is_(False),
            )
        )
        if clash:
            raise HTTPException(status.HTTP_409_CONFLICT, "That reference is already in use")

    before = prop.as_dict()
    for key, value in updates.items():
        setattr(prop, key, value)
    if "boundary_geojson" in payload.model_fields_set:
        prop.boundary_geojson = (
            payload.boundary_geojson.model_dump() if payload.boundary_geojson else None
        )

    if payload.category_id or payload.subcategory_id:
        await _validate_taxonomy(db, prop.category_id, prop.subcategory_id)

    # An agent editing a live listing sends it back for review.
    if actor.role is UserRole.AGENT and prop.status is PropertyStatus.AVAILABLE:
        prop.status = PropertyStatus.PENDING_REVIEW
        prop.is_verified = False

    property_service.apply_commission(prop)
    property_service.refresh_derived(prop)
    await record(
        db, actor=actor, action="property.update", entity_type="property",
        entity_id=prop.reference_number, changes=diff(before, prop.as_dict()), request=request,
    )
    await db.commit()
    await _invalidate()
    return await get_one(property_id, db, actor)


@router.post("/{property_id}/verify", response_model=Message)
async def verify_property(
    request: Request,
    property_id: uuid.UUID,
    payload: PropertyVerify,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    if payload.approve:
        if not prop.reference_number:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "A reference number is required before a listing can go live",
            )
        prop.is_verified = True
        prop.verified_at = utcnow()
        prop.verified_by_id = actor.id
        prop.status = PropertyStatus.AVAILABLE
        prop.published_at = prop.published_at or utcnow()
        prop.rejection_reason = None
        detail = "Listing verified and published"
    else:
        prop.is_verified = False
        prop.status = PropertyStatus.REJECTED
        prop.rejection_reason = payload.reason
        detail = "Listing rejected"

    await record(
        db, actor=actor,
        action="property.verify" if payload.approve else "property.reject",
        entity_type="property", entity_id=prop.reference_number,
        summary=payload.reason or detail, request=request,
    )
    await db.commit()
    await _invalidate()
    return Message(detail=detail)


@router.post("/{property_id}/status", response_model=Message)
async def change_status(
    request: Request,
    property_id: uuid.UUID,
    payload: PropertyStatusChange,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    previous = prop.status
    prop.status = payload.status
    if payload.status is PropertyStatus.AVAILABLE and prop.published_at is None:
        prop.published_at = utcnow()

    await record(
        db, actor=actor, action="property.status", entity_type="property",
        entity_id=prop.reference_number,
        summary=f"{previous.value} → {payload.status.value}",
        changes={"status": [previous.value, payload.status.value]}, request=request,
    )
    await db.commit()
    await _invalidate()
    return Message(detail=f"Status set to {payload.status.value}")


@router.delete("/{property_id}", response_model=Message)
async def delete_property(
    request: Request,
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    await record(
        db, actor=actor, action="property.delete", entity_type="property",
        entity_id=prop.reference_number, summary=f"Deleted {prop.title}", request=request,
    )
    await db.delete(prop)
    await db.commit()
    await _invalidate()
    return Message(detail="Property deleted")


# ------------------------------------------------------------------ media
@router.post(
    "/{property_id}/media/upload",
    response_model=list[MediaOut],
    status_code=status.HTTP_201_CREATED,
    summary="Upload one or more images for a listing",
)
async def upload_media(
    property_id: uuid.UUID,
    files: list[UploadFile] = File(..., description="Images, or a 360/tour video"),
    kind: MediaKind = Form(MediaKind.IMAGE),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> list[MediaOut]:
    """Accepts a batch so an agent can drop a whole shoot in at once.

    Files land on disk before any row is written; a rejected file therefore
    never leaves a half-created record behind.
    """
    prop = await db.scalar(
        select(Property).options(selectinload(Property.media)).where(Property.id == property_id)
    )
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")
    if not _can_touch(actor, prop):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This listing belongs to another agent")

    allowed = (
        storage_service.VIDEO_TYPES
        if kind in (MediaKind.VIDEO_360, MediaKind.VR_TOUR)
        else storage_service.IMAGE_TYPES
    )

    saved: list[dict] = []
    try:
        for upload in files:
            saved.append(await storage_service.save_upload(upload, kind="property", allowed=allowed))
    except HTTPException:
        # Nothing has been committed yet, so clean the files back off disk.
        for item in saved:
            storage_service.delete(item["url"])
        raise

    start = max((m.display_order for m in prop.media), default=-1) + 1
    has_cover = any(m.is_cover for m in prop.media)

    rows: list[PropertyMedia] = []
    for offset, item in enumerate(saved):
        row = PropertyMedia(
            property_id=property_id,
            kind=kind,
            url=item["url"],
            display_order=start + offset,
            # The very first image a listing ever gets becomes its cover.
            is_cover=(not has_cover and offset == 0 and kind is MediaKind.IMAGE),
        )
        db.add(row)
        rows.append(row)

    await record(
        db, actor=actor, action="property.media.upload", entity_type="property",
        entity_id=property_id, summary=f"Uploaded {len(rows)} file(s) to {prop.reference_number}",
    )
    await db.commit()
    for row in rows:
        await db.refresh(row)
    await _invalidate()
    return [MediaOut.model_validate(r) for r in rows]


@router.post(
    "/{property_id}/media/reorder",
    response_model=Message,
    summary="Reorder images, and pick the cover",
)
async def reorder_media(
    property_id: uuid.UUID,
    order: list[uuid.UUID],
    cover_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    rows = (
        await db.scalars(
            select(PropertyMedia).where(PropertyMedia.property_id == property_id)
        )
    ).all()
    by_id = {row.id: row for row in rows}

    for index, media_id in enumerate(order):
        row = by_id.get(media_id)
        if row is not None:
            row.display_order = index
    if cover_id is not None:
        for row in rows:
            row.is_cover = row.id == cover_id

    await db.commit()
    await _invalidate()
    return Message(detail="Order saved")



@router.post("/{property_id}/media", response_model=MediaOut, status_code=status.HTTP_201_CREATED)
async def add_media(
    property_id: uuid.UUID,
    payload: MediaCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> MediaOut:
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")
    if not _can_touch(actor, prop):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This listing belongs to another agent")

    if payload.is_cover:
        await db.execute(
            PropertyMedia.__table__.update()
            .where(PropertyMedia.property_id == property_id)
            .values(is_cover=False)
        )

    media = PropertyMedia(property_id=property_id, **payload.model_dump())
    db.add(media)
    await db.commit()
    await db.refresh(media)
    await _invalidate()
    return MediaOut.model_validate(media)


@router.delete("/media/{media_id}", response_model=Message)
async def delete_media(
    media_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    media = await db.scalar(select(PropertyMedia).where(PropertyMedia.id == media_id))
    if media is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found")

    prop = await db.scalar(select(Property).where(Property.id == media.property_id))
    if prop and not _can_touch(actor, prop):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This listing belongs to another agent")

    await db.delete(media)
    await db.commit()
    await _invalidate()
    return Message(detail="Media removed")


# ------------------------------------------------------------------ enquiries
@router.get("/{property_id}/enquiries", response_model=list[EnquiryOut])
async def property_enquiries(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> list[EnquiryOut]:
    rows = (
        await db.scalars(
            select(PropertyEnquiry)
            .where(PropertyEnquiry.property_id == property_id)
            .order_by(PropertyEnquiry.created_at.desc())
        )
    ).all()
    return [EnquiryOut.model_validate(r) for r in rows]


# ================================================================= offers
@router.get(
    "/{property_id}/bids",
    response_model=list[BidAdminOut],
    summary="Every offer on a property, with the bidder's identity",
)
async def property_bids(
    property_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> list[BidAdminOut]:
    rows = (
        await db.execute(
            select(PropertyBid, User)
            .join(User, PropertyBid.bidder_id == User.id)
            .where(PropertyBid.property_id == property_id)
            .order_by(PropertyBid.amount.desc())
        )
    ).all()
    return [
        BidAdminOut(
            **BidOut.model_validate(bid).model_dump(),
            bidder_name=user.full_name,
            bidder_email=user.email,
            bidder_phone=user.phone,
        )
        for bid, user in rows
    ]


@router.get("/bids/inbox", response_model=Page[BidAdminOut], summary="Offers across all listings")
async def bid_inbox(
    bid_status: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> Page[BidAdminOut]:
    stmt = (
        select(PropertyBid, User, Property)
        .join(User, PropertyBid.bidder_id == User.id)
        .join(Property, PropertyBid.property_id == Property.id)
    )
    if bid_status:
        stmt = stmt.where(PropertyBid.status == bid_status)

    total = await db.scalar(
        select(func.count()).select_from(stmt.order_by(None).with_only_columns(PropertyBid.id).subquery())
    ) or 0

    rows = (
        await db.execute(
            stmt.order_by(PropertyBid.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()

    return Page(
        items=[
            BidAdminOut(
                **BidOut.model_validate(bid).model_dump(),
                bidder_name=user.full_name,
                bidder_email=user.email,
                bidder_phone=user.phone,
                property_reference=prop.reference_number,
                property_title=prop.title,
            )
            for bid, user, prop in rows
        ],
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, (total + per_page - 1) // per_page),
    )


@router.post("/bids/{bid_id}/{decision}", response_model=Message, summary="Accept or reject an offer")
async def decide_bid(
    request: Request,
    bid_id: uuid.UUID,
    decision: str,
    payload: BidDecision,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    if decision not in ("accept", "reject"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown decision")

    bid = await db.scalar(select(PropertyBid).where(PropertyBid.id == bid_id))
    if bid is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Offer not found")

    prop = await db.scalar(select(Property).where(Property.id == bid.property_id))
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    await bidding_service.decide(
        db, bid, prop, accept=decision == "accept", actor_id=actor.id, note=payload.note
    )
    await record(
        db, actor=actor, action=f"bid.{decision}", entity_type="property_bid",
        entity_id=bid.id, summary=f"{decision.title()}ed offer on {prop.reference_number}",
        request=request,
    )
    await db.commit()
    await cache.invalidate("public:")
    return Message(detail=f"Offer {decision}ed")


# ================================================================= sale history
@router.post(
    "/{property_id}/sell",
    response_model=SaleRecordOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record the sale and close the listing out",
)
async def record_sale(
    request: Request,
    property_id: uuid.UUID,
    payload: SaleRecordCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> SaleRecordOut:
    prop = await db.scalar(
        select(Property).options(selectinload(Property.media)).where(Property.id == property_id)
    )
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    sale = await bidding_service.record_sale(db, prop, payload, actor_id=actor.id)
    await record(
        db, actor=actor, action="property.sold", entity_type="property",
        entity_id=prop.id,
        summary=f"Sold {prop.reference_number} — archived, reference and UPI released",
        request=request,
    )
    await db.commit()
    await db.refresh(sale)
    await cache.invalidate("public:")
    return SaleRecordOut.model_validate(sale)


@router.get("/history/records", response_model=Page[SaleRecordOut], summary="Past sales")
async def sale_history(
    q: str | None = Query(None, description="Reference, UPI, title or owner"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> Page[SaleRecordOut]:
    stmt = select(PropertySaleRecord)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            PropertySaleRecord.reference_number.ilike(needle)
            | PropertySaleRecord.upi.ilike(needle)
            | PropertySaleRecord.title.ilike(needle)
            | PropertySaleRecord.owner_name.ilike(needle)
        )

    total = await db.scalar(
        select(func.count()).select_from(
            stmt.order_by(None).with_only_columns(PropertySaleRecord.id).subquery()
        )
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(PropertySaleRecord.sold_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page(
        items=[SaleRecordOut.model_validate(r) for r in rows],
        total=total, page=page, per_page=per_page,
        pages=max(1, (total + per_page - 1) // per_page),
    )


@router.get(
    "/history/records/{record_id}",
    response_model=SaleRecordDetail,
    summary="One past sale, including the snapshot used to prefill a re-listing",
)
async def sale_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> SaleRecordDetail:
    row = await db.scalar(
        select(PropertySaleRecord).where(PropertySaleRecord.id == record_id)
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such sale")

    # What was actually earned on this sale, and by whom.
    earned = (
        await db.execute(
            select(Commission, User.full_name)
            .outerjoin(User, Commission.agent_id == User.id)
            .where(Commission.sale_record_id == record_id)
            .order_by(Commission.earned_on)
        )
    ).all()

    detail = SaleRecordDetail.model_validate(row)
    detail.commissions = [
        SaleCommission(
            id=c.id,
            agent_id=c.agent_id,
            agent_name=name,
            basis=c.basis.value,
            rate=float(c.rate) if c.rate is not None else None,
            base_amount=float(c.base_amount) if c.base_amount is not None else None,
            amount=float(c.amount),
            currency=c.currency,
            status=c.status.value,
            earned_on=c.earned_on,
            received_on=c.received_on,
        )
        for c, name in earned
    ]
    return detail


@router.get(
    "/history/lookup",
    response_model=list[SaleRecordOut],
    summary="Have we sold this parcel before?",
)
async def history_lookup(
    upi: str | None = Query(None),
    reference: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> list[SaleRecordOut]:
    """Called as an agent types the UPI, so a repeat parcel is flagged early."""
    if not upi and not reference:
        return []
    stmt = select(PropertySaleRecord)
    if upi:
        stmt = stmt.where(PropertySaleRecord.upi == upi.strip())
    if reference:
        stmt = stmt.where(PropertySaleRecord.reference_number == reference.strip().upper())
    rows = (await db.scalars(stmt.order_by(PropertySaleRecord.sold_at.desc()).limit(5))).all()
    return [SaleRecordOut.model_validate(r) for r in rows]
