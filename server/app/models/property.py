import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class PropertyStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    AVAILABLE = "available"
    RESERVED = "reserved"
    UNDER_OFFER = "under_offer"
    SOLD = "sold"
    RENTED = "rented"
    WITHDRAWN = "withdrawn"
    REJECTED = "rejected"


class ListingIntent(str, enum.Enum):
    SALE = "sale"
    RENT = "rent"
    BOTH = "both"


class UploaderType(str, enum.Enum):
    AGENCY = "agency"
    BROKER = "broker"
    SELLER = "seller"


class MediaKind(str, enum.Enum):
    IMAGE = "image"
    FLOORPLAN = "floorplan"
    DOCUMENT = "document"
    VIDEO = "video"
    VIDEO_360 = "video_360"
    PANORAMA = "panorama"
    VR_TOUR = "vr_tour"
    DRONE = "drone"


class Property(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "properties"
    __table_args__ = (
        # Uniqueness applies to *live* listings only. Once a sale is recorded the
        # row is archived, which frees the reference and the UPI so the same
        # parcel can be listed again later without a conflict.
        Index(
            "uq_property_reference_active",
            "reference_number",
            unique=True,
            postgresql_where=text("is_archived = false"),
        ),
        Index(
            "uq_property_upi_active",
            "upi",
            unique=True,
            postgresql_where=text("is_archived = false AND upi IS NOT NULL"),
        ),
        Index("ix_property_public", "show_on_public", "is_archived", "status"),
        # The listing grid always filters on status + intent and sorts by date.
        Index("ix_property_status_intent_created", "status", "intent", "created_at"),
        Index("ix_property_category_status", "category_id", "status"),
        Index("ix_property_district_status", "district", "status"),
        Index("ix_property_price", "price"),
        Index("ix_property_featured", "is_featured", "status"),
        # Free-text search across the fields the marketplace searches.
        Index(
            "ix_property_search_trgm",
            "search_text",
            postgresql_using="gin",
            postgresql_ops={"search_text": "gin_trgm_ops"},
        ),
        Index("ix_property_details_gin", "details", postgresql_using="gin"),
    )

    # ---------------- identity ----------------
    #: Manually entered agency reference. Its presence is what marks a property
    #: as genuinely on the market, so it is required before publishing.
    reference_number: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    #: National Land Authority Unique Parcel Identifier.
    upi: Mapped[str | None] = mapped_column(String(64), index=True)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)

    title: Mapped[str] = mapped_column(String(240), nullable=False)
    title_rw: Mapped[str | None] = mapped_column(String(240))
    title_fr: Mapped[str | None] = mapped_column(String(240))
    summary: Mapped[str | None] = mapped_column(Text)
    summary_rw: Mapped[str | None] = mapped_column(Text)
    summary_fr: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)

    # ---------------- taxonomy ----------------
    category_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("property_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    subcategory_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("property_subcategories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # ---------------- location ----------------
    location: Mapped[str | None] = mapped_column(String(240))
    province: Mapped[str | None] = mapped_column(String(80), index=True)
    district: Mapped[str | None] = mapped_column(String(80), index=True)
    sector: Mapped[str | None] = mapped_column(String(80), index=True)
    cell: Mapped[str | None] = mapped_column(String(80))
    village: Mapped[str | None] = mapped_column(String(80))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    gis_coordinates: Mapped[str | None] = mapped_column(String(120))

    #: Parcel outline as a GeoJSON Polygon / MultiPolygon. Kept as JSONB so the
    #: client can draw it directly with no server-side conversion.
    boundary_geojson: Mapped[dict | None] = mapped_column(JSONB)
    #: Simple [[lat, lng], …] ring for lightweight map libraries.
    boundary_points: Mapped[list | None] = mapped_column(JSONB)
    boundary_area_sqm: Mapped[float | None] = mapped_column(Float)

    # ---------------- physical ----------------
    parcel_id: Mapped[str | None] = mapped_column(String(64))
    size: Mapped[float | None] = mapped_column(Float, index=True)
    built_area: Mapped[float | None] = mapped_column(Float)
    land_use: Mapped[str | None] = mapped_column(String(120))
    right_type: Mapped[str | None] = mapped_column(String(120))
    bedrooms: Mapped[int | None] = mapped_column(Integer, index=True)
    bathrooms: Mapped[int | None] = mapped_column(Integer)

    # ---------------- commercial ----------------
    status: Mapped[PropertyStatus] = mapped_column(
        SAEnum(PropertyStatus, name="property_status", values_callable=lambda e: [m.value for m in e]),
        default=PropertyStatus.DRAFT,
        nullable=False,
        index=True,
    )
    intent: Mapped[ListingIntent] = mapped_column(
        SAEnum(ListingIntent, name="listing_intent", values_callable=lambda e: [m.value for m in e]),
        default=ListingIntent.SALE,
        nullable=False,
        index=True,
    )
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)
    #: Sale price, or 0 for rent-only listings.
    price: Mapped[float | None] = mapped_column(Numeric(16, 2))
    rent_amount: Mapped[float | None] = mapped_column(Numeric(16, 2))
    amount_paid: Mapped[float | None] = mapped_column(Numeric(16, 2))
    is_negotiable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    projected_yield: Mapped[float | None] = mapped_column(Float)
    appreciation: Mapped[float | None] = mapped_column(Float)

    # ---------------- dynamic spec ----------------
    #: Answers to the sub-category's form fields, keyed by field name.
    details: Mapped[dict | None] = mapped_column(JSONB)
    #: Raw LAIS / NLA payload plus verification metadata.
    parcel_information: Mapped[dict | None] = mapped_column(JSONB)
    tags: Mapped[list[str] | None] = mapped_column(JSONB)
    amenities: Mapped[list[str] | None] = mapped_column(JSONB)

    # ---------------- immersive media ----------------
    video_link: Mapped[str | None] = mapped_column(String(512))
    #: Equirectangular 360° walkthrough of the plot.
    video_360_url: Mapped[str | None] = mapped_column(String(512))
    #: Matterport / Kuula / self-hosted VR tour embed.
    vr_tour_url: Mapped[str | None] = mapped_column(String(512))
    vr_tour_provider: Mapped[str | None] = mapped_column(String(40))
    #: Ordered list of `{url, title, hotspots[]}` panoramas for the built-in viewer.
    panorama_scenes: Mapped[list | None] = mapped_column(JSONB)
    drone_footage_url: Mapped[str | None] = mapped_column(String(512))

    # ---------------- ownership & workflow ----------------
    owner_name: Mapped[str | None] = mapped_column(String(160))
    owner_contact: Mapped[str | None] = mapped_column(String(120))
    uploaded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    uploader_type: Mapped[UploaderType] = mapped_column(
        SAEnum(UploaderType, name="uploader_type", values_callable=lambda e: [m.value for m in e]),
        default=UploaderType.AGENCY,
        nullable=False,
    )
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )

    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    verified_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ---------------- marketplace visibility ----------------
    #: Off keeps a verified listing out of the public marketplace entirely —
    #: useful for off-market and pocket listings an agent works privately.
    show_on_public: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True
    )
    #: Owners must opt in before their name and number appear on the public page.
    show_owner_info: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    #: Whether the exact pin and parcel outline are published. Off still lets
    #: the listing name its district and sector — some sellers do not want the
    #: precise location public until a buyer is qualified.
    show_on_map: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ---------------- bidding ----------------
    allow_bidding: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    #: Offers below this are rejected outright. Falls back to the asking price.
    min_bid: Mapped[float | None] = mapped_column(Numeric(16, 2))
    bidding_closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ---------------- lifecycle ----------------
    #: Set when a sale is recorded. Archived rows leave the marketplace and stop
    #: holding their reference and UPI.
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ---------------- search ----------------
    #: Denormalised haystack maintained by the service layer; trigram-indexed
    #: so `ILIKE %term%` stays fast as the catalogue grows.
    search_text: Mapped[str | None] = mapped_column(Text)

    seo_title: Mapped[str | None] = mapped_column(String(240))
    seo_description: Mapped[str | None] = mapped_column(Text)

    bids: Mapped[list["PropertyBid"]] = relationship(
        back_populates="property",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PropertyBid.amount.desc()",
    )

    media: Mapped[list["PropertyMedia"]] = relationship(
        back_populates="property",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PropertyMedia.display_order",
        lazy="selectin",
    )

    def build_search_text(self) -> str:
        parts = [
            self.reference_number,
            self.upi,
            self.title,
            self.summary,
            self.location,
            self.district,
            self.sector,
            self.cell,
            self.village,
            self.land_use,
            " ".join(self.tags or []),
        ]
        return " ".join(p for p in parts if p)


class BidStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    OUTBID = "outbid"


class PropertyBid(Base, UUIDPrimaryKey, TimestampMixin):
    """An offer from a registered user.

    Bidding is deliberately account-only: an offer carries a verified identity,
    which is what makes it worth an agent's time to chase.
    """

    __tablename__ = "property_bids"
    __table_args__ = (
        # The public panel reads "highest live bid" constantly.
        Index("ix_bid_property_amount", "property_id", "amount"),
        Index("ix_bid_property_status", "property_id", "status"),
        Index("ix_bid_bidder", "bidder_id", "created_at"),
    )

    property_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    bidder_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    amount: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)
    message: Mapped[str | None] = mapped_column(Text)

    status: Mapped[BidStatus] = mapped_column(
        SAEnum(BidStatus, name="bid_status", values_callable=lambda e: [m.value for m in e]),
        default=BidStatus.PENDING,
        nullable=False,
        index=True,
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    decision_note: Mapped[str | None] = mapped_column(Text)

    ip_address: Mapped[str | None] = mapped_column(String(64))

    property: Mapped["Property"] = relationship(back_populates="bids")


class PropertySaleRecord(Base, UUIDPrimaryKey, TimestampMixin):
    """A completed sale, kept after the listing itself is archived.

    This is what makes re-listing painless: the parcel's history survives, so an
    agent can look up the UPI, see we sold it before, and prefill a fresh
    listing from the snapshot instead of retyping it and colliding on the UPI.
    """

    __tablename__ = "property_sale_records"
    __table_args__ = (
        Index("ix_sale_upi", "upi"),
        Index("ix_sale_reference", "reference_number"),
        Index("ix_sale_sold_at", "sold_at"),
    )

    #: Nullable — the listing may be deleted long after the sale is recorded.
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL")
    )

    reference_number: Mapped[str] = mapped_column(String(40), nullable=False)
    upi: Mapped[str | None] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(240), nullable=False)

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("property_categories.id", ondelete="SET NULL")
    )
    subcategory_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("property_subcategories.id", ondelete="SET NULL")
    )

    location: Mapped[str | None] = mapped_column(String(240))
    district: Mapped[str | None] = mapped_column(String(80))
    sector: Mapped[str | None] = mapped_column(String(80))
    size: Mapped[float | None] = mapped_column(Float)

    sold_price: Mapped[float | None] = mapped_column(Numeric(16, 2))
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)
    sold_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    owner_name: Mapped[str | None] = mapped_column(String(160))
    owner_contact: Mapped[str | None] = mapped_column(String(120))
    buyer_name: Mapped[str | None] = mapped_column(String(160))
    buyer_contact: Mapped[str | None] = mapped_column(String(120))

    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    winning_bid_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("property_bids.id", ondelete="SET NULL")
    )

    #: Full snapshot of the listing so a re-list can be prefilled field by field.
    snapshot: Mapped[dict | None] = mapped_column(JSONB)
    notes: Mapped[str | None] = mapped_column(Text)


class PropertyMedia(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "property_media"
    __table_args__ = (Index("ix_media_property_kind_order", "property_id", "kind", "display_order"),)

    property_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[MediaKind] = mapped_column(
        SAEnum(MediaKind, name="media_kind", values_callable=lambda e: [m.value for m in e]),
        default=MediaKind.IMAGE,
        nullable=False,
    )
    url: Mapped[str] = mapped_column(String(768), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(768))
    caption: Mapped[str | None] = mapped_column(String(240))
    alt_text: Mapped[str | None] = mapped_column(String(240))
    is_cover: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    #: Panorama hotspots / VR scene metadata.
    meta: Mapped[dict | None] = mapped_column(JSONB)

    property: Mapped[Property] = relationship(back_populates="media")


class PropertyEnquiry(Base, UUIDPrimaryKey, TimestampMixin):
    """A lead against a specific listing."""

    __tablename__ = "property_enquiries"
    __table_args__ = (Index("ix_enquiry_property_status", "property_id", "status"),)

    property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    phone: Mapped[str | None] = mapped_column(String(48))
    message: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(48), default="website", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="new", nullable=False, index=True)
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    handled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(String(64))
