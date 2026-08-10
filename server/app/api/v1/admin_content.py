"""CMS: page copy, UI strings, catalogue content, settings, users, inbox."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import cache
from app.core.database import get_db
from app.core.deps import require_admin, require_agent, require_super_admin
from app.core.email import send_welcome_email
from app.core.security import generate_token, hash_password, validate_password_strength
from app.models.content import (
    PropertyRequest,
    AuditLog,
    BlockedDate,
    Booking,
    ConsultationType,
    ContactMessage,
    ContentBlock,
    Faq,
    Insight,
    JobApplication,
    MarketStat,
    NewsletterSubscriber,
    SellerSubmission,
    ServiceLine,
    SiteSetting,
    Testimonial,
    UiString,
)
from app.models.property import Property, PropertyEnquiry, PropertyStatus
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import UserCreate, UserPublic, UserUpdate
from app.schemas.common import Message, Page
from app.schemas.content import (
    InboxStatusChange,
    PropertyRequestOut,
    PropertyRequestReview,
    SellerSubmissionOut,
    SubmissionReview,
    AuditLogOut,
    BlockedDateIn,
    BookingOut,
    BookingStatusChange,
    ContactMessageOut,
    ContentBlockCreate,
    ContentBlockOut,
    ContentBlockUpdate,
    FaqIn,
    FaqOut,
    InsightDetail,
    InsightIn,
    JobApplicationOut,
    SettingBulkUpdate,
    SettingReset,
    SettingOut,
    TestimonialIn,
    TestimonialOut,
    UiStringOut,
    UiStringUpsert,
)
from app.seeds import site_content
from app.services.audit import diff, record

router = APIRouter(prefix="/admin", tags=["admin:content"])


# ================================================================= settings
@router.get("/settings", response_model=list[SettingOut])
async def list_settings(
    group: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[SettingOut]:
    stmt = select(SiteSetting).order_by(SiteSetting.group, SiteSetting.display_order)
    if group:
        stmt = stmt.where(SiteSetting.group == group)
    rows = (await db.scalars(stmt)).all()
    return [SettingOut.model_validate(r) for r in rows]


@router.put("/settings", response_model=Message, summary="Bulk-update settings")
async def update_settings(
    request: Request,
    payload: SettingBulkUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    rows = (
        await db.scalars(select(SiteSetting).where(SiteSetting.key.in_(payload.values.keys())))
    ).all()
    found = {r.key: r for r in rows}

    missing = set(payload.values) - set(found)
    if missing:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Unknown setting(s): {', '.join(sorted(missing))}"
        )

    # Branding and security toggles are super-admin only.
    protected = [k for k, r in found.items() if r.is_protected]
    if protected and actor.role is not UserRole.SUPER_ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Only a super admin can change: {', '.join(sorted(protected))}",
        )

    changes: dict[str, list] = {}
    for key, value in payload.values.items():
        row = found[key]
        if row.value != value:
            changes[key] = [row.value, value]
            row.value = value

    await record(
        db, actor=actor, action="settings.update", entity_type="site_setting",
        summary=f"Updated {len(changes)} setting(s)", changes=changes, request=request,
    )
    await db.commit()
    await cache.invalidate("public:")
    return Message(detail=f"{len(changes)} setting(s) updated")


@router.post(
    "/settings/reset",
    response_model=Message,
    summary="Restore settings to their shipped defaults",
)
async def reset_settings(
    request: Request,
    payload: SettingReset,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_super_admin),
) -> Message:
    """Puts a group of settings — usually the theme — back to what shipped.

    The defaults live in the seed module, so this always restores the same
    values a fresh install would have, whatever has been saved since.
    """
    defaults = {spec["key"]: spec.get("value") for spec in site_content.SETTINGS}

    stmt = select(SiteSetting)
    if payload.group:
        stmt = stmt.where(SiteSetting.group == payload.group)
    if payload.keys:
        stmt = stmt.where(SiteSetting.key.in_(payload.keys))
    if not payload.group and not payload.keys:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Name a group or a list of keys to reset"
        )

    rows = (await db.scalars(stmt)).all()
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Nothing matches that group")

    changes: dict[str, list] = {}
    for row in rows:
        default = defaults.get(row.key)
        if default is not None and row.value != default:
            changes[row.key] = [row.value, default]
            row.value = default

    await record(
        db, actor=actor, action="settings.reset", entity_type="site_setting",
        summary=f"Reset {len(changes)} setting(s) in {payload.group or 'selection'}",
        changes=changes, request=request,
    )
    await db.commit()
    await cache.invalidate("public:")
    return Message(detail=f"{len(changes)} setting(s) restored to defaults")


# ================================================================= content blocks
@router.get("/content-blocks", response_model=list[ContentBlockOut])
async def list_blocks(
    page: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[ContentBlockOut]:
    stmt = select(ContentBlock).order_by(ContentBlock.page, ContentBlock.display_order)
    if page:
        stmt = stmt.where(ContentBlock.page == page)
    rows = (await db.scalars(stmt)).all()
    return [ContentBlockOut.model_validate(r) for r in rows]


@router.post("/content-blocks", response_model=ContentBlockOut, status_code=status.HTTP_201_CREATED)
async def create_block(
    payload: ContentBlockCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> ContentBlockOut:
    exists = await db.scalar(
        select(ContentBlock.id).where(
            ContentBlock.page == payload.page, ContentBlock.key == payload.key
        )
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "That block already exists on this page")

    block = ContentBlock(**payload.model_dump())
    db.add(block)
    await db.commit()
    await db.refresh(block)
    await cache.invalidate("public:content")
    return ContentBlockOut.model_validate(block)


@router.patch("/content-blocks/{block_id}", response_model=ContentBlockOut)
async def update_block(
    request: Request,
    block_id: uuid.UUID,
    payload: ContentBlockUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> ContentBlockOut:
    block = await db.scalar(select(ContentBlock).where(ContentBlock.id == block_id))
    if block is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content block not found")

    before = block.as_dict()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(block, key, value)

    await record(
        db, actor=actor, action="content.update", entity_type="content_block",
        entity_id=f"{block.page}.{block.key}", changes=diff(before, block.as_dict()),
        request=request,
    )
    await db.commit()
    await cache.invalidate("public:content")
    return ContentBlockOut.model_validate(block)


@router.delete("/content-blocks/{block_id}", response_model=Message)
async def delete_block(
    block_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Message:
    block = await db.scalar(select(ContentBlock).where(ContentBlock.id == block_id))
    if block is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Content block not found")
    await db.delete(block)
    await db.commit()
    await cache.invalidate("public:content")
    return Message(detail="Block deleted")


# ================================================================= ui strings
@router.get("/ui-strings", response_model=list[UiStringOut])
async def list_strings(
    namespace: str | None = None,
    needs_review: bool | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[UiStringOut]:
    stmt = select(UiString).order_by(UiString.key)
    if namespace:
        stmt = stmt.where(UiString.namespace == namespace)
    if needs_review is not None:
        stmt = stmt.where(UiString.needs_review.is_(needs_review))
    rows = (await db.scalars(stmt)).all()
    return [UiStringOut.model_validate(r) for r in rows]


@router.put("/ui-strings", response_model=Message, summary="Upsert translations")
async def upsert_strings(
    payload: list[UiStringUpsert],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Message:
    keys = [p.key for p in payload]
    existing = {
        r.key: r for r in (await db.scalars(select(UiString).where(UiString.key.in_(keys)))).all()
    }
    for item in payload:
        row = existing.get(item.key)
        if row:
            for key, value in item.model_dump().items():
                setattr(row, key, value)
        else:
            db.add(UiString(**item.model_dump()))
    await db.commit()
    await cache.invalidate("public:bootstrap")
    return Message(detail=f"{len(payload)} string(s) saved")


# ================================================================= catalogue content
@router.get("/testimonials", response_model=list[TestimonialOut])
async def admin_testimonials(
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> list[TestimonialOut]:
    rows = (await db.scalars(select(Testimonial).order_by(Testimonial.display_order))).all()
    return [TestimonialOut.model_validate(r) for r in rows]


@router.post("/testimonials", response_model=TestimonialOut, status_code=status.HTTP_201_CREATED)
async def create_testimonial(
    payload: TestimonialIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> TestimonialOut:
    row = Testimonial(**payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return TestimonialOut.model_validate(row)


@router.patch("/testimonials/{testimonial_id}", response_model=TestimonialOut)
async def update_testimonial(
    testimonial_id: uuid.UUID,
    payload: TestimonialIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> TestimonialOut:
    row = await db.scalar(select(Testimonial).where(Testimonial.id == testimonial_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Testimonial not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    return TestimonialOut.model_validate(row)


@router.delete("/testimonials/{testimonial_id}", response_model=Message)
async def delete_testimonial(
    testimonial_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Message:
    row = await db.scalar(select(Testimonial).where(Testimonial.id == testimonial_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Testimonial not found")
    await db.delete(row)
    await db.commit()
    return Message(detail="Testimonial deleted")


@router.get("/insights", response_model=Page[InsightDetail])
async def admin_insights(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[InsightDetail]:
    total = await db.scalar(select(func.count(Insight.id))) or 0
    rows = (
        await db.scalars(
            select(Insight)
            .order_by(Insight.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build([InsightDetail.model_validate(r) for r in rows], total, page, per_page)


@router.post("/insights", response_model=InsightDetail, status_code=status.HTTP_201_CREATED)
async def create_insight(
    payload: InsightIn,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> InsightDetail:
    slug = payload.slug or slugify(payload.title)[:200]
    if await db.scalar(select(Insight.id).where(Insight.slug == slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That slug is already used")

    row = Insight(
        **payload.model_dump(exclude={"slug"}),
        slug=slug,
        author_id=actor.id,
    )
    row.author_name = row.author_name or actor.full_name
    row.author_role = row.author_role or actor.job_title
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return InsightDetail.model_validate(row)


@router.patch("/insights/{insight_id}", response_model=InsightDetail)
async def update_insight(
    insight_id: uuid.UUID,
    payload: InsightIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> InsightDetail:
    row = await db.scalar(select(Insight).where(Insight.id == insight_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")
    for key, value in payload.model_dump(exclude_unset=True, exclude={"slug"}).items():
        setattr(row, key, value)
    await db.commit()
    return InsightDetail.model_validate(row)


@router.delete("/insights/{insight_id}", response_model=Message)
async def delete_insight(
    insight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Message:
    row = await db.scalar(select(Insight).where(Insight.id == insight_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Article not found")
    await db.delete(row)
    await db.commit()
    return Message(detail="Article deleted")


@router.get("/faqs", response_model=list[FaqOut])
async def admin_faqs(
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> list[FaqOut]:
    rows = (await db.scalars(select(Faq).order_by(Faq.page, Faq.display_order))).all()
    return [FaqOut.model_validate(r) for r in rows]


@router.post("/faqs", response_model=FaqOut, status_code=status.HTTP_201_CREATED)
async def create_faq(
    payload: FaqIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> FaqOut:
    row = Faq(**payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    await cache.invalidate("public:")
    return FaqOut.model_validate(row)


@router.patch("/faqs/{faq_id}", response_model=FaqOut)
async def update_faq(
    faq_id: uuid.UUID,
    payload: FaqIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> FaqOut:
    row = await db.scalar(select(Faq).where(Faq.id == faq_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "FAQ not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    await db.commit()
    await cache.invalidate("public:")
    return FaqOut.model_validate(row)


@router.delete("/faqs/{faq_id}", response_model=Message)
async def delete_faq(
    faq_id: uuid.UUID, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> Message:
    row = await db.scalar(select(Faq).where(Faq.id == faq_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "FAQ not found")
    await db.delete(row)
    await db.commit()
    await cache.invalidate("public:")
    return Message(detail="FAQ deleted")


# ================================================================= users
@router.get("/users", response_model=Page[UserPublic])
async def list_users(
    q: str | None = None,
    role: UserRole | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[UserPublic]:
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(User.full_name.ilike(needle) | User.email.ilike(needle))

    total = await db.scalar(
        select(func.count()).select_from(stmt.order_by(None).subquery())
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
        )
    ).all()
    return Page.build([UserPublic.model_validate(r) for r in rows], total, page, per_page)


@router.post("/users", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def create_user(
    request: Request,
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> UserPublic:
    # Nobody may mint an account more privileged than their own.
    if payload.role.rank >= actor.role.rank and actor.role is not UserRole.SUPER_ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "You cannot create an account at or above your own role"
        )
    if payload.role is UserRole.SUPER_ADMIN and actor.role is not UserRole.SUPER_ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a super admin can create one")

    email = payload.email.lower().strip()
    if await db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered")

    raw_password = payload.password or generate_token(9)
    error = validate_password_strength(raw_password)
    if payload.password and error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, error)

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        job_title=payload.job_title,
        division=payload.division,
        role=payload.role,
        status=UserStatus.ACTIVE,
        hashed_password=hash_password(raw_password),
    )
    db.add(user)
    await record(
        db, actor=actor, action="user.create", entity_type="user", entity_id=email,
        summary=f"Created {payload.role.value} account for {email}", request=request,
    )
    await db.commit()
    await db.refresh(user)

    if payload.send_welcome_email:
        await send_welcome_email(
            email, user.full_name, payload.role.value,
            None if payload.password else raw_password,
        )

    return UserPublic.model_validate(user)


@router.patch("/users/{user_id}", response_model=UserPublic)
async def update_user(
    request: Request,
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> UserPublic:
    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if user.role.rank > actor.role.rank:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot modify a more privileged account")
    if payload.role and payload.role.rank > actor.role.rank:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot promote above your own role")
    if user.role is UserRole.SUPER_ADMIN and actor.id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The super admin can only be edited by themselves")

    before = user.as_dict()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)

    await record(
        db, actor=actor, action="user.update", entity_type="user", entity_id=user.email,
        changes=diff(before, user.as_dict()), request=request,
    )
    await db.commit()
    return UserPublic.model_validate(user)


@router.delete("/users/{user_id}", response_model=Message)
async def deactivate_user(
    request: Request,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    """Soft-disable: real deletion would orphan listings and the audit trail."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.role is UserRole.SUPER_ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The super admin cannot be disabled")
    if user.id == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot disable your own account")

    user.status = UserStatus.DISABLED
    await record(
        db, actor=actor, action="user.disable", entity_type="user", entity_id=user.email,
        request=request,
    )
    await db.commit()
    return Message(detail="Account disabled")


# ================================================================= inbox
@router.get("/enquiries", response_model=Page[ContactMessageOut])
async def contact_messages(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[ContactMessageOut]:
    stmt = select(ContactMessage)
    if status_filter:
        stmt = stmt.where(ContactMessage.status == status_filter)
    total = await db.scalar(
        select(func.count()).select_from(stmt.order_by(None).subquery())
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(ContactMessage.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build([ContactMessageOut.model_validate(r) for r in rows], total, page, per_page)


@router.get("/applications", response_model=Page[JobApplicationOut])
async def applications(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[JobApplicationOut]:
    total = await db.scalar(select(func.count(JobApplication.id))) or 0
    rows = (
        await db.scalars(
            select(JobApplication)
            .order_by(JobApplication.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build([JobApplicationOut.model_validate(r) for r in rows], total, page, per_page)


@router.get("/bookings", response_model=Page[BookingOut])
async def bookings(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[BookingOut]:
    total = await db.scalar(select(func.count(Booking.id))) or 0
    rows = (
        await db.scalars(
            select(Booking)
            .order_by(Booking.scheduled_date.desc(), Booking.scheduled_time)
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build([BookingOut.model_validate(r) for r in rows], total, page, per_page)


@router.post("/bookings/{booking_id}/status", response_model=Message)
async def change_booking_status(
    booking_id: uuid.UUID,
    payload: BookingStatusChange,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Message:
    row = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    row.status = payload.status
    row.cancelled_reason = payload.reason
    await db.commit()
    return Message(detail=f"Booking marked {payload.status.value}")


@router.post("/blocked-dates", response_model=Message, status_code=status.HTTP_201_CREATED)
async def block_date(
    payload: BlockedDateIn,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Message:
    exists = await db.scalar(
        select(BlockedDate.id).where(
            BlockedDate.blocked_on == payload.blocked_on,
            BlockedDate.reason_type == payload.reason_type,
        )
    )
    if exists:
        return Message(detail="That date is already blocked")
    db.add(BlockedDate(**payload.model_dump()))
    await db.commit()
    return Message(detail="Date blocked")


# ================================================================= dashboard
@router.get("/dashboard", summary="Headline counters for the admin home")
async def dashboard(
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> dict:
    return {
        "properties": {
            "total": await db.scalar(select(func.count(Property.id))) or 0,
            "available": await db.scalar(
                select(func.count(Property.id)).where(
                    Property.status == PropertyStatus.AVAILABLE
                )
            ) or 0,
            "pending_review": await db.scalar(
                select(func.count(Property.id)).where(
                    Property.status == PropertyStatus.PENDING_REVIEW
                )
            ) or 0,
        },
        "users": {
            "total": await db.scalar(select(func.count(User.id))) or 0,
            "agents": await db.scalar(
                select(func.count(User.id)).where(User.role == UserRole.AGENT)
            ) or 0,
        },
        "inbox": {
            "contact_new": await db.scalar(
                select(func.count(ContactMessage.id)).where(ContactMessage.status == "new")
            ) or 0,
            "enquiries_new": await db.scalar(
                select(func.count(PropertyEnquiry.id)).where(PropertyEnquiry.status == "new")
            ) or 0,
            "applications_new": await db.scalar(
                select(func.count(JobApplication.id)).where(JobApplication.status == "new")
            ) or 0,
            "bookings_pending": await db.scalar(
                select(func.count(Booking.id)).where(Booking.status == "pending")
            ) or 0,
        },
        "newsletter_subscribers": await db.scalar(
            select(func.count(NewsletterSubscriber.id)).where(
                NewsletterSubscriber.is_active.is_(True)
            )
        ) or 0,
        "trend": await _listing_trend(db),
        "recent": await _recent_activity(db),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def _listing_trend(db: AsyncSession, days: int = 14) -> list[dict]:
    """Listings created per day — one grouped query, not one query per day."""
    since = datetime.now(timezone.utc) - timedelta(days=days - 1)
    day = func.date(Property.created_at).label("day")
    rows = (
        await db.execute(
            select(day, func.count(Property.id))
            .where(Property.created_at >= since)
            .group_by(day)
            .order_by(day)
        )
    ).all()
    counts = {str(r[0]): r[1] for r in rows}

    start = since.date()
    return [
        {"date": str(start + timedelta(days=i)), "count": counts.get(str(start + timedelta(days=i)), 0)}
        for i in range(days)
    ]


async def _recent_activity(db: AsyncSession, limit: int = 8) -> list[dict]:
    """The newest items across the inbox, merged into one feed."""
    feed: list[dict] = []

    enquiries = (
        await db.scalars(
            select(PropertyEnquiry).order_by(PropertyEnquiry.created_at.desc()).limit(limit)
        )
    ).all()
    feed += [
        {
            "kind": "enquiry",
            "title": f"{row.name} enquired",
            "detail": row.message or row.email or row.phone or "",
            "at": row.created_at.isoformat(),
        }
        for row in enquiries
    ]

    messages = (
        await db.scalars(
            select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(limit)
        )
    ).all()
    feed += [
        {
            "kind": "contact",
            "title": f"{row.full_name} sent a message",
            "detail": row.topic or "",
            "at": row.created_at.isoformat(),
        }
        for row in messages
    ]

    bookings = (
        await db.scalars(select(Booking).order_by(Booking.created_at.desc()).limit(limit))
    ).all()
    feed += [
        {
            "kind": "booking",
            "title": f"{row.full_name} booked a consultation",
            "detail": f"{row.scheduled_date} at {row.scheduled_time}",
            "at": row.created_at.isoformat(),
        }
        for row in bookings
    ]

    applications = (
        await db.scalars(
            select(JobApplication).order_by(JobApplication.created_at.desc()).limit(limit)
        )
    ).all()
    feed += [
        {
            "kind": "application",
            "title": f"{row.full_name} applied",
            "detail": row.role_applied or "",
            "at": row.created_at.isoformat(),
        }
        for row in applications
    ]

    feed.sort(key=lambda item: item["at"], reverse=True)
    return feed[:limit]


@router.get("/audit", response_model=Page[AuditLogOut])
async def audit_log(
    entity_type: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_super_admin),
) -> Page[AuditLogOut]:
    stmt = select(AuditLog)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    total = await db.scalar(
        select(func.count()).select_from(stmt.order_by(None).subquery())
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(AuditLog.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build([AuditLogOut.model_validate(r) for r in rows], total, page, per_page)


@router.post("/cache/flush", response_model=Message)
async def flush_cache(_: User = Depends(require_admin)) -> Message:
    await cache.invalidate()
    return Message(detail="Public cache cleared")


# ================================================================= seller intake
@router.get(
    "/seller-submissions",
    response_model=Page[SellerSubmissionOut],
    summary="Sellers asking us to list their property",
)
async def seller_submissions(
    submission_status: str | None = Query(None, alias="status"),
    q: str | None = Query(None, description="Reference, UPI or owner name"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> Page[SellerSubmissionOut]:
    stmt = select(SellerSubmission)
    if submission_status:
        stmt = stmt.where(SellerSubmission.status == submission_status)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            SellerSubmission.reference.ilike(needle) | SellerSubmission.upi.ilike(needle)
        )

    total = await db.scalar(
        select(func.count()).select_from(
            stmt.order_by(None).with_only_columns(SellerSubmission.id).subquery()
        )
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(SellerSubmission.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build(
        [SellerSubmissionOut.model_validate(r) for r in rows], total, page, per_page
    )


@router.patch(
    "/seller-submissions/{submission_id}",
    response_model=SellerSubmissionOut,
    summary="Move a submission through review",
)
async def review_submission(
    request: Request,
    submission_id: uuid.UUID,
    payload: SubmissionReview,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> SellerSubmissionOut:
    row = await db.scalar(
        select(SellerSubmission).where(SellerSubmission.id == submission_id)
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No such submission")

    row.status = payload.status
    row.review_note = payload.review_note
    row.reviewed_by_id = actor.id

    await record(
        db, actor=actor, action="submission.review", entity_type="seller_submission",
        entity_id=row.id, summary=f"{row.reference} → {payload.status.value}", request=request,
    )
    await db.commit()
    await db.refresh(row)
    return SellerSubmissionOut.model_validate(row)


# ================================================================ buyer requests
@router.get(
    "/property-requests",
    response_model=Page[PropertyRequestOut],
    summary="Buyers asking us to find something",
)
async def property_requests(
    request_status: str | None = Query(None, alias="status"),
    q: str | None = Query(None, description="Reference, name, phone or area"),
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> Page[PropertyRequestOut]:
    stmt = select(PropertyRequest)
    if request_status:
        stmt = stmt.where(PropertyRequest.status == request_status)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            PropertyRequest.reference.ilike(needle)
            | PropertyRequest.full_name.ilike(needle)
            | PropertyRequest.phone.ilike(needle)
            | PropertyRequest.preferred_areas.ilike(needle)
        )

    total = await db.scalar(
        select(func.count()).select_from(
            stmt.order_by(None).with_only_columns(PropertyRequest.id).subquery()
        )
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(PropertyRequest.created_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page.build([PropertyRequestOut.model_validate(r) for r in rows], total, page, per_page)


@router.post(
    "/property-requests/{request_id}/review",
    response_model=Message,
    summary="Move a buyer request along",
)
async def review_property_request(
    request: Request,
    request_id: uuid.UUID,
    payload: PropertyRequestReview,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    row = await db.scalar(select(PropertyRequest).where(PropertyRequest.id == request_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")

    row.status = payload.status
    if payload.review_note is not None:
        row.review_note = payload.review_note
    if payload.matched_property_id is not None:
        row.matched_property_id = payload.matched_property_id
    # Left unset means "leave it with whoever has it", not "unassign".
    if payload.assigned_to_id is not None:
        row.assigned_to_id = payload.assigned_to_id

    await record(
        db, actor=actor, action="property_request.review", entity_type="property_request",
        entity_id=row.id, summary=f"{row.reference} marked {payload.status.value}",
        changes={"status": payload.status.value}, request=request,
    )
    await db.commit()
    return Message(detail=f"Request {row.reference} updated")


@router.post(
    "/enquiries/{message_id}/status",
    response_model=Message,
    summary="Mark a message handled",
)
async def change_enquiry_status(
    request: Request,
    message_id: uuid.UUID,
    payload: InboxStatusChange,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    row = await db.scalar(select(ContactMessage).where(ContactMessage.id == message_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")

    row.status = payload.status
    # Records who owns it now, so two people do not answer the same message.
    row.handled_by_id = actor.id
    await record(
        db, actor=actor, action="enquiry.status", entity_type="contact_message",
        entity_id=row.id, summary=f"Message from {row.full_name} marked {payload.status}",
        changes={"status": payload.status}, request=request,
    )
    await db.commit()
    return Message(detail=f"Message marked {payload.status}")


@router.post(
    "/applications/{application_id}/status",
    response_model=Message,
    summary="Move an application along",
)
async def change_application_status(
    request: Request,
    application_id: uuid.UUID,
    payload: InboxStatusChange,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> Message:
    row = await db.scalar(select(JobApplication).where(JobApplication.id == application_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    row.status = payload.status
    await record(
        db, actor=actor, action="application.status", entity_type="job_application",
        entity_id=row.id, summary=f"{row.full_name} marked {payload.status}",
        changes={"status": payload.status}, request=request,
    )
    await db.commit()
    return Message(detail=f"Application marked {payload.status}")
