import uuid
from typing import Any

from slugify import slugify
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.property import ListingIntent, MediaKind, Property, PropertyStatus
from app.models.taxonomy import PropertyCategory, PropertySubCategory
from app.schemas.property import PropertyCard, PropertyCardAdmin, PropertyFilters

#: Statuses a visitor is allowed to see.
PUBLIC_STATUSES = (
    PropertyStatus.AVAILABLE,
    PropertyStatus.RESERVED,
    PropertyStatus.UNDER_OFFER,
    PropertyStatus.RENTED,
    PropertyStatus.SOLD,
)


async def unique_slug(db: AsyncSession, title: str, reference: str) -> str:
    """
    Slug is derived from the title but always suffixed with the reference, so
    two "3 bedroom house in Kimironko" listings never collide.
    """
    base = slugify(f"{title}-{reference}")[:200] or slugify(reference)
    candidate = base
    counter = 2
    while await db.scalar(select(Property.id).where(Property.slug == candidate)):
        candidate = f"{base}-{counter}"
        counter += 1
    return candidate


def apply_filters(stmt: Select, filters: PropertyFilters) -> Select:
    if filters.q:
        needle = f"%{filters.q.strip()}%"
        stmt = stmt.where(
            or_(
                Property.search_text.ilike(needle),
                Property.reference_number.ilike(needle),
                Property.upi.ilike(needle),
            )
        )
    if filters.intent:
        # A "both" listing should surface under either filter.
        stmt = stmt.where(Property.intent.in_([filters.intent, ListingIntent.BOTH]))
    if filters.category:
        stmt = stmt.where(PropertyCategory.slug == filters.category)
    if filters.subcategory:
        stmt = stmt.where(PropertySubCategory.slug == filters.subcategory)
    if filters.district:
        stmt = stmt.where(Property.district == filters.district)
    if filters.sector:
        stmt = stmt.where(Property.sector == filters.sector)
    if filters.min_price is not None:
        stmt = stmt.where(Property.price >= filters.min_price)
    if filters.max_price is not None:
        stmt = stmt.where(Property.price <= filters.max_price)
    if filters.min_size is not None:
        stmt = stmt.where(Property.size >= filters.min_size)
    if filters.max_size is not None:
        stmt = stmt.where(Property.size <= filters.max_size)
    if filters.bedrooms is not None:
        stmt = stmt.where(Property.bedrooms >= filters.bedrooms)
    if filters.verified_only:
        stmt = stmt.where(Property.is_verified.is_(True))
    if filters.featured_only:
        stmt = stmt.where(Property.is_featured.is_(True))
    if filters.has_vr:
        stmt = stmt.where(
            or_(Property.vr_tour_url.isnot(None), Property.video_360_url.isnot(None))
        )
    return stmt


def apply_sort(stmt: Select, sort: str) -> Select:
    match sort:
        case "price-asc":
            return stmt.order_by(Property.price.asc().nullslast())
        case "price-desc":
            return stmt.order_by(Property.price.desc().nullslast())
        case "size-desc":
            return stmt.order_by(Property.size.desc().nullslast())
        case "yield-desc":
            return stmt.order_by(Property.projected_yield.desc().nullslast())
        case _:
            return stmt.order_by(Property.published_at.desc().nullslast(), Property.created_at.desc())


def base_public_query() -> Select:
    """
    Joins the taxonomy once so the card can show category labels without an
    N+1, and eagerly loads media in a second round trip via `selectinload`.
    """
    return (
        select(Property, PropertyCategory.label, PropertySubCategory.label)
        .join(PropertyCategory, Property.category_id == PropertyCategory.id)
        .join(PropertySubCategory, Property.subcategory_id == PropertySubCategory.id)
        .options(selectinload(Property.media))
        .where(
            Property.status.in_(PUBLIC_STATUSES),
            # An agent can keep a verified listing off-market, and a sold
            # listing leaves the marketplace once its sale is recorded.
            Property.show_on_public.is_(True),
            Property.is_archived.is_(False),
        )
    )


def to_card(row: Any) -> PropertyCard:
    prop, category_label, subcategory_label = row
    images = [m for m in prop.media if m.kind in (MediaKind.IMAGE, MediaKind.DRONE)]
    images.sort(key=lambda m: (not m.is_cover, m.display_order))

    return PropertyCard(
        id=prop.id,
        reference_number=prop.reference_number,
        slug=prop.slug,
        title=prop.title,
        summary=prop.summary,
        category_id=prop.category_id,
        subcategory_id=prop.subcategory_id,
        category_label=category_label,
        subcategory_label=subcategory_label,
        location=prop.location,
        district=prop.district,
        sector=prop.sector,
        status=prop.status,
        intent=prop.intent,
        currency=prop.currency,
        price=float(prop.price) if prop.price is not None else None,
        rent_amount=float(prop.rent_amount) if prop.rent_amount is not None else None,
        size=prop.size,
        built_area=prop.built_area,
        bedrooms=prop.bedrooms,
        bathrooms=prop.bathrooms,
        projected_yield=prop.projected_yield,
        appreciation=prop.appreciation,
        is_verified=prop.is_verified,
        is_featured=prop.is_featured,
        tags=prop.tags,
        cover_url=images[0].url if images else None,
        second_image_url=images[1].url if len(images) > 1 else None,
        has_vr_tour=bool(prop.vr_tour_url),
        has_360_video=bool(prop.video_360_url),
        created_at=prop.created_at,
    )


def to_admin_card(row: Any) -> PropertyCardAdmin:
    """The public card plus the fields only staff may see."""
    prop = row[0]
    return PropertyCardAdmin(
        **to_card(row).model_dump(),
        upi=prop.upi,
        show_on_public=prop.show_on_public,
        show_owner_info=prop.show_owner_info,
        allow_bidding=prop.allow_bidding,
        is_archived=prop.is_archived,
    )


async def count_for(db: AsyncSession, stmt: Select) -> int:
    """Counts without pulling rows or ORDER BY overhead."""
    subquery = stmt.order_by(None).with_only_columns(Property.id).subquery()
    return await db.scalar(select(func.count()).select_from(subquery)) or 0


def refresh_derived(prop: Property) -> None:
    """Keeps the denormalised search haystack in step with the record."""
    prop.search_text = prop.build_search_text()


async def bump_view_count(db: AsyncSession, property_id: uuid.UUID) -> None:
    """Fire-and-forget counter; deliberately not part of the read transaction."""
    await db.execute(
        Property.__table__.update()
        .where(Property.id == property_id)
        .values(view_count=Property.view_count + 1)
    )
    await db.commit()
