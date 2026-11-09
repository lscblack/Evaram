from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    false,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from evaramu.core.money import Currency
from evaramu.db.base import Base, Money, TimestampMixin, enum_check


class PropertyType(StrEnum):
    BUILDING = "building"        # multi-unit building / apartment block / row of shops
    HOUSE = "house"              # standalone house (rented whole or by room)


class PropertyUsage(StrEnum):
    """What the property is let for. Decides which unit types it may contain."""

    RESIDENTIAL = "residential"  # homes: houses, apartments, rooms, studios
    COMMERCIAL = "commercial"    # shop rooms only (imiryango y'ubucuruzi)
    MIXED = "mixed"              # e.g. shops on the ground floor, homes above


class ToiletType(StrEnum):
    PRIVATE = "private"          # the unit has its own toilet
    SHARED = "shared"            # a toilet shared with other units


class UnitType(StrEnum):
    HOUSE = "house"
    APARTMENT = "apartment"
    ROOM = "room"
    STUDIO = "studio"
    COMMERCIAL = "commercial"    # a shop room: no bedrooms or bathrooms


class UnitStatus(StrEnum):
    AVAILABLE = "available"      # ready and free to let
    RESERVED = "reserved"        # held for a prospective tenant
    OCCUPIED = "occupied"        # an agreement is active / tenant in place
    TURNOVER = "turnover"        # tenant left; awaiting inspection / cleaning
    MAINTENANCE = "maintenance"
    OFF_MARKET = "off_market"


class ReservedCode(Base):
    """Every property/unit code ever issued. Rows are never deleted, so a code
    can never be handed to a different property or unit, even after archival.
    Property codes and unit codes are separate namespaces (a standalone house
    "H101" can be both the property and its single rentable unit)."""

    __tablename__ = "reserved_codes"

    entity_type: Mapped[str] = mapped_column(String(16), primary_key=True)
    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    entity_id: Mapped[int] = mapped_column(Integer)
    reserved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Property(TimestampMixin, Base):
    __tablename__ = "properties"
    __table_args__ = (
        enum_check("property_type", PropertyType),
        enum_check("usage", PropertyUsage),
        Index("ix_properties_is_demo", "is_demo", postgresql_where=text("is_demo")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    property_type: Mapped[str] = mapped_column(String(32))
    usage: Mapped[str] = mapped_column(
        String(16), default=PropertyUsage.RESIDENTIAL.value, server_default=PropertyUsage.RESIDENTIAL.value
    )
    description: Mapped[str] = mapped_column(Text, default="")
    city: Mapped[str] = mapped_column(String(80), default="Kigali")
    district: Mapped[str] = mapped_column(String(80), default="", index=True)
    sector: Mapped[str] = mapped_column(String(80), default="")
    cell: Mapped[str] = mapped_column(String(80), default="", server_default="")
    village: Mapped[str] = mapped_column(String(80), default="", server_default="")
    address: Mapped[str] = mapped_column(String(255), default="")
    amenities: Mapped[list[str]] = mapped_column(JSONB, default=list)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    #: Sample record loaded from Settings → Demo data (removable as a set).
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    units: Mapped[list["RentalUnit"]] = relationship(
        back_populates="property", order_by="RentalUnit.code"
    )
    images: Mapped[list["PropertyImage"]] = relationship(
        primaryjoin="and_(PropertyImage.property_id == Property.id, PropertyImage.unit_id.is_(None))",
        order_by="PropertyImage.sort_order",
        viewonly=True,
    )

    @property
    def location_label(self) -> str:
        return ", ".join(p for p in [self.sector, self.district, self.city] if p)


class RentalUnit(TimestampMixin, Base):
    __tablename__ = "rental_units"
    __table_args__ = (
        enum_check("unit_type", UnitType),
        enum_check("status", UnitStatus),
        enum_check("currency", Currency),
        enum_check("toilet", ToiletType),
        CheckConstraint("monthly_rent >= 0", name="rent_non_negative"),
        CheckConstraint("parent_unit_id IS NULL OR parent_unit_id <> id", name="parent_not_self"),
        Index("ix_rental_units_public", "status", "is_published", "is_archived"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="RESTRICT"), index=True)
    #: A room inside a rentable apartment/house. Renting the parent blocks its
    #: rooms and renting any room blocks the parent (see availability service).
    parent_unit_id: Mapped[int | None] = mapped_column(
        ForeignKey("rental_units.id", ondelete="RESTRICT"), index=True
    )
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    unit_type: Mapped[str] = mapped_column(String(32))
    bedrooms: Mapped[int] = mapped_column(Integer, default=0)
    bathrooms: Mapped[int] = mapped_column(Integer, default=0)
    toilet: Mapped[str] = mapped_column(String(16), default=ToiletType.PRIVATE.value, server_default=ToiletType.PRIVATE.value)
    size_sqm: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    floor: Mapped[str] = mapped_column(String(32), default="")
    furnished: Mapped[bool] = mapped_column(Boolean, default=False)
    monthly_rent: Mapped[Decimal] = mapped_column(Money())
    currency: Mapped[str] = mapped_column(String(3))
    description: Mapped[str] = mapped_column(Text, default="")
    amenities: Mapped[list[str]] = mapped_column(JSONB, default=list)
    status: Mapped[str] = mapped_column(String(32), default=UnitStatus.OFF_MARKET.value, index=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    property: Mapped[Property] = relationship(back_populates="units", lazy="joined")
    parent: Mapped["RentalUnit | None"] = relationship(remote_side="RentalUnit.id", back_populates="children")
    children: Mapped[list["RentalUnit"]] = relationship(back_populates="parent")
    images: Mapped[list["PropertyImage"]] = relationship(
        back_populates="unit", order_by="PropertyImage.sort_order"
    )


class PropertyImage(Base):
    __tablename__ = "property_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    property_id: Mapped[int] = mapped_column(ForeignKey("properties.id", ondelete="CASCADE"), index=True)
    #: Null → photo of the property as a whole; set → photo of one unit.
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("rental_units.id", ondelete="CASCADE"), index=True)
    storage_key: Mapped[str] = mapped_column(String(255))
    thumb_key: Mapped[str] = mapped_column(String(255))
    original_name: Mapped[str] = mapped_column(String(255), default="")
    width: Mapped[int] = mapped_column(Integer)
    height: Mapped[int] = mapped_column(Integer)
    size_bytes: Mapped[int] = mapped_column(Integer)
    caption: Mapped[str] = mapped_column(String(255), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    unit: Mapped[RentalUnit | None] = relationship(back_populates="images")


class UnitStatusHistory(Base):
    __tablename__ = "unit_status_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("rental_units.id", ondelete="CASCADE"), index=True)
    from_status: Mapped[str | None] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str] = mapped_column(String(255), default="")
    agreement_id: Mapped[int | None] = mapped_column(
        ForeignKey("rental_agreements.id", ondelete="SET NULL")
    )
    changed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )


__all__ = [
    "Property", "PropertyImage", "PropertyType", "RentalUnit", "ReservedCode",
    "UnitStatus", "UnitStatusHistory", "UnitType",
]
