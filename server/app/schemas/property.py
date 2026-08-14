import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.property import (
    BidStatus,
    ListingIntent,
    MediaKind,
    PropertyStatus,
    UploaderType,
)
from app.schemas.common import ORMModel


# ---------------------------------------------------------------- media
class MediaOut(ORMModel):
    id: uuid.UUID
    kind: MediaKind
    url: str
    thumbnail_url: str | None = None
    caption: str | None = None
    alt_text: str | None = None
    is_cover: bool
    display_order: int
    width: int | None = None
    height: int | None = None
    meta: dict | None = None


class MediaCreate(BaseModel):
    kind: MediaKind = MediaKind.IMAGE
    url: str = Field(min_length=1, max_length=768)
    thumbnail_url: str | None = None
    caption: str | None = None
    alt_text: str | None = None
    is_cover: bool = False
    display_order: int = 0
    meta: dict | None = None


# ---------------------------------------------------------------- geometry
class BoundaryGeoJSON(BaseModel):
    """A GeoJSON Polygon / MultiPolygon describing the parcel outline."""

    type: Literal["Polygon", "MultiPolygon"]
    coordinates: list

    @field_validator("coordinates")
    @classmethod
    def _non_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("coordinates must not be empty")
        return v


# ---------------------------------------------------------------- read
class PropertyAgent(ORMModel):
    id: uuid.UUID
    full_name: str
    job_title: str | None = None
    email: EmailStr
    phone: str | None = None
    photo_url: str | None = None
    rating: float | None = None
    deals_closed: int
    languages: list[str] | None = None


class PropertyCard(ORMModel):
    """The public listing shape — deliberately narrow.

    Carries no UPI: the parcel identifier is what someone needs to look a title
    up at the National Land Authority, so the public sees the agency reference
    instead. Staff read the UPI through the admin endpoints.
    """

    id: uuid.UUID
    reference_number: str
    slug: str
    title: str
    summary: str | None = None
    category_id: uuid.UUID
    subcategory_id: uuid.UUID
    category_label: str | None = None
    subcategory_label: str | None = None
    location: str | None = None
    district: str | None = None
    sector: str | None = None
    status: PropertyStatus
    intent: ListingIntent
    currency: str
    price: float | None = None
    rent_amount: float | None = None
    size: float | None = None
    built_area: float | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    projected_yield: float | None = None
    appreciation: float | None = None
    is_verified: bool
    is_featured: bool
    tags: list[str] | None = None
    cover_url: str | None = None
    second_image_url: str | None = None
    has_vr_tour: bool = False
    has_360_video: bool = False
    created_at: datetime


class PropertyDetail(PropertyCard):
    description: str | None = None
    title_rw: str | None = None
    title_fr: str | None = None
    summary_rw: str | None = None
    summary_fr: str | None = None
    province: str | None = None
    cell: str | None = None
    village: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    gis_coordinates: str | None = None
    boundary_geojson: dict | None = None
    boundary_points: list | None = None
    boundary_area_sqm: float | None = None
    parcel_id: str | None = None
    land_use: str | None = None
    right_type: str | None = None
    amount_paid: float | None = None
    is_negotiable: bool
    details: dict | None = None
    parcel_information: dict | None = None
    amenities: list[str] | None = None
    video_link: str | None = None
    video_360_url: str | None = None
    vr_tour_url: str | None = None
    vr_tour_provider: str | None = None
    panorama_scenes: list | None = None
    drone_footage_url: str | None = None
    #: Only populated when the owner has opted in via `show_owner_info`.
    owner_name: str | None = None
    owner_contact: str | None = None
    show_owner_info: bool = False
    show_on_map: bool = True
    allow_bidding: bool = False
    min_bid: float | None = None
    bidding_closes_at: datetime | None = None
    bidding: "BidSummary | None" = None
    uploader_type: UploaderType
    verified_at: datetime | None = None
    published_at: datetime | None = None
    view_count: int
    seo_title: str | None = None
    seo_description: str | None = None
    media: list[MediaOut] = []
    agent: PropertyAgent | None = None
    updated_at: datetime


class PropertyCardAdmin(PropertyCard):
    """Console listing shape — adds the fields the public must not see."""

    upi: str | None = None
    show_on_public: bool = True
    show_owner_info: bool = False
    show_on_map: bool = True
    allow_bidding: bool = False
    is_archived: bool = False


class PropertyDetailAdmin(PropertyDetail):
    """Console detail — the UPI and the owner's contact are always present."""

    upi: str | None = None
    show_on_public: bool = True
    is_archived: bool = False
    rejection_reason: str | None = None


# ---------------------------------------------------------------- write
class PropertyBase(BaseModel):
    reference_number: str = Field(min_length=2, max_length=40)
    upi: str | None = Field(default=None, max_length=64)
    title: str = Field(min_length=4, max_length=240)
    title_rw: str | None = None
    title_fr: str | None = None
    summary: str | None = None
    summary_rw: str | None = None
    summary_fr: str | None = None
    description: str | None = None

    category_id: uuid.UUID
    subcategory_id: uuid.UUID

    location: str | None = None
    province: str | None = None
    district: str | None = None
    sector: str | None = None
    cell: str | None = None
    village: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    gis_coordinates: str | None = None

    boundary_geojson: BoundaryGeoJSON | None = None
    boundary_points: list | None = None
    boundary_area_sqm: float | None = None

    parcel_id: str | None = None
    size: float | None = Field(default=None, ge=0)
    built_area: float | None = Field(default=None, ge=0)
    land_use: str | None = None
    right_type: str | None = None
    bedrooms: int | None = Field(default=None, ge=0, le=200)
    bathrooms: int | None = Field(default=None, ge=0, le=200)

    intent: ListingIntent = ListingIntent.SALE
    currency: str = "RWF"
    price: float | None = Field(default=None, ge=0)
    rent_amount: float | None = Field(default=None, ge=0)
    amount_paid: float | None = Field(default=None, ge=0)
    is_negotiable: bool = True
    projected_yield: float | None = None
    appreciation: float | None = None

    details: dict[str, Any] | None = None
    parcel_information: dict[str, Any] | None = None
    tags: list[str] | None = None
    amenities: list[str] | None = None

    video_link: str | None = None
    video_360_url: str | None = None
    vr_tour_url: str | None = None
    vr_tour_provider: str | None = None
    panorama_scenes: list | None = None
    drone_footage_url: str | None = None

    owner_name: str | None = None
    owner_contact: str | None = None
    uploader_type: UploaderType = UploaderType.AGENCY
    agent_id: uuid.UUID | None = None
    is_featured: bool = False
    #: Off keeps a listing off the public marketplace entirely.
    show_on_public: bool = True
    show_owner_info: bool = False
    show_on_map: bool = True
    allow_bidding: bool = False
    min_bid: float | None = Field(default=None, ge=0)
    bidding_closes_at: datetime | None = None
    seo_title: str | None = None
    seo_description: str | None = None

    @field_validator("reference_number")
    @classmethod
    def _normalise_reference(cls, v: str) -> str:
        # Entered by hand, so tolerate spacing and case but store it canonically.
        return v.strip().upper()


class PropertyCreate(PropertyBase):
    media: list[MediaCreate] = []


class PropertyUpdate(BaseModel):
    """Every field optional — PATCH semantics."""

    model_config = {"extra": "forbid"}

    reference_number: str | None = None
    upi: str | None = None
    show_on_public: bool | None = None
    show_owner_info: bool | None = None
    show_on_map: bool | None = None
    allow_bidding: bool | None = None
    min_bid: float | None = None
    bidding_closes_at: datetime | None = None
    title: str | None = None
    title_rw: str | None = None
    title_fr: str | None = None
    summary: str | None = None
    summary_rw: str | None = None
    summary_fr: str | None = None
    description: str | None = None
    category_id: uuid.UUID | None = None
    subcategory_id: uuid.UUID | None = None
    location: str | None = None
    province: str | None = None
    district: str | None = None
    sector: str | None = None
    cell: str | None = None
    village: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    gis_coordinates: str | None = None
    boundary_geojson: BoundaryGeoJSON | None = None
    boundary_points: list | None = None
    boundary_area_sqm: float | None = None
    parcel_id: str | None = None
    size: float | None = None
    built_area: float | None = None
    land_use: str | None = None
    right_type: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    intent: ListingIntent | None = None
    currency: str | None = None
    price: float | None = None
    rent_amount: float | None = None
    amount_paid: float | None = None
    is_negotiable: bool | None = None
    projected_yield: float | None = None
    appreciation: float | None = None
    details: dict[str, Any] | None = None
    parcel_information: dict[str, Any] | None = None
    tags: list[str] | None = None
    amenities: list[str] | None = None
    video_link: str | None = None
    video_360_url: str | None = None
    vr_tour_url: str | None = None
    vr_tour_provider: str | None = None
    panorama_scenes: list | None = None
    drone_footage_url: str | None = None
    owner_name: str | None = None
    owner_contact: str | None = None
    uploader_type: UploaderType | None = None
    agent_id: uuid.UUID | None = None
    is_featured: bool | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    status: PropertyStatus | None = None


class PropertyStatusChange(BaseModel):
    status: PropertyStatus
    reason: str | None = None


class PropertyVerify(BaseModel):
    approve: bool
    reason: str | None = None


class PropertyFilters(BaseModel):
    q: str | None = None
    intent: ListingIntent | None = None
    category: str | None = None
    subcategory: str | None = None
    district: str | None = None
    sector: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    min_size: float | None = None
    max_size: float | None = None
    bedrooms: int | None = None
    verified_only: bool = False
    featured_only: bool = False
    has_vr: bool = False
    sort: Literal["newest", "price-asc", "price-desc", "size-desc", "yield-desc"] = "newest"


class ListingSubmission(BaseModel):
    """A seller's own listing, filed from the public Sell page.

    It lands as a `pending_review` property so the same admin verification
    workflow applies to it as to anything an agent enters.
    """

    category_id: uuid.UUID
    subcategory_id: uuid.UUID
    reference_number: str | None = Field(default=None, max_length=40)
    title: str | None = Field(default=None, max_length=240)
    upi: str | None = Field(default=None, max_length=64)
    district: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=80)
    location: str | None = Field(default=None, max_length=240)
    intent: ListingIntent = ListingIntent.SALE
    price: float | None = Field(default=None, ge=0)
    size: float | None = Field(default=None, ge=0)
    owner_name: str = Field(min_length=2, max_length=160)
    owner_contact: str = Field(min_length=4, max_length=120)
    details: dict = Field(default_factory=dict)
    captcha_token: str | None = None
    captcha_answer: str | None = None


class EnquiryCreate(BaseModel):
    property_id: uuid.UUID | None = None
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=48)
    message: str | None = Field(default=None, max_length=4000)
    captcha_token: str | None = None
    captcha_answer: str | None = None


class EnquiryOut(ORMModel):
    id: uuid.UUID
    property_id: uuid.UUID | None = None
    name: str
    email: str | None = None
    phone: str | None = None
    message: str | None = None
    status: str
    source: str
    created_at: datetime


# ---------------------------------------------------------------- bidding
class BidSummary(BaseModel):
    """What the public is allowed to know about the offers on a property.

    Amounts are aggregate only — the highest figure and how many people are in.
    Names and individual offers stay in the console.
    """

    highest: float | None = None
    count: int = 0
    currency: str = "RWF"
    closes_at: datetime | None = None
    is_open: bool = True


class BidCreate(BaseModel):
    amount: float = Field(gt=0)
    message: str | None = Field(default=None, max_length=2000)


class BidOut(ORMModel):
    id: uuid.UUID
    property_id: uuid.UUID
    amount: float
    currency: str
    message: str | None = None
    status: BidStatus
    created_at: datetime
    decided_at: datetime | None = None
    decision_note: str | None = None


class BidAdminOut(BidOut):
    """Adds the bidder's identity — console only."""

    bidder_name: str | None = None
    bidder_email: str | None = None
    bidder_phone: str | None = None
    property_reference: str | None = None
    property_title: str | None = None


class BidDecision(BaseModel):
    note: str | None = Field(default=None, max_length=2000)


# ---------------------------------------------------------------- sale history
class SaleRecordCreate(BaseModel):
    """Close a listing out. Everything else is snapshotted from the property."""

    sold_price: float | None = Field(default=None, ge=0)
    sold_at: datetime | None = None
    buyer_name: str | None = Field(default=None, max_length=160)
    buyer_contact: str | None = Field(default=None, max_length=120)
    winning_bid_id: uuid.UUID | None = None
    notes: str | None = Field(default=None, max_length=4000)


class SaleRecordOut(ORMModel):
    id: uuid.UUID
    property_id: uuid.UUID | None = None
    reference_number: str
    upi: str | None = None
    title: str
    category_id: uuid.UUID | None = None
    subcategory_id: uuid.UUID | None = None
    location: str | None = None
    district: str | None = None
    sector: str | None = None
    size: float | None = None
    sold_price: float | None = None
    currency: str
    sold_at: datetime
    owner_name: str | None = None
    owner_contact: str | None = None
    buyer_name: str | None = None
    buyer_contact: str | None = None
    notes: str | None = None
    created_at: datetime


class SaleRecordDetail(SaleRecordOut):
    """Includes the full snapshot used to prefill a re-listing."""

    snapshot: dict | None = None


class BulkIds(BaseModel):
    """Ids for a bulk action. Capped so one request cannot lock the whole table."""

    ids: list[uuid.UUID] = Field(min_length=1, max_length=200)


class BulkStatusChange(BulkIds):
    status: PropertyStatus


class BulkFeatureChange(BulkIds):
    is_featured: bool
