from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from evaramu.core.money import Currency, validate_amount
from evaramu.core.schemas import MoneyOut, ORMModel
from evaramu.modules.properties.models import PropertyType, PropertyUsage, ToiletType, UnitStatus, UnitType

CODE_RE = re.compile(r"^[A-Z][A-Z0-9-]{1,31}$")


def normalise_code(v: str) -> str:
    v = v.strip().upper()
    if not CODE_RE.match(v):
        raise ValueError("Codes are 2–32 characters: a letter followed by letters, digits or '-' (e.g. H101)")
    return v


class ImageOut(ORMModel):
    id: int
    unit_id: int | None
    url: str
    thumb_url: str
    width: int
    height: int
    caption: str
    sort_order: int


class ImageUpdate(BaseModel):
    caption: str | None = Field(default=None, max_length=255)
    sort_order: int | None = Field(default=None, ge=0, le=10_000)


class _UnitFields(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    unit_type: UnitType
    bedrooms: int = Field(default=0, ge=0, le=50)
    bathrooms: int = Field(default=0, ge=0, le=50)
    toilet: ToiletType = ToiletType.PRIVATE
    size_sqm: Decimal | None = Field(default=None, ge=0, le=100_000)
    floor: str = Field(default="", max_length=32)
    furnished: bool = False
    monthly_rent: Decimal = Field(ge=0)
    currency: Currency
    description: str = Field(default="", max_length=5000)
    amenities: list[str] = Field(default_factory=list, max_length=40)

    @model_validator(mode="after")
    def _rent_precision(self):
        validate_amount(self.monthly_rent, self.currency, allow_zero=True)
        if self.unit_type == UnitType.COMMERCIAL:  # shop rooms have no bedrooms or bathrooms
            self.bedrooms = 0
            self.bathrooms = 0
        return self


class UnitCreate(_UnitFields):
    property_id: int
    code: str
    parent_unit_id: int | None = None
    is_featured: bool = False

    _code = field_validator("code")(normalise_code)


class StandaloneUnit(_UnitFields):
    """Unit created together with a standalone property (e.g. a whole house)."""

    code: str

    _code = field_validator("code")(normalise_code)


class UnitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    unit_type: UnitType | None = None
    bedrooms: int | None = Field(default=None, ge=0, le=50)
    bathrooms: int | None = Field(default=None, ge=0, le=50)
    toilet: ToiletType | None = None
    size_sqm: Decimal | None = Field(default=None, ge=0, le=100_000)
    floor: str | None = Field(default=None, max_length=32)
    furnished: bool | None = None
    monthly_rent: Decimal | None = Field(default=None, ge=0)
    currency: Currency | None = None
    description: str | None = Field(default=None, max_length=5000)
    amenities: list[str] | None = Field(default=None, max_length=40)
    is_featured: bool | None = None
    parent_unit_id: int | None = None


class StatusChange(BaseModel):
    status: UnitStatus
    reason: str = Field(default="", max_length=255)


class PublishChange(BaseModel):
    is_published: bool


class MarketChange(BaseModel):
    """Put a unit on the market (available + published) or take it off."""

    on_market: bool


class PropertyBrief(ORMModel):
    id: int
    code: str
    name: str
    property_type: str
    usage: str = "residential"
    district: str
    sector: str
    cell: str = ""
    village: str = ""
    city: str
    address: str


class OccupancyBrief(BaseModel):
    agreement_id: int
    agreement_number: str
    tenant_id: int
    tenant_name: str
    start_date: date
    end_date: date | None


class UnitOut(ORMModel):
    id: int
    code: str
    name: str
    unit_type: str
    property: PropertyBrief
    parent_unit_id: int | None
    parent_code: str | None = None
    bedrooms: int
    bathrooms: int
    toilet: str = "private"
    size_sqm: Decimal | None
    floor: str
    furnished: bool
    monthly_rent: MoneyOut
    currency: str
    description: str
    amenities: list[str]
    status: str
    is_published: bool
    is_featured: bool
    is_archived: bool
    #: True when the unit would appear on the public website right now.
    is_publicly_listed: bool = False
    #: Why a unit with status "available" is still not lettable (e.g. its
    #: parent apartment is rented as a whole).
    blocked_reason: str | None = None
    occupancy: OccupancyBrief | None = None
    cover_url: str | None = None
    created_at: datetime


class UnitDetail(UnitOut):
    images: list[ImageOut] = []
    children: list[UnitOut] = []


class _PropertyFields(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    property_type: PropertyType
    usage: PropertyUsage = PropertyUsage.RESIDENTIAL
    description: str = Field(default="", max_length=10_000)
    city: str = Field(default="Kigali", max_length=80)
    district: str = Field(default="", max_length=80)
    sector: str = Field(default="", max_length=80)
    cell: str = Field(default="", max_length=80)
    village: str = Field(default="", max_length=80)
    address: str = Field(default="", max_length=255)
    amenities: list[str] = Field(default_factory=list, max_length=40)


class PropertyCreate(_PropertyFields):
    code: str
    standalone_unit: StandaloneUnit | None = None

    _code = field_validator("code")(normalise_code)


class PropertyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    property_type: PropertyType | None = None
    usage: PropertyUsage | None = None
    description: str | None = Field(default=None, max_length=10_000)
    city: str | None = Field(default=None, max_length=80)
    district: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=80)
    cell: str | None = Field(default=None, max_length=80)
    village: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=255)
    amenities: list[str] | None = Field(default=None, max_length=40)


class UnitCounts(BaseModel):
    total: int = 0
    available: int = 0
    occupied: int = 0
    reserved: int = 0
    turnover: int = 0
    maintenance: int = 0
    off_market: int = 0


class PropertyOut(ORMModel):
    id: int
    code: str
    name: str
    property_type: str
    usage: str = "residential"
    description: str
    city: str
    district: str
    sector: str
    cell: str = ""
    village: str = ""
    address: str
    amenities: list[str]
    is_archived: bool
    created_at: datetime
    unit_counts: UnitCounts = UnitCounts()
    cover_url: str | None = None


class PropertyDetail(PropertyOut):
    units: list[UnitOut] = []
    images: list[ImageOut] = []


class HistoryEntry(BaseModel):
    at: datetime
    kind: str
    summary: str
    actor: str | None = None
    unit_code: str | None = None


class CodeSuggestion(BaseModel):
    code: str


class AvailabilitySummary(BaseModel):
    counts: UnitCounts
    publicly_listed: int
    by_property: list[dict]


class LocationDefaults(BaseModel):
    """Pre-filled on new properties; from Settings → Agreement documents."""

    city: str
    district: str
    sector: str
    cell: str
    village: str
