"""Schemas for clients, commissions and investments."""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.models.crm import ClientKind, CommissionBasis, CommissionStatus, InvestmentKind
from app.schemas.common import ORMModel


# ------------------------------------------------------------------- clients
class ClientBase(BaseModel):
    kind: ClientKind = ClientKind.INDIVIDUAL

    full_name: str | None = Field(default=None, max_length=160)
    national_id: str | None = Field(default=None, max_length=64)

    company_name: str | None = Field(default=None, max_length=200)
    tin: str | None = Field(default=None, max_length=64)
    registration_number: str | None = Field(default=None, max_length=64)
    contact_person: str | None = Field(default=None, max_length=160)

    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=48)
    whatsapp: str | None = Field(default=None, max_length=48)
    address: str | None = Field(default=None, max_length=320)
    district: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=80)

    notes: str | None = None
    tags: list[str] | None = None
    is_active: bool = True

    @model_validator(mode="after")
    def require_a_name(self) -> "ClientBase":
        """A company needs a company name; a person needs a personal one.

        Without this the dropdown fills with blank rows, which is worse than
        rejecting the record — you cannot tell which client you are picking.
        """
        if self.kind is ClientKind.COMPANY and not (self.company_name or "").strip():
            raise ValueError("A company client needs a company name.")
        if self.kind is ClientKind.INDIVIDUAL and not (self.full_name or "").strip():
            raise ValueError("An individual client needs a full name.")
        return self

    @property
    def resolved_display_name(self) -> str:
        return (
            (self.company_name or "").strip()
            if self.kind is ClientKind.COMPANY
            else (self.full_name or "").strip()
        )


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    """Every field optional — a PATCH only touches what it names."""

    kind: ClientKind | None = None
    full_name: str | None = Field(default=None, max_length=160)
    national_id: str | None = Field(default=None, max_length=64)
    company_name: str | None = Field(default=None, max_length=200)
    tin: str | None = Field(default=None, max_length=64)
    registration_number: str | None = Field(default=None, max_length=64)
    contact_person: str | None = Field(default=None, max_length=160)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=48)
    whatsapp: str | None = Field(default=None, max_length=48)
    address: str | None = Field(default=None, max_length=320)
    district: str | None = Field(default=None, max_length=80)
    country: str | None = Field(default=None, max_length=80)
    notes: str | None = None
    tags: list[str] | None = None
    is_active: bool | None = None


class ClientOut(ORMModel):
    id: uuid.UUID
    kind: ClientKind
    display_name: str
    full_name: str | None = None
    national_id: str | None = None
    company_name: str | None = None
    tin: str | None = None
    registration_number: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    address: str | None = None
    district: str | None = None
    country: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    is_active: bool
    created_by_id: uuid.UUID | None = None
    created_at: datetime


class ClientOption(ORMModel):
    """The shape the property form's seller dropdown needs, and nothing more."""

    id: uuid.UUID
    display_name: str
    kind: ClientKind
    phone: str | None = None


class ClientDealSummary(BaseModel):
    """The history an agent wants before picking up the phone."""

    listings_total: int
    listings_live: int
    sold_count: int
    sold_value: float
    bought_count: int
    bought_value: float
    commission_total: float
    commission_received: float
    commission_pending: float
    invested_total: float
    first_deal_on: date | None = None
    last_deal_on: date | None = None


class ClientDetail(ClientOut):
    summary: ClientDealSummary


# --------------------------------------------------------------- commissions
class CommissionCreate(BaseModel):
    property_id: uuid.UUID | None = None
    sale_record_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    agent_id: uuid.UUID | None = None

    basis: CommissionBasis = CommissionBasis.PERCENT
    rate: float | None = Field(default=None, ge=0, le=100)
    base_amount: float | None = Field(default=None, ge=0)
    amount: float | None = Field(default=None, ge=0)
    currency: str = Field(default="RWF", max_length=8)
    status: CommissionStatus = CommissionStatus.PENDING
    earned_on: date
    received_on: date | None = None
    reference: str | None = Field(default=None, max_length=64)
    notes: str | None = None

    @model_validator(mode="after")
    def resolve_amount(self) -> "CommissionCreate":
        """Accept either a rate over a base, or a flat figure — never neither."""
        if self.basis is CommissionBasis.PERCENT:
            if self.amount is None:
                if self.rate is None or self.base_amount is None:
                    raise ValueError(
                        "A percent commission needs a rate and a base amount, or an explicit amount."
                    )
                self.amount = round(self.base_amount * self.rate / 100, 2)
        elif self.amount is None:
            raise ValueError("A fixed commission needs an amount.")
        return self


class CommissionUpdate(BaseModel):
    client_id: uuid.UUID | None = None
    agent_id: uuid.UUID | None = None
    basis: CommissionBasis | None = None
    rate: float | None = Field(default=None, ge=0, le=100)
    base_amount: float | None = Field(default=None, ge=0)
    amount: float | None = Field(default=None, ge=0)
    status: CommissionStatus | None = None
    earned_on: date | None = None
    received_on: date | None = None
    reference: str | None = Field(default=None, max_length=64)
    notes: str | None = None


class CommissionOut(ORMModel):
    id: uuid.UUID
    property_id: uuid.UUID | None = None
    sale_record_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    agent_id: uuid.UUID | None = None
    basis: CommissionBasis
    rate: float | None = None
    base_amount: float | None = None
    amount: float
    currency: str
    status: CommissionStatus
    earned_on: date
    received_on: date | None = None
    reference: str | None = None
    notes: str | None = None
    recorded_by_id: uuid.UUID | None = None
    created_at: datetime
    #: Filled in by the endpoint so a list does not need four extra requests.
    client_name: str | None = None
    agent_name: str | None = None
    property_reference: str | None = None


# --------------------------------------------------------------- investments
class InvestmentCreate(BaseModel):
    property_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    kind: InvestmentKind = InvestmentKind.ACQUISITION
    label: str = Field(min_length=1, max_length=200)
    amount: float = Field(ge=0)
    currency: str = Field(default="RWF", max_length=8)
    spent_on: date
    is_recovered: bool = False
    reference: str | None = Field(default=None, max_length=64)
    notes: str | None = None


class InvestmentUpdate(BaseModel):
    property_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    kind: InvestmentKind | None = None
    label: str | None = Field(default=None, min_length=1, max_length=200)
    amount: float | None = Field(default=None, ge=0)
    spent_on: date | None = None
    is_recovered: bool | None = None
    reference: str | None = Field(default=None, max_length=64)
    notes: str | None = None


class InvestmentOut(ORMModel):
    id: uuid.UUID
    property_id: uuid.UUID | None = None
    client_id: uuid.UUID | None = None
    kind: InvestmentKind
    label: str
    amount: float
    currency: str
    spent_on: date
    is_recovered: bool
    reference: str | None = None
    notes: str | None = None
    recorded_by_id: uuid.UUID | None = None
    created_at: datetime
    client_name: str | None = None
    property_reference: str | None = None


# ------------------------------------------------------------- past sales
class PastSaleCreate(BaseModel):
    """A deal that closed before the system knew about it.

    Deliberately not tied to a listing: the whole point is recording history for
    parcels that were never on the platform.
    """

    reference_number: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=240)
    upi: str | None = Field(default=None, max_length=64)
    location: str | None = Field(default=None, max_length=240)
    district: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=80)
    size: float | None = Field(default=None, ge=0)

    sold_price: float | None = Field(default=None, ge=0)
    currency: str = Field(default="RWF", max_length=8)
    sold_at: datetime

    seller_client_id: uuid.UUID | None = None
    buyer_client_id: uuid.UUID | None = None
    owner_name: str | None = Field(default=None, max_length=160)
    buyer_name: str | None = Field(default=None, max_length=160)
    agent_id: uuid.UUID | None = None
    notes: str | None = None

    #: Book the commission at the same time — the common case.
    commission_basis: Literal["percent", "fixed"] | None = None
    commission_rate: float | None = Field(default=None, ge=0, le=100)
    commission_amount: float | None = Field(default=None, ge=0)
