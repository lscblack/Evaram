import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.content import (
    BookingStatus,
    PropertyRequestStatus,
    SellerSubmissionStatus,
    SettingType,
    SubmissionFileKind,
)
from app.schemas.common import ORMModel


# ---------------------------------------------------------------- settings
class SettingOut(ORMModel):
    id: uuid.UUID
    key: str
    label: str
    description: str | None = None
    group: str
    value: str | None = None
    value_type: SettingType
    options: list | None = None
    is_public: bool
    is_protected: bool
    display_order: int


class SettingUpdate(BaseModel):
    value: str | None = None
    label: str | None = None
    description: str | None = None


class SettingReset(BaseModel):
    """Restore a group of settings — or named keys — to their shipped defaults."""

    group: str | None = None
    keys: list[str] | None = None


class SettingBulkUpdate(BaseModel):
    values: dict[str, str | None]


# ---------------------------------------------------------------- blocks
class ContentBlockOut(ORMModel):
    id: uuid.UUID
    page: str
    key: str
    label: str
    eyebrow: str | None = None
    title: str | None = None
    accent: str | None = None
    body: str | None = None
    items: list | None = None
    image_url: str | None = None
    cta_label: str | None = None
    cta_href: str | None = None
    translations: dict | None = None
    display_order: int
    is_active: bool


class ContentBlockCreate(BaseModel):
    page: str = Field(min_length=1, max_length=64)
    key: str = Field(min_length=1, max_length=96)
    label: str = Field(min_length=1, max_length=160)
    eyebrow: str | None = None
    title: str | None = None
    accent: str | None = None
    body: str | None = None
    items: list | None = None
    image_url: str | None = None
    cta_label: str | None = None
    cta_href: str | None = None
    translations: dict | None = None
    display_order: int = 0
    is_active: bool = True


class ContentBlockUpdate(BaseModel):
    label: str | None = None
    eyebrow: str | None = None
    title: str | None = None
    accent: str | None = None
    body: str | None = None
    items: list | None = None
    image_url: str | None = None
    cta_label: str | None = None
    cta_href: str | None = None
    translations: dict | None = None
    display_order: int | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------- ui strings
class UiStringOut(ORMModel):
    id: uuid.UUID
    key: str
    namespace: str
    en: str
    rw: str | None = None
    fr: str | None = None
    needs_review: bool


class UiStringUpsert(BaseModel):
    key: str = Field(min_length=1, max_length=96)
    namespace: str = "common"
    en: str
    rw: str | None = None
    fr: str | None = None
    needs_review: bool = False


# ---------------------------------------------------------------- catalogue content
class TestimonialOut(ORMModel):
    id: uuid.UUID
    quote: str
    author_name: str
    author_role: str | None = None
    location: str | None = None
    photo_url: str | None = None
    milestone: str | None = None
    rating: int
    display_order: int
    is_published: bool
    translations: dict | None = None


class TestimonialIn(BaseModel):
    quote: str
    author_name: str
    author_role: str | None = None
    location: str | None = None
    photo_url: str | None = None
    milestone: str | None = None
    rating: int = Field(default=5, ge=1, le=5)
    display_order: int = 0
    is_published: bool = True
    translations: dict | None = None


class InsightCard(ORMModel):
    id: uuid.UUID
    slug: str
    title: str
    excerpt: str | None = None
    category: str
    cover_url: str | None = None
    read_time: int
    tags: list[str] | None = None
    author_name: str | None = None
    author_role: str | None = None
    is_featured: bool
    published_at: date | None = None


class InsightDetail(InsightCard):
    body: list | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    view_count: int
    translations: dict | None = None
    updated_at: datetime


class InsightIn(BaseModel):
    slug: str | None = None
    title: str = Field(min_length=4, max_length=320)
    excerpt: str | None = None
    body: list | None = None
    category: str = "Market Report"
    cover_url: str | None = None
    read_time: int = 5
    tags: list[str] | None = None
    author_name: str | None = None
    author_role: str | None = None
    is_featured: bool = False
    is_published: bool = False
    published_at: date | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    translations: dict | None = None


class FaqOut(ORMModel):
    id: uuid.UUID
    page: str
    question: str
    answer: str
    display_order: int
    is_published: bool
    translations: dict | None = None


class FaqIn(BaseModel):
    page: str = "home"
    question: str
    answer: str
    display_order: int = 0
    is_published: bool = True
    translations: dict | None = None


class ServiceLineOut(ORMModel):
    id: uuid.UUID
    slug: str
    title: str
    tagline: str | None = None
    description: str | None = None
    division: str
    icon: str | None = None
    bullets: list[str] | None = None
    href: str | None = None
    display_order: int
    is_active: bool
    translations: dict | None = None


class ConstructionPackageOut(ORMModel):
    """Public package shape.

    The per-square-metre rate is withheld unless the package opts in. A figure
    quoted before anyone has walked the plot is one clients hold you to, and
    slope, access and soil move it more than the finish does.
    """

    id: uuid.UUID
    slug: str
    name: str
    tier: str
    tagline: str | None = None
    suited_to: str | None = None
    description: str | None = None
    price_per_sqm: float | None = None
    show_price: bool = False
    price_note: str | None = None
    currency: str
    duration: str | None = None
    includes: list[str] | None = None
    finishes: list | None = None
    is_popular: bool
    display_order: int
    is_active: bool
    translations: dict | None = None


class WealthCycleStepOut(ORMModel):
    id: uuid.UUID
    step: int
    title: str
    action: str
    outcome: str
    icon: str | None = None
    translations: dict | None = None


class MarketStatOut(ORMModel):
    id: uuid.UUID
    key: str
    value: str
    label: str
    detail: str | None = None
    icon: str | None = None
    source: str | None = None
    display_order: int
    translations: dict | None = None


class NavigationItemOut(ORMModel):
    id: uuid.UUID
    menu: str
    parent_id: uuid.UUID | None = None
    label: str
    translation_key: str | None = None
    href: str
    description: str | None = None
    icon: str | None = None
    display_order: int
    children: list["NavigationItemOut"] = []


# ---------------------------------------------------------------- bookings
class ConsultationTypeOut(ORMModel):
    id: uuid.UUID
    slug: str
    title: str
    description: str | None = None
    duration_minutes: int
    price_label: str
    icon: str | None = None
    modes: list[str] | None = None
    available_days: list[int] | None = None
    slots: list[str] | None = None
    display_order: int
    is_active: bool
    translations: dict | None = None


class AvailabilityDay(BaseModel):
    date: date
    state: str  # available | full | closed | unavailable
    open_slots: list[str] = []


class BookingCreate(BaseModel):
    consultation_type_id: uuid.UUID
    property_id: uuid.UUID | None = None
    agent_id: uuid.UUID | None = None
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr | None = None
    phone: str = Field(min_length=6, max_length=48)
    notes: str | None = Field(default=None, max_length=4000)
    mode: str | None = None
    scheduled_date: date
    scheduled_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    captcha_token: str | None = None
    captcha_answer: str | None = None


class BookingOut(ORMModel):
    id: uuid.UUID
    reference: str
    consultation_type_id: uuid.UUID
    property_id: uuid.UUID | None = None
    agent_id: uuid.UUID | None = None
    full_name: str
    email: str | None = None
    phone: str
    notes: str | None = None
    mode: str | None = None
    scheduled_date: date
    scheduled_time: str
    status: BookingStatus
    created_at: datetime


class BookingStatusChange(BaseModel):
    status: BookingStatus
    reason: str | None = None


class BlockedDateIn(BaseModel):
    blocked_on: date
    reason_type: str = "closed"
    note: str | None = None


# ---------------------------------------------------------------- inbound
class ContactMessageCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=48)
    topic: str | None = None
    budget: str | None = None
    based_in: str | None = None
    message: str = Field(min_length=4, max_length=6000)
    captcha_token: str | None = None
    captcha_answer: str | None = None


class ContactMessageOut(ORMModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None = None
    topic: str | None = None
    budget: str | None = None
    based_in: str | None = None
    message: str
    status: str
    created_at: datetime


class NewsletterSubscribe(BaseModel):
    email: EmailStr
    locale: str = "en"
    source: str | None = None


class JobApplicationCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=48)
    role_applied: str
    area_covered: str | None = None
    years_experience: int | None = Field(default=None, ge=0, le=70)
    pitch: str = Field(min_length=10, max_length=6000)
    portfolio_url: str | None = None
    captcha_token: str | None = None
    captcha_answer: str | None = None


class JobApplicationOut(ORMModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str
    role_applied: str
    area_covered: str | None = None
    years_experience: int | None = None
    pitch: str
    portfolio_url: str | None = None
    status: str
    created_at: datetime


class AuditLogOut(ORMModel):
    id: uuid.UUID
    actor_email: str | None = None
    action: str
    entity_type: str
    entity_id: str | None = None
    summary: str | None = None
    changes: dict | None = None
    ip_address: str | None = None
    created_at: datetime


NavigationItemOut.model_rebuild()


# ---------------------------------------------------------------- seller intake
class SubmissionOwnerIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str = Field(min_length=4, max_length=48)
    email: EmailStr | None = None
    national_id: str | None = Field(default=None, max_length=64)
    is_primary: bool = False


class SellerSubmissionCreate(BaseModel):
    """What a seller tells us before anything is listed."""

    upi: str = Field(min_length=4, max_length=64)
    district: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=80)
    location: str | None = Field(default=None, max_length=240)
    property_type: str | None = Field(default=None, max_length=120)
    asking_price: float | None = Field(default=None, ge=0)
    size: float | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=4000)
    #: Every registered owner. A parcel in joint names needs all of them.
    owners: list[SubmissionOwnerIn] = Field(min_length=1, max_length=12)
    captcha_token: str | None = None
    captcha_answer: str | None = None


class SubmissionOwnerOut(ORMModel):
    id: uuid.UUID
    full_name: str
    phone: str
    email: str | None = None
    national_id: str | None = None
    is_primary: bool
    display_order: int


class SubmissionFileOut(ORMModel):
    id: uuid.UUID
    owner_id: uuid.UUID | None = None
    kind: SubmissionFileKind
    url: str
    original_name: str | None = None
    content_type: str | None = None
    bytes: int


class SellerSubmissionReceipt(BaseModel):
    """Returned on create — the token is what lets the browser attach files."""

    id: uuid.UUID
    reference: str
    upload_token: str
    expires_in: int
    owners: list[SubmissionOwnerOut]
    detail: str


class SellerSubmissionOut(ORMModel):
    id: uuid.UUID
    reference: str
    upi: str
    district: str | None = None
    sector: str | None = None
    location: str | None = None
    property_type: str | None = None
    asking_price: float | None = None
    size: float | None = None
    notes: str | None = None
    status: SellerSubmissionStatus
    review_note: str | None = None
    property_id: uuid.UUID | None = None
    created_at: datetime
    owners: list[SubmissionOwnerOut] = []
    files: list[SubmissionFileOut] = []


class SubmissionReview(BaseModel):
    status: SellerSubmissionStatus
    review_note: str | None = Field(default=None, max_length=2000)


# ------------------------------------------------------- buyer property requests
class PropertyRequestCreate(BaseModel):
    """What a buyer tells us when nothing in the catalogue fits."""

    full_name: str = Field(min_length=2, max_length=160)
    phone: str = Field(min_length=6, max_length=48)
    email: EmailStr | None = None

    intent: Literal["sale", "rent"] = "sale"
    category_id: uuid.UUID | None = None
    subcategory_id: uuid.UUID | None = None

    district: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=80)
    preferred_areas: str | None = Field(default=None, max_length=320)

    budget_min: float | None = Field(default=None, ge=0)
    budget_max: float | None = Field(default=None, ge=0)
    size_min: float | None = Field(default=None, ge=0)
    bedrooms_min: int | None = Field(default=None, ge=0, le=40)
    timeline: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=4000)

    captcha_token: str | None = None
    captcha_answer: str | None = None

    @model_validator(mode="after")
    def check_budget(self) -> "PropertyRequestCreate":
        if (
            self.budget_min is not None
            and self.budget_max is not None
            and self.budget_min > self.budget_max
        ):
            raise ValueError("The minimum budget cannot be above the maximum.")
        return self


class PropertyRequestOut(ORMModel):
    id: uuid.UUID
    reference: str
    full_name: str
    email: str | None = None
    phone: str
    intent: str
    category_id: uuid.UUID | None = None
    subcategory_id: uuid.UUID | None = None
    district: str | None = None
    sector: str | None = None
    preferred_areas: str | None = None
    budget_min: float | None = None
    budget_max: float | None = None
    currency: str
    size_min: float | None = None
    bedrooms_min: int | None = None
    timeline: str | None = None
    notes: str | None = None
    status: PropertyRequestStatus
    review_note: str | None = None
    matched_property_id: uuid.UUID | None = None
    created_at: datetime


class PropertyRequestReceipt(BaseModel):
    id: uuid.UUID
    reference: str
    detail: str


class PropertyRequestReview(BaseModel):
    status: PropertyRequestStatus
    review_note: str | None = Field(default=None, max_length=2000)
    matched_property_id: uuid.UUID | None = None
    assigned_to_id: uuid.UUID | None = None


class InboxStatusChange(BaseModel):
    """Moving a message or an application along.

    Free-form rather than an enum: these two tables store status as a plain
    string, and constraining it here would reject values already in the data.
    """

    status: Literal["new", "reading", "handled", "closed", "shortlisted", "rejected"]
    note: str | None = Field(default=None, max_length=2000)


# ------------------------------------------------------------ service line CRUD
class ServiceLineCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1, max_length=160)
    tagline: str | None = Field(default=None, max_length=240)
    description: str | None = None
    division: str = Field(default="Group", max_length=40)
    icon: str | None = Field(default=None, max_length=64)
    bullets: list[str] | None = None
    href: str | None = Field(default=None, max_length=320)
    translations: dict | None = None
    display_order: int = 0
    is_active: bool = True


class ServiceLineUpdate(BaseModel):
    """Every field optional — a PATCH only touches what it names."""

    slug: str | None = Field(default=None, min_length=1, max_length=64)
    title: str | None = Field(default=None, min_length=1, max_length=160)
    tagline: str | None = Field(default=None, max_length=240)
    description: str | None = None
    division: str | None = Field(default=None, max_length=40)
    icon: str | None = Field(default=None, max_length=64)
    bullets: list[str] | None = None
    href: str | None = Field(default=None, max_length=320)
    translations: dict | None = None
    display_order: int | None = None
    is_active: bool | None = None


# ------------------------------------------------------------ market stat CRUD
class MarketStatCreate(BaseModel):
    key: str = Field(min_length=1, max_length=64)
    value: str = Field(min_length=1, max_length=64)
    label: str = Field(min_length=1, max_length=160)
    detail: str | None = Field(default=None, max_length=240)
    icon: str | None = Field(default=None, max_length=64)
    source: str | None = Field(default=None, max_length=240)
    translations: dict | None = None
    display_order: int = 0
    is_active: bool = True


class MarketStatUpdate(BaseModel):
    key: str | None = Field(default=None, min_length=1, max_length=64)
    value: str | None = Field(default=None, min_length=1, max_length=64)
    label: str | None = Field(default=None, min_length=1, max_length=160)
    detail: str | None = Field(default=None, max_length=240)
    icon: str | None = Field(default=None, max_length=64)
    source: str | None = Field(default=None, max_length=240)
    translations: dict | None = None
    display_order: int | None = None
    is_active: bool | None = None
