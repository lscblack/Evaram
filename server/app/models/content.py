import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKey


class SettingType(str, enum.Enum):
    STRING = "string"
    TEXT = "text"
    NUMBER = "number"
    BOOLEAN = "boolean"
    JSON = "json"
    COLOR = "color"
    IMAGE = "image"
    URL = "url"
    EMAIL = "email"


class SiteSetting(Base, UUIDPrimaryKey, TimestampMixin):
    """
    Every tunable the front end reads at boot — brand colours, logos, contact
    details, feature flags. Grouped so the super-admin UI can render tabs.
    """

    __tablename__ = "site_settings"
    __table_args__ = (Index("ix_settings_group_order", "group", "display_order"),)

    key: Mapped[str] = mapped_column(String(96), unique=True, index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    group: Mapped[str] = mapped_column(String(48), default="general", nullable=False, index=True)
    value: Mapped[str | None] = mapped_column(Text)
    value_type: Mapped[SettingType] = mapped_column(
        SAEnum(SettingType, name="setting_type", values_callable=lambda e: [m.value for m in e]),
        default=SettingType.STRING,
        nullable=False,
    )
    #: Exposed on the unauthenticated `/public/bootstrap` payload.
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    #: Only a super admin may change it (branding, security toggles).
    is_protected: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ContentBlock(Base, UUIDPrimaryKey, TimestampMixin):
    """
    A named slice of page copy. Everything the marketing site renders as
    "static" text lives here so an admin can edit it without a deploy.
    """

    __tablename__ = "content_blocks"
    __table_args__ = (
        UniqueConstraint("page", "key", name="uq_block_page_key"),
        Index("ix_blocks_page_order", "page", "display_order"),
    )

    page: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    key: Mapped[str] = mapped_column(String(96), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    eyebrow: Mapped[str | None] = mapped_column(String(160))
    title: Mapped[str | None] = mapped_column(String(320))
    accent: Mapped[str | None] = mapped_column(String(160))
    body: Mapped[str | None] = mapped_column(Text)
    #: Repeaters — bullet lists, stat rows, step cards.
    items: Mapped[list | None] = mapped_column(JSONB)
    image_url: Mapped[str | None] = mapped_column(String(768))
    cta_label: Mapped[str | None] = mapped_column(String(120))
    cta_href: Mapped[str | None] = mapped_column(String(320))
    #: Kinyarwanda / French overrides, same shape as the English columns.
    translations: Mapped[dict | None] = mapped_column(JSONB)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class UiString(Base, UUIDPrimaryKey, TimestampMixin):
    """Short UI labels (`nav.home`, `cta.search`) in all three languages."""

    __tablename__ = "ui_strings"
    __table_args__ = (Index("ix_ui_strings_namespace", "namespace"),)

    key: Mapped[str] = mapped_column(String(96), unique=True, index=True, nullable=False)
    namespace: Mapped[str] = mapped_column(String(32), default="common", nullable=False)
    en: Mapped[str] = mapped_column(Text, nullable=False)
    rw: Mapped[str | None] = mapped_column(Text)
    fr: Mapped[str | None] = mapped_column(Text)
    #: Flags strings whose translation has not been reviewed by a speaker.
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class NavigationItem(Base, UUIDPrimaryKey, TimestampMixin):
    """Admin-managed navigation tree (header and footer)."""

    __tablename__ = "navigation_items"
    __table_args__ = (Index("ix_nav_menu_parent_order", "menu", "parent_id", "display_order"),)

    menu: Mapped[str] = mapped_column(String(32), default="header", nullable=False, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("navigation_items.id", ondelete="CASCADE")
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    #: Key into `ui_strings` so the label can be translated.
    translation_key: Mapped[str | None] = mapped_column(String(96))
    href: Mapped[str] = mapped_column(String(320), nullable=False)
    description: Mapped[str | None] = mapped_column(String(320))
    icon: Mapped[str | None] = mapped_column(String(64))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    children: Mapped[list["NavigationItem"]] = relationship(
        cascade="all, delete-orphan", passive_deletes=True
    )


class Testimonial(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "testimonials"

    quote: Mapped[str] = mapped_column(Text, nullable=False)
    author_name: Mapped[str] = mapped_column(String(160), nullable=False)
    author_role: Mapped[str | None] = mapped_column(String(160))
    location: Mapped[str | None] = mapped_column(String(160))
    photo_url: Mapped[str | None] = mapped_column(String(768))
    milestone: Mapped[str | None] = mapped_column(String(240))
    rating: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class Insight(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "insights"
    __table_args__ = (
        Index("ix_insight_published_date", "is_published", "published_at"),
        Index(
            "ix_insight_search_trgm",
            "title",
            postgresql_using="gin",
            postgresql_ops={"title": "gin_trgm_ops"},
        ),
    )

    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(320), nullable=False)
    excerpt: Mapped[str | None] = mapped_column(Text)
    #: Ordered blocks: `{type: p|h2|quote|list, text?, items?}`.
    body: Mapped[list | None] = mapped_column(JSONB)
    category: Mapped[str] = mapped_column(String(64), default="Market Report", nullable=False, index=True)
    cover_url: Mapped[str | None] = mapped_column(String(768))
    read_time: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    tags: Mapped[list[str] | None] = mapped_column(JSONB)
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    author_name: Mapped[str | None] = mapped_column(String(160))
    author_role: Mapped[str | None] = mapped_column(String(160))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    published_at: Mapped[date | None] = mapped_column(Date, index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    seo_title: Mapped[str | None] = mapped_column(String(240))
    seo_description: Mapped[str | None] = mapped_column(Text)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class Faq(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "faqs"
    __table_args__ = (Index("ix_faq_page_order", "page", "display_order"),)

    page: Mapped[str] = mapped_column(String(64), default="home", nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class ServiceLine(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "service_lines"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    tagline: Mapped[str | None] = mapped_column(String(240))
    description: Mapped[str | None] = mapped_column(Text)
    division: Mapped[str] = mapped_column(String(40), default="Group", nullable=False, index=True)
    icon: Mapped[str | None] = mapped_column(String(64))
    bullets: Mapped[list[str] | None] = mapped_column(JSONB)
    href: Mapped[str | None] = mapped_column(String(320))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class ConstructionPackage(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "construction_packages"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    tier: Mapped[str] = mapped_column(String(40), nullable=False)
    tagline: Mapped[str | None] = mapped_column(String(240))
    description: Mapped[str | None] = mapped_column(Text)
    #: Kept for internal estimating. Whether the public sees it is a separate
    #: decision — a per-sqm figure quoted before a site visit is a number people
    #: hold you to, and every plot differs.
    price_per_sqm: Mapped[float] = mapped_column(Float, nullable=False)
    show_price: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    #: What the public sees instead of a figure.
    price_note: Mapped[str | None] = mapped_column(String(240))
    #: Who the package is for — the thing buyers actually choose on.
    suited_to: Mapped[str | None] = mapped_column(String(240))
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)
    duration: Mapped[str | None] = mapped_column(String(80))
    includes: Mapped[list[str] | None] = mapped_column(JSONB)
    #: `[{label, value}]` specification rows.
    finishes: Mapped[list | None] = mapped_column(JSONB)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class WealthCycleStep(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "wealth_cycle_steps"

    step: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class ConsultationType(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "consultation_types"

    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    price_label: Mapped[str] = mapped_column(String(80), default="Free", nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64))
    modes: Mapped[list[str] | None] = mapped_column(JSONB)
    #: ISO weekday numbers, 0 = Sunday.
    available_days: Mapped[list[int] | None] = mapped_column(JSONB)
    slots: Mapped[list[str] | None] = mapped_column(JSONB)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class BookingStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class Booking(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "bookings"
    __table_args__ = (
        Index("ix_booking_date_status", "scheduled_date", "status"),
        UniqueConstraint(
            "consultation_type_id", "scheduled_date", "scheduled_time", "agent_id",
            name="uq_booking_slot",
        ),
    )

    reference: Mapped[str] = mapped_column(String(24), unique=True, index=True, nullable=False)
    consultation_type_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("consultation_types.id", ondelete="RESTRICT"), nullable=False
    )
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), index=True
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(48), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text)
    mode: Mapped[str | None] = mapped_column(String(64))

    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    scheduled_time: Mapped[str] = mapped_column(String(8), nullable=False)
    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="booking_status", values_callable=lambda e: [m.value for m in e]),
        default=BookingStatus.PENDING,
        nullable=False,
        index=True,
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_reason: Mapped[str | None] = mapped_column(Text)


class BlockedDate(Base, UUIDPrimaryKey, TimestampMixin):
    """Office closures and fully-booked days, managed by an admin."""

    __tablename__ = "blocked_dates"
    __table_args__ = (UniqueConstraint("blocked_on", "reason_type", name="uq_blocked_date"),)

    blocked_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    #: "closed" (public holiday) or "full" (no capacity left).
    reason_type: Mapped[str] = mapped_column(String(24), default="closed", nullable=False)
    note: Mapped[str | None] = mapped_column(String(240))


class MarketStat(Base, UUIDPrimaryKey, TimestampMixin):
    """Headline market figures shown on the home page."""

    __tablename__ = "market_stats"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    value: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(320))
    icon: Mapped[str | None] = mapped_column(String(64))
    source: Mapped[str | None] = mapped_column(String(320))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    translations: Mapped[dict | None] = mapped_column(JSONB)


class NewsletterSubscriber(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "newsletter_subscribers"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source: Mapped[str | None] = mapped_column(String(64))


class ContactMessage(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "contact_messages"
    __table_args__ = (Index("ix_contact_status_created", "status", "created_at"),)

    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(48))
    topic: Mapped[str | None] = mapped_column(String(96))
    budget: Mapped[str | None] = mapped_column(String(64))
    based_in: Mapped[str | None] = mapped_column(String(120))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="new", nullable=False, index=True)
    handled_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    ip_address: Mapped[str | None] = mapped_column(String(64))


class JobApplication(Base, UUIDPrimaryKey, TimestampMixin):
    """Submissions from the Join Us page."""

    __tablename__ = "job_applications"

    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(48), nullable=False)
    role_applied: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    area_covered: Mapped[str | None] = mapped_column(String(160))
    years_experience: Mapped[int | None] = mapped_column(Integer)
    pitch: Mapped[str] = mapped_column(Text, nullable=False)
    portfolio_url: Mapped[str | None] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(32), default="new", nullable=False, index=True)
    reviewer_notes: Mapped[str | None] = mapped_column(Text)


class AuditLog(Base, UUIDPrimaryKey, TimestampMixin):
    """Who changed what. Append-only."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_actor_created", "actor_id", "created_at"),
    )

    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    actor_email: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64))
    summary: Mapped[str | None] = mapped_column(String(480))
    changes: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    user_agent: Mapped[str | None] = mapped_column(String(320))


class SellerSubmissionStatus(str, enum.Enum):
    NEW = "new"
    REVIEWING = "reviewing"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class SellerSubmission(Base, UUIDPrimaryKey, TimestampMixin):
    """An owner asking us to sell their property.

    Not a listing. It is the paperwork an agent needs before one can exist: the
    parcel identifier, every owner's identity document, and photographs. A
    consultant verifies all of it at the National Land Authority and only then
    creates the property.
    """

    __tablename__ = "seller_submissions"
    __table_args__ = (
        Index("ix_seller_submission_status", "status", "created_at"),
        Index("ix_seller_submission_upi", "upi"),
    )

    #: Our own handle for the submission — quoted back to the seller.
    reference: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    #: Set when the form was filled by a signed-in user, so they can follow the
    #: submission from their account. Anonymous submissions are still accepted —
    #: an owner should not have to register to ask us to sell for them.
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    #: The parcel identifier. Required: without it there is nothing to verify.
    upi: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    district: Mapped[str | None] = mapped_column(String(80))
    sector: Mapped[str | None] = mapped_column(String(80))
    location: Mapped[str | None] = mapped_column(String(240))
    property_type: Mapped[str | None] = mapped_column(String(120))
    asking_price: Mapped[float | None] = mapped_column(Numeric(16, 2))
    size: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)

    status: Mapped[SellerSubmissionStatus] = mapped_column(
        SAEnum(
            SellerSubmissionStatus,
            name="seller_submission_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=SellerSubmissionStatus.NEW,
        nullable=False,
        index=True,
    )
    review_note: Mapped[str | None] = mapped_column(Text)
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    #: Set once a consultant turns this into a real listing.
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL")
    )

    #: Short-lived secret so only the person who filled the form can attach
    #: files to it. Beats leaving the submission id as an open upload target.
    upload_token: Mapped[str] = mapped_column(String(64), nullable=False)
    upload_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    ip_address: Mapped[str | None] = mapped_column(String(64))

    owners: Mapped[list["SellerSubmissionOwner"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )
    files: Mapped[list["SellerSubmissionFile"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
    )


class SellerSubmissionOwner(Base, UUIDPrimaryKey, TimestampMixin):
    """One registered owner. A parcel can have several, and all must be reachable."""

    __tablename__ = "seller_submission_owners"
    __table_args__ = (Index("ix_submission_owner", "submission_id", "display_order"),)

    submission_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("seller_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    phone: Mapped[str] = mapped_column(String(48), nullable=False)
    email: Mapped[str | None] = mapped_column(String(240))
    national_id: Mapped[str | None] = mapped_column(String(64))
    #: The co-owner who signed the mandate and speaks for the rest.
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    submission: Mapped["SellerSubmission"] = relationship(back_populates="owners")


class SubmissionFileKind(str, enum.Enum):
    ID_DOCUMENT = "id_document"
    PROPERTY_PHOTO = "property_photo"
    TITLE_DEED = "title_deed"
    OTHER = "other"


class SellerSubmissionFile(Base, UUIDPrimaryKey, TimestampMixin):
    """An uploaded document or photograph attached to a submission."""

    __tablename__ = "seller_submission_files"
    __table_args__ = (Index("ix_submission_file", "submission_id", "kind"),)

    submission_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("seller_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    #: Which owner this belongs to — an ID document always names one.
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("seller_submission_owners.id", ondelete="CASCADE")
    )
    kind: Mapped[SubmissionFileKind] = mapped_column(
        SAEnum(
            SubmissionFileKind,
            name="submission_file_kind",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(String(768), nullable=False)
    original_name: Mapped[str | None] = mapped_column(String(240))
    content_type: Mapped[str | None] = mapped_column(String(120))
    bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    submission: Mapped["SellerSubmission"] = relationship(back_populates="files")


class PropertyRequestStatus(str, enum.Enum):
    OPEN = "open"
    MATCHED = "matched"
    FULFILLED = "fulfilled"
    CLOSED = "closed"


class PropertyRequest(Base, UUIDPrimaryKey, TimestampMixin):
    """A buyer describing what they want when nothing listed matches.

    The mirror image of `SellerSubmission`: that one is an owner offering a
    parcel, this is a buyer asking for one. Most of our stock never reaches the
    public catalogue, so a standing request is how a consultant knows to call
    someone the week a matching parcel comes in.
    """

    __tablename__ = "property_requests"
    __table_args__ = (
        Index("ix_request_status_created", "status", "created_at"),
        Index("ix_request_district", "district"),
    )

    #: Quoted back to the buyer so they can refer to it.
    reference: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    #: Set when a signed-in user submitted it, so it shows in their account.
    requested_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(240))
    phone: Mapped[str] = mapped_column(String(48), nullable=False)

    #: "sale" or "rent" — what the buyer is after, mirroring ListingIntent.
    intent: Mapped[str] = mapped_column(String(16), default="sale", nullable=False)
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("property_categories.id", ondelete="SET NULL")
    )
    subcategory_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("property_subcategories.id", ondelete="SET NULL")
    )

    district: Mapped[str | None] = mapped_column(String(80))
    sector: Mapped[str | None] = mapped_column(String(80))
    #: Free text — buyers think in neighbourhoods, not administrative units.
    preferred_areas: Mapped[str | None] = mapped_column(String(320))

    budget_min: Mapped[float | None] = mapped_column(Numeric(16, 2))
    budget_max: Mapped[float | None] = mapped_column(Numeric(16, 2))
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)

    size_min: Mapped[float | None] = mapped_column(Float)
    bedrooms_min: Mapped[int | None] = mapped_column(Integer)
    #: How soon they want to move — drives how hard a consultant chases it.
    timeline: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)

    status: Mapped[PropertyRequestStatus] = mapped_column(
        SAEnum(
            PropertyRequestStatus,
            name="property_request_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=PropertyRequestStatus.OPEN,
        nullable=False,
        index=True,
    )
    review_note: Mapped[str | None] = mapped_column(Text)
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    #: Set once a consultant ties the request to a parcel that satisfies it.
    matched_property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL")
    )

    ip_address: Mapped[str | None] = mapped_column(String(64))
