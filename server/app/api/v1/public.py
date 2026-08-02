"""
Everything the marketing site reads. All cached, all unauthenticated.

This is the router that makes the front end fully database-driven: settings,
navigation, UI strings, page copy, taxonomy and catalogue content all come from
here rather than from hard-coded modules in the client.
"""

import secrets
import uuid
from datetime import date, timedelta

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
from app.core.config import settings as app_settings
from app.core.database import get_db
from app.core.deps import client_ip, get_current_user
from app.core.email import send_booking_confirmation, send_enquiry_notification
from app.core.limiter import limiter
from app.core.security import generate_reference, utcnow
from app.models.content import (
    BlockedDate,
    Booking,
    BookingStatus,
    ConstructionPackage,
    ConsultationType,
    ContactMessage,
    ContentBlock,
    Faq,
    Insight,
    JobApplication,
    MarketStat,
    NavigationItem,
    NewsletterSubscriber,
    SellerSubmission,
    SellerSubmissionFile,
    SellerSubmissionOwner,
    SubmissionFileKind,
    ServiceLine,
    SiteSetting,
    Testimonial,
    UiString,
    WealthCycleStep,
)
from app.models.property import (
    Property,
    PropertyBid,
    PropertyEnquiry,
    PropertyStatus,
    UploaderType,
)
from app.models.taxonomy import District, PropertyCategory, PropertySubCategory
from app.models.user import User, UserRole, UserStatus
from app.schemas.common import Message, Page
from app.schemas.auth import TeamMemberPublic
from app.schemas.content import (
    SellerSubmissionCreate,
    SellerSubmissionReceipt,
    SubmissionFileOut,
    SubmissionOwnerOut,
    AvailabilityDay,
    BookingCreate,
    BookingOut,
    ConstructionPackageOut,
    ConsultationTypeOut,
    ContactMessageCreate,
    ContentBlockOut,
    FaqOut,
    InsightCard,
    InsightDetail,
    JobApplicationCreate,
    MarketStatOut,
    NewsletterSubscribe,
    ServiceLineOut,
    TestimonialOut,
    WealthCycleStepOut,
)
from app.schemas.property import (
    BidCreate,
    BidOut,
    BidSummary,
    EnquiryCreate,
    ListingSubmission,
    MediaOut,
    PropertyAgent,
    PropertyCard,
    PropertyDetail,
    PropertyFilters,
)
from app.schemas.taxonomy import CategoryOut, CategorySummary, DistrictOut
from app.services import (
    bidding_service,
    captcha_service,
    property_service,
    storage_service,
)

#: How long a seller has to attach their documents after submitting the form.
SUBMISSION_UPLOAD_TTL = 60 * 60 * 6

router = APIRouter(prefix="/public", tags=["public"])

CACHE_TTL = app_settings.PUBLIC_CACHE_TTL_SECONDS


# ------------------------------------------------------------------ bootstrap
@router.get("/bootstrap", summary="Everything the client needs at first paint")
async def bootstrap(db: AsyncSession = Depends(get_db)) -> dict:
    cached = await cache.get("public:bootstrap")
    if cached is not None:
        return cached

    settings_rows = (
        await db.scalars(
            select(SiteSetting).where(SiteSetting.is_public.is_(True)).order_by(SiteSetting.group)
        )
    ).all()

    strings = (await db.scalars(select(UiString))).all()
    nav = (
        await db.scalars(
            select(NavigationItem)
            .where(NavigationItem.is_active.is_(True), NavigationItem.parent_id.is_(None))
            .options(selectinload(NavigationItem.children))
            .order_by(NavigationItem.display_order)
        )
    ).all()

    districts = (
        await db.scalars(
            select(District).where(District.is_active.is_(True)).order_by(District.display_order)
        )
    ).all()

    payload = {
        "settings": {s.key: s.value for s in settings_rows},
        "setting_types": {s.key: s.value_type.value for s in settings_rows},
        "strings": {
            s.key: {"en": s.en, "rw": s.rw or s.en, "fr": s.fr or s.en} for s in strings
        },
        "navigation": [
            {
                "id": str(item.id),
                "menu": item.menu,
                "label": item.label,
                "translation_key": item.translation_key,
                "href": item.href,
                "icon": item.icon,
                "description": item.description,
                "children": [
                    {
                        "id": str(c.id),
                        "label": c.label,
                        "translation_key": c.translation_key,
                        "href": c.href,
                        "icon": c.icon,
                        "description": c.description,
                    }
                    for c in sorted(item.children, key=lambda c: c.display_order)
                    if c.is_active
                ],
            }
            for item in nav
        ],
        "districts": [d.name for d in districts],
    }

    await cache.set("public:bootstrap", payload, CACHE_TTL)
    return payload


# ------------------------------------------------------------------ taxonomy
@router.get("/taxonomy", response_model=list[CategoryOut], summary="Categories with form fields")
async def taxonomy(db: AsyncSession = Depends(get_db)) -> list[CategoryOut]:
    cached = await cache.get("public:taxonomy")
    if cached is not None:
        return cached

    rows = (
        await db.scalars(
            select(PropertyCategory)
            .where(PropertyCategory.is_active.is_(True))
            .options(
                selectinload(PropertyCategory.subcategories).selectinload(
                    PropertySubCategory.fields
                )
            )
            .order_by(PropertyCategory.display_order)
        )
    ).unique().all()

    result = [CategoryOut.model_validate(r) for r in rows]
    await cache.set("public:taxonomy", result, CACHE_TTL)
    return result


@router.get("/categories", response_model=list[CategorySummary], summary="Categories with counts")
async def categories(db: AsyncSession = Depends(get_db)) -> list[CategorySummary]:
    cached = await cache.get("public:categories")
    if cached is not None:
        return cached

    counts = dict(
        (
            await db.execute(
                select(Property.category_id, func.count(Property.id))
                .where(Property.status.in_(property_service.PUBLIC_STATUSES))
                .group_by(Property.category_id)
            )
        ).all()
    )

    rows = (
        await db.scalars(
            select(PropertyCategory)
            .where(PropertyCategory.is_active.is_(True))
            .order_by(PropertyCategory.display_order)
        )
    ).all()

    result = [
        CategorySummary(
            id=c.id,
            slug=c.slug,
            label=c.label,
            icon=c.icon,
            display_order=c.display_order,
            property_count=counts.get(c.id, 0),
        )
        for c in rows
    ]
    await cache.set("public:categories", result, CACHE_TTL)
    return result


@router.get("/districts", response_model=list[DistrictOut])
async def districts(db: AsyncSession = Depends(get_db)) -> list[DistrictOut]:
    rows = (
        await db.scalars(
            select(District).where(District.is_active.is_(True)).order_by(District.display_order)
        )
    ).all()
    return [DistrictOut.model_validate(r) for r in rows]


# ------------------------------------------------------------------ properties
@router.get("/properties", response_model=Page[PropertyCard], summary="Search the catalogue")
async def list_properties(
    filters: PropertyFilters = Depends(),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=60),
    db: AsyncSession = Depends(get_db),
) -> Page[PropertyCard]:
    stmt = property_service.base_public_query()
    stmt = property_service.apply_filters(stmt, filters)

    total = await property_service.count_for(db, stmt)
    stmt = property_service.apply_sort(stmt, filters.sort)
    stmt = stmt.offset((page - 1) * per_page).limit(per_page)

    rows = (await db.execute(stmt)).unique().all()
    return Page.build([property_service.to_card(r) for r in rows], total, page, per_page)


@router.get("/properties/featured", response_model=list[PropertyCard])
async def featured_properties(
    limit: int = Query(6, ge=1, le=24), db: AsyncSession = Depends(get_db)
) -> list[PropertyCard]:
    key = f"public:featured:{limit}"
    cached = await cache.get(key)
    if cached is not None:
        return cached

    stmt = (
        property_service.base_public_query()
        .where(Property.is_featured.is_(True))
        .order_by(Property.published_at.desc().nullslast())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).unique().all()
    result = [property_service.to_card(r) for r in rows]
    await cache.set(key, result, CACHE_TTL)
    return result


@router.get("/properties/{identifier}", response_model=PropertyDetail)
async def property_detail(
    identifier: str,
    db: AsyncSession = Depends(get_db),
) -> PropertyDetail:
    """Accepts a UUID, a slug, or the manual reference number."""
    stmt = property_service.base_public_query()

    try:
        stmt = stmt.where(Property.id == uuid.UUID(identifier))
    except ValueError:
        stmt = stmt.where(
            (Property.slug == identifier) | (Property.reference_number == identifier.upper())
        )

    row = (await db.execute(stmt)).unique().first()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    prop, category_label, subcategory_label = row
    card = property_service.to_card(row)

    agent = None
    if prop.agent_id:
        agent_row = await db.scalar(select(User).where(User.id == prop.agent_id))
        if agent_row:
            agent = PropertyAgent.model_validate(agent_row)

    await property_service.bump_view_count(db, prop.id)

    return PropertyDetail(
        **card.model_dump(),
        description=prop.description,
        title_rw=prop.title_rw,
        title_fr=prop.title_fr,
        summary_rw=prop.summary_rw,
        summary_fr=prop.summary_fr,
        province=prop.province,
        cell=prop.cell,
        village=prop.village,
        latitude=prop.latitude,
        longitude=prop.longitude,
        gis_coordinates=prop.gis_coordinates,
        boundary_geojson=prop.boundary_geojson,
        boundary_points=prop.boundary_points,
        boundary_area_sqm=prop.boundary_area_sqm,
        parcel_id=prop.parcel_id,
        land_use=prop.land_use,
        right_type=prop.right_type,
        amount_paid=float(prop.amount_paid) if prop.amount_paid is not None else None,
        is_negotiable=prop.is_negotiable,
        details=prop.details,
        parcel_information=prop.parcel_information,
        amenities=prop.amenities,
        video_link=prop.video_link,
        video_360_url=prop.video_360_url,
        vr_tour_url=prop.vr_tour_url,
        vr_tour_provider=prop.vr_tour_provider,
        panorama_scenes=prop.panorama_scenes,
        drone_footage_url=prop.drone_footage_url,
        # The owner's details only leave the database when they have opted in.
        owner_name=prop.owner_name if prop.show_owner_info else None,
        owner_contact=prop.owner_contact if prop.show_owner_info else None,
        show_owner_info=prop.show_owner_info,
        allow_bidding=prop.allow_bidding,
        min_bid=float(prop.min_bid) if prop.min_bid is not None else None,
        bidding_closes_at=prop.bidding_closes_at,
        bidding=await bidding_service.summarise(db, prop),
        uploader_type=prop.uploader_type,
        verified_at=prop.verified_at,
        published_at=prop.published_at,
        view_count=prop.view_count,
        seo_title=prop.seo_title,
        seo_description=prop.seo_description,
        media=[MediaOut.model_validate(m) for m in prop.media],
        agent=agent,
        updated_at=prop.updated_at,
    )


@router.get("/properties/{property_id}/related", response_model=list[PropertyCard])
async def related_properties(
    property_id: uuid.UUID,
    limit: int = Query(3, ge=1, le=12),
    db: AsyncSession = Depends(get_db),
) -> list[PropertyCard]:
    prop = await db.scalar(select(Property).where(Property.id == property_id))
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    stmt = (
        property_service.base_public_query()
        .where(
            Property.id != property_id,
            (Property.category_id == prop.category_id) | (Property.district == prop.district),
        )
        .order_by(Property.is_featured.desc(), Property.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).unique().all()
    return [property_service.to_card(r) for r in rows]


# ------------------------------------------------------------------ content
@router.get("/content/{page}", response_model=list[ContentBlockOut], summary="Page copy")
async def page_content(page: str, db: AsyncSession = Depends(get_db)) -> list[ContentBlockOut]:
    key = f"public:content:{page}"
    cached = await cache.get(key)
    if cached is not None:
        return cached

    rows = (
        await db.scalars(
            select(ContentBlock)
            .where(ContentBlock.page == page, ContentBlock.is_active.is_(True))
            .order_by(ContentBlock.display_order)
        )
    ).all()
    result = [ContentBlockOut.model_validate(r) for r in rows]
    await cache.set(key, result, CACHE_TTL)
    return result


@router.get("/testimonials", response_model=list[TestimonialOut])
async def testimonials(db: AsyncSession = Depends(get_db)) -> list[TestimonialOut]:
    rows = (
        await db.scalars(
            select(Testimonial)
            .where(Testimonial.is_published.is_(True))
            .order_by(Testimonial.display_order)
        )
    ).all()
    return [TestimonialOut.model_validate(r) for r in rows]


@router.get("/services", response_model=list[ServiceLineOut])
async def service_lines(db: AsyncSession = Depends(get_db)) -> list[ServiceLineOut]:
    rows = (
        await db.scalars(
            select(ServiceLine)
            .where(ServiceLine.is_active.is_(True))
            .order_by(ServiceLine.display_order)
        )
    ).all()
    return [ServiceLineOut.model_validate(r) for r in rows]


@router.get("/construction-packages", response_model=list[ConstructionPackageOut])
async def construction_packages(db: AsyncSession = Depends(get_db)) -> list[ConstructionPackageOut]:
    rows = (
        await db.scalars(
            select(ConstructionPackage)
            .where(ConstructionPackage.is_active.is_(True))
            .order_by(ConstructionPackage.display_order)
        )
    ).all()
    return [ConstructionPackageOut.model_validate(r) for r in rows]


@router.get("/wealth-cycle", response_model=list[WealthCycleStepOut])
async def wealth_cycle(db: AsyncSession = Depends(get_db)) -> list[WealthCycleStepOut]:
    rows = (
        await db.scalars(
            select(WealthCycleStep)
            .where(WealthCycleStep.is_active.is_(True))
            .order_by(WealthCycleStep.step)
        )
    ).all()
    return [WealthCycleStepOut.model_validate(r) for r in rows]


@router.get("/market-stats", response_model=list[MarketStatOut])
async def market_stats(db: AsyncSession = Depends(get_db)) -> list[MarketStatOut]:
    rows = (
        await db.scalars(
            select(MarketStat).where(MarketStat.is_active.is_(True)).order_by(MarketStat.display_order)
        )
    ).all()
    return [MarketStatOut.model_validate(r) for r in rows]


@router.get("/faqs", response_model=list[FaqOut])
async def faqs(page: str = "home", db: AsyncSession = Depends(get_db)) -> list[FaqOut]:
    rows = (
        await db.scalars(
            select(Faq)
            .where(Faq.page == page, Faq.is_published.is_(True))
            .order_by(Faq.display_order)
        )
    ).all()
    return [FaqOut.model_validate(r) for r in rows]


@router.get("/team", response_model=list[TeamMemberPublic])
async def team(db: AsyncSession = Depends(get_db)) -> list[TeamMemberPublic]:
    rows = (
        await db.scalars(
            select(User)
            .where(
                User.is_public.is_(True),
                User.status == UserStatus.ACTIVE,
                User.role.in_([UserRole.AGENT, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
            )
            .order_by(User.display_order, User.full_name)
        )
    ).all()
    return [TeamMemberPublic.model_validate(r) for r in rows]


# ------------------------------------------------------------------ insights
@router.get("/insights", response_model=Page[InsightCard])
async def insights(
    category: str | None = None,
    q: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=48),
    db: AsyncSession = Depends(get_db),
) -> Page[InsightCard]:
    stmt = select(Insight).where(Insight.is_published.is_(True))
    if category and category != "All":
        stmt = stmt.where(Insight.category == category)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(Insight.title.ilike(needle) | Insight.excerpt.ilike(needle))

    total = await db.scalar(
        select(func.count()).select_from(stmt.order_by(None).subquery())
    ) or 0

    rows = (
        await db.scalars(
            stmt.order_by(Insight.published_at.desc().nullslast())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build([InsightCard.model_validate(r) for r in rows], total, page, per_page)


@router.get("/insights/{slug}", response_model=InsightDetail)
async def insight_detail(slug: str, db: AsyncSession = Depends(get_db)) -> InsightDetail:
    row = await db.scalar(
        select(Insight).where(Insight.slug == slug, Insight.is_published.is_(True))
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")
    row.view_count += 1
    await db.commit()
    # `updated_at` carries a server-side onupdate, so it is expired by the
    # commit — refresh before serialising or attribute access triggers lazy IO.
    await db.refresh(row)
    return InsightDetail.model_validate(row)


# ------------------------------------------------------------------ bookings
@router.get("/consultation-types", response_model=list[ConsultationTypeOut])
async def consultation_types(db: AsyncSession = Depends(get_db)) -> list[ConsultationTypeOut]:
    rows = (
        await db.scalars(
            select(ConsultationType)
            .where(ConsultationType.is_active.is_(True))
            .order_by(ConsultationType.display_order)
        )
    ).all()
    return [ConsultationTypeOut.model_validate(r) for r in rows]


@router.get(
    "/availability/{consultation_type_id}",
    response_model=list[AvailabilityDay],
    summary="Real per-day availability for the booking calendar",
)
async def availability(
    consultation_type_id: uuid.UUID,
    days: int = Query(90, ge=1, le=180),
    db: AsyncSession = Depends(get_db),
) -> list[AvailabilityDay]:
    ctype = await db.scalar(
        select(ConsultationType).where(ConsultationType.id == consultation_type_id)
    )
    if ctype is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultation type not found")

    today = date.today()
    horizon = today + timedelta(days=days)

    blocked = {
        (row.blocked_on, row.reason_type)
        for row in (
            await db.scalars(
                select(BlockedDate).where(
                    BlockedDate.blocked_on >= today, BlockedDate.blocked_on <= horizon
                )
            )
        ).all()
    }
    closed_days = {d for d, kind in blocked if kind == "closed"}
    full_days = {d for d, kind in blocked if kind == "full"}

    # One query for every taken slot in the window.
    taken_rows = (
        await db.execute(
            select(Booking.scheduled_date, Booking.scheduled_time)
            .where(
                Booking.consultation_type_id == consultation_type_id,
                Booking.scheduled_date >= today,
                Booking.scheduled_date <= horizon,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
            )
        )
    ).all()
    taken: dict[date, set[str]] = {}
    for day, slot in taken_rows:
        taken.setdefault(day, set()).add(slot)

    all_slots = ctype.slots or []
    available_days = set(ctype.available_days or [])

    out: list[AvailabilityDay] = []
    for offset in range(days):
        day = today + timedelta(days=offset)
        if day in closed_days:
            out.append(AvailabilityDay(date=day, state="closed"))
            continue
        # Python's weekday(): Monday=0. The config uses JS convention: Sunday=0.
        js_weekday = (day.weekday() + 1) % 7
        if js_weekday not in available_days:
            out.append(AvailabilityDay(date=day, state="unavailable"))
            continue

        open_slots = [s for s in all_slots if s not in taken.get(day, set())]
        if day in full_days or not open_slots:
            out.append(AvailabilityDay(date=day, state="full"))
        else:
            out.append(AvailabilityDay(date=day, state="available", open_slots=open_slots))

    return out


@router.post("/bookings", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def create_booking(
    request: Request,
    payload: BookingCreate,
    db: AsyncSession = Depends(get_db),
) -> BookingOut:
    await captcha_service.verify(
        db, payload.captcha_token, payload.captcha_answer, scope="booking"
    )

    ctype = await db.scalar(
        select(ConsultationType).where(
            ConsultationType.id == payload.consultation_type_id,
            ConsultationType.is_active.is_(True),
        )
    )
    if ctype is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Consultation type not found")

    if payload.scheduled_date < date.today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That date has already passed")
    if ctype.slots and payload.scheduled_time not in ctype.slots:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That time is not offered")

    clash = await db.scalar(
        select(Booking.id).where(
            Booking.consultation_type_id == ctype.id,
            Booking.scheduled_date == payload.scheduled_date,
            Booking.scheduled_time == payload.scheduled_time,
            Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
        )
    )
    if clash:
        raise HTTPException(status.HTTP_409_CONFLICT, "That slot has just been taken")

    booking = Booking(
        reference=generate_reference("BK", 6),
        consultation_type_id=ctype.id,
        property_id=payload.property_id,
        agent_id=payload.agent_id,
        full_name=payload.full_name.strip(),
        email=payload.email,
        phone=payload.phone.strip(),
        notes=payload.notes,
        mode=payload.mode,
        scheduled_date=payload.scheduled_date,
        scheduled_time=payload.scheduled_time,
        status=BookingStatus.PENDING,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    if booking.email:
        when = f"{booking.scheduled_date:%A, %d %B %Y} at {booking.scheduled_time} CAT"
        await send_booking_confirmation(
            booking.email, booking.full_name, ctype.title, when,
            booking.mode or (ctype.modes or ["To be confirmed"])[0], booking.reference,
        )

    return BookingOut.model_validate(booking)


# ------------------------------------------------------------------ inbound


# ================================================================= bidding
@router.get(
    "/properties/{property_id}/bids",
    response_model=BidSummary,
    summary="Public offer summary — highest and count only",
)
async def property_bid_summary(
    property_id: uuid.UUID, db: AsyncSession = Depends(get_db)
) -> BidSummary:
    prop = await _public_property_or_404(db, property_id)
    summary = await bidding_service.summarise(db, prop)
    if summary is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This property does not accept offers")
    return summary


@router.post(
    "/properties/{property_id}/bids",
    response_model=BidOut,
    status_code=status.HTTP_201_CREATED,
    summary="Place an offer (signed-in users only)",
)
@limiter.limit("20/hour")
async def place_bid(
    request: Request,
    property_id: uuid.UUID,
    payload: BidCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BidOut:
    """Offers require an account on purpose — a bid carries a verified identity."""
    prop = await _public_property_or_404(db, property_id)
    bid = await bidding_service.place_bid(
        db,
        prop,
        bidder_id=user.id,
        amount=payload.amount,
        message=payload.message,
        ip_address=client_ip(request),
    )
    await db.commit()
    await db.refresh(bid)
    return BidOut.model_validate(bid)


@router.get(
    "/my/bids",
    response_model=list[BidOut],
    summary="The offers the signed-in user has placed",
)
async def my_bids(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> list[BidOut]:
    rows = (
        await db.scalars(
            select(PropertyBid)
            .where(PropertyBid.bidder_id == user.id)
            .order_by(PropertyBid.created_at.desc())
            .limit(100)
        )
    ).all()
    return [BidOut.model_validate(r) for r in rows]


async def _public_property_or_404(db: AsyncSession, property_id: uuid.UUID) -> Property:
    prop = await db.scalar(
        select(Property).where(
            Property.id == property_id,
            Property.status.in_(property_service.PUBLIC_STATUSES),
            Property.show_on_public.is_(True),
            Property.is_archived.is_(False),
        )
    )
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")
    return prop


@router.post(
    "/listing-submissions",
    response_model=Message,
    status_code=status.HTTP_410_GONE,
    include_in_schema=False,
    summary="Retired — properties are now uploaded by staff only",
)
async def listing_submissions_retired() -> Message:
    """Kept so an old client gets a clear answer instead of a 404.

    Sellers now request a valuation through `/public/contact`; the listing
    itself is created by an agent or admin in the console, which is what keeps
    reference numbers and UPIs trustworthy.
    """
    raise HTTPException(
        status.HTTP_410_GONE,
        "Properties are uploaded by Evaramu staff. Request a valuation instead.",
    )



# ================================================================= seller intake
@router.post(
    "/seller-submissions",
    response_model=SellerSubmissionReceipt,
    status_code=status.HTTP_201_CREATED,
    summary="Ask us to sell a property",
)
@limiter.limit("10/hour")
async def create_seller_submission(
    request: Request,
    payload: SellerSubmissionCreate,
    db: AsyncSession = Depends(get_db),
) -> SellerSubmissionReceipt:
    """Records the parcel and every registered owner.

    Files are attached in a second call — this one travels through the sealed
    channel and hands back a short-lived token that scopes those uploads to
    this submission alone.
    """
    await captcha_service.verify(
        db, payload.captcha_token, payload.captcha_answer, scope="listing"
    )

    reference = generate_reference("SUB")
    while await db.scalar(
        select(SellerSubmission.id).where(SellerSubmission.reference == reference)
    ):
        reference = generate_reference("SUB")

    submission = SellerSubmission(
        reference=reference,
        upi=payload.upi.strip(),
        district=payload.district,
        sector=payload.sector,
        location=payload.location,
        property_type=payload.property_type,
        asking_price=payload.asking_price,
        size=payload.size,
        notes=payload.notes,
        upload_token=secrets.token_urlsafe(32),
        upload_expires_at=utcnow() + timedelta(seconds=SUBMISSION_UPLOAD_TTL),
        ip_address=client_ip(request),
    )
    # Exactly one primary contact, whatever the form sent.
    for index, owner in enumerate(payload.owners):
        submission.owners.append(
            SellerSubmissionOwner(
                full_name=owner.full_name.strip(),
                phone=owner.phone.strip(),
                email=owner.email,
                national_id=owner.national_id,
                is_primary=owner.is_primary or index == 0,
                display_order=index,
            )
        )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

    return SellerSubmissionReceipt(
        id=submission.id,
        reference=submission.reference,
        upload_token=submission.upload_token,
        expires_in=SUBMISSION_UPLOAD_TTL,
        owners=[SubmissionOwnerOut.model_validate(o) for o in submission.owners],
        detail=(
            f"Submission {submission.reference} received. Attach the identity documents and "
            "photographs, and a consultant will verify the parcel at the National Land Authority."
        ),
    )


@router.post(
    "/seller-submissions/{submission_id}/files",
    response_model=list[SubmissionFileOut],
    status_code=status.HTTP_201_CREATED,
    summary="Attach ID documents and photographs to a submission",
)
@limiter.limit("40/hour")
async def upload_submission_files(
    request: Request,
    submission_id: uuid.UUID,
    token: str = Form(...),
    kind: SubmissionFileKind = Form(SubmissionFileKind.PROPERTY_PHOTO),
    owner_id: uuid.UUID | None = Form(None),
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
) -> list[SubmissionFileOut]:
    submission = await db.scalar(
        select(SellerSubmission).where(SellerSubmission.id == submission_id)
    )
    # One error for every failure mode — a wrong id and a wrong token should be
    # indistinguishable to anyone probing.
    invalid = HTTPException(status.HTTP_403_FORBIDDEN, "That upload link is not valid")
    if submission is None or not secrets.compare_digest(submission.upload_token, token):
        raise invalid
    if submission.upload_expires_at <= utcnow():
        raise HTTPException(status.HTTP_410_GONE, "That upload link has expired")

    if owner_id is not None and owner_id not in {o.id for o in submission.owners}:
        raise invalid

    saved = []
    try:
        for upload in files:
            saved.append(
                await storage_service.save_upload(
                    upload,
                    kind="submissions",
                    allowed=storage_service.DOCUMENT_TYPES,
                )
            )
    except HTTPException:
        for item in saved:
            storage_service.delete(item["url"])
        raise

    rows = []
    for item in saved:
        row = SellerSubmissionFile(
            submission_id=submission.id,
            owner_id=owner_id,
            kind=kind,
            url=item["url"],
            original_name=item["original_name"],
            content_type=item["content_type"],
            bytes=item["bytes"],
        )
        db.add(row)
        rows.append(row)

    await db.commit()
    for row in rows:
        await db.refresh(row)
    return [SubmissionFileOut.model_validate(r) for r in rows]


@router.post("/enquiries", response_model=Message, status_code=status.HTTP_201_CREATED)
@limiter.limit("15/hour")
async def create_enquiry(
    request: Request,
    payload: EnquiryCreate,
    db: AsyncSession = Depends(get_db),
) -> Message:
    await captcha_service.verify(
        db, payload.captcha_token, payload.captcha_answer, scope="enquiry"
    )
    if not payload.email and not payload.phone:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide an email address or a phone number"
        )

    prop = None
    if payload.property_id:
        prop = await db.scalar(select(Property).where(Property.id == payload.property_id))
        if prop is None or prop.status not in property_service.PUBLIC_STATUSES:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")

    enquiry = PropertyEnquiry(
        property_id=payload.property_id,
        name=payload.name.strip(),
        email=payload.email,
        phone=payload.phone,
        message=payload.message,
        assigned_to_id=prop.agent_id if prop else None,
        ip_address=client_ip(request),
    )
    db.add(enquiry)
    await db.commit()

    if prop and prop.agent_id:
        agent = await db.scalar(select(User).where(User.id == prop.agent_id))
        if agent:
            await send_enquiry_notification(
                agent.email, prop.title, prop.reference_number,
                enquiry.name, enquiry.email or enquiry.phone or "-", enquiry.message or "",
            )

    return Message(detail="Thank you — a consultant will be in touch within two working hours.")


@router.post("/contact", response_model=Message, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def contact(
    request: Request,
    payload: ContactMessageCreate,
    db: AsyncSession = Depends(get_db),
) -> Message:
    await captcha_service.verify(
        db, payload.captcha_token, payload.captcha_answer, scope="contact"
    )
    db.add(
        ContactMessage(
            full_name=payload.full_name.strip(),
            email=payload.email,
            phone=payload.phone,
            topic=payload.topic,
            budget=payload.budget,
            based_in=payload.based_in,
            message=payload.message,
            ip_address=client_ip(request),
        )
    )
    await db.commit()
    return Message(detail="Message received. We reply within two working hours.")


@router.post("/applications", response_model=Message, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def apply(
    request: Request,
    payload: JobApplicationCreate,
    db: AsyncSession = Depends(get_db),
) -> Message:
    await captcha_service.verify(
        db, payload.captcha_token, payload.captcha_answer, scope="application"
    )
    db.add(
        JobApplication(
            full_name=payload.full_name.strip(),
            email=payload.email,
            phone=payload.phone,
            role_applied=payload.role_applied,
            area_covered=payload.area_covered,
            years_experience=payload.years_experience,
            pitch=payload.pitch,
            portfolio_url=payload.portfolio_url,
        )
    )
    await db.commit()
    return Message(detail="Application received. We read every one and reply within five working days.")


@router.post("/newsletter", response_model=Message, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def subscribe(
    request: Request,
    payload: NewsletterSubscribe,
    db: AsyncSession = Depends(get_db),
) -> Message:
    email = payload.email.lower().strip()
    existing = await db.scalar(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == email)
    )
    if existing:
        existing.is_active = True
    else:
        db.add(
            NewsletterSubscriber(email=email, locale=payload.locale, source=payload.source)
        )
    await db.commit()
    return Message(detail="You're on the list — the next report lands at the start of the month.")


# ------------------------------------------------------------------ seo
@router.get("/sitemap-data", summary="Slugs for sitemap generation")
async def sitemap_data(db: AsyncSession = Depends(get_db)) -> dict:
    props = (
        await db.execute(
            select(Property.slug, Property.updated_at).where(
                Property.status.in_(property_service.PUBLIC_STATUSES)
            )
        )
    ).all()
    articles = (
        await db.execute(
            select(Insight.slug, Insight.updated_at).where(Insight.is_published.is_(True))
        )
    ).all()
    return {
        "properties": [{"slug": s, "updated_at": u.isoformat()} for s, u in props],
        "insights": [{"slug": s, "updated_at": u.isoformat()} for s, u in articles],
    }
