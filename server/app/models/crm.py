"""
The commercial side of the business: who we deal with, what we earned, what we
put in.

Kept apart from `property.py` on purpose. That module describes a parcel; this
one describes the relationship and the money around it. A `Client` outlives any
single listing — the whole point is being able to ask "how many plots have we
sold for this person, and what did we make on them" years later.
"""

import enum
import uuid
from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKey


class ClientKind(str, enum.Enum):
    INDIVIDUAL = "individual"
    COMPANY = "company"


class Client(Base, UUIDPrimaryKey, TimestampMixin):
    """A person or company we transact with.

    One record covers both sides of the trade: the same client can be the seller
    on one parcel and the buyer on the next, which is exactly the history an
    agent wants when they pick up the phone.
    """

    __tablename__ = "clients"
    __table_args__ = (
        Index("ix_client_kind_name", "kind", "display_name"),
        Index("ix_client_phone", "phone"),
    )

    kind: Mapped[ClientKind] = mapped_column(
        SAEnum(ClientKind, name="client_kind", values_callable=lambda e: [m.value for m in e]),
        default=ClientKind.INDIVIDUAL,
        nullable=False,
        index=True,
    )

    #: What to show in a dropdown — the person's name, or the company's.
    #: Denormalised so a list never has to branch on `kind` to render a row.
    display_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)

    # ---- individual ----
    full_name: Mapped[str | None] = mapped_column(String(160))
    national_id: Mapped[str | None] = mapped_column(String(64))

    # ---- company ----
    company_name: Mapped[str | None] = mapped_column(String(200))
    tin: Mapped[str | None] = mapped_column(String(64))
    registration_number: Mapped[str | None] = mapped_column(String(64))
    #: Who signs for the company.
    contact_person: Mapped[str | None] = mapped_column(String(160))

    # ---- reachable ----
    email: Mapped[str | None] = mapped_column(String(240), index=True)
    phone: Mapped[str | None] = mapped_column(String(48))
    whatsapp: Mapped[str | None] = mapped_column(String(48))
    address: Mapped[str | None] = mapped_column(String(320))
    district: Mapped[str | None] = mapped_column(String(80))
    country: Mapped[str | None] = mapped_column(String(80))

    #: Set when the client also has a login on the public site.
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    notes: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str] | None] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    #: Who added them. Every commercial record carries its author.
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )


class CommissionBasis(str, enum.Enum):
    """How the figure was arrived at."""

    PERCENT = "percent"
    FIXED = "fixed"


class CommissionStatus(str, enum.Enum):
    PENDING = "pending"
    INVOICED = "invoiced"
    RECEIVED = "received"
    WRITTEN_OFF = "written_off"


class Commission(Base, UUIDPrimaryKey, TimestampMixin):
    """What we actually earned on a transaction.

    Separate from the commission *configured* on a listing: that is an intention,
    this is a ledger entry. A deal can close below the asking price, be split
    between two agents, or be partly written off — none of which the listing's
    own fields should be asked to represent.
    """

    __tablename__ = "commissions"
    __table_args__ = (
        Index("ix_commission_status_date", "status", "earned_on"),
        Index("ix_commission_client", "client_id"),
    )

    #: Nullable throughout: a commission can outlive the listing it came from,
    #: and a past deal may be entered before the parcel is in the system.
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL")
    )
    sale_record_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("property_sale_records.id", ondelete="SET NULL")
    )
    #: Who the commission was earned from — usually the seller.
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL")
    )
    #: Which consultant closed it, for payout and for the team page counter.
    agent_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    basis: Mapped[CommissionBasis] = mapped_column(
        SAEnum(CommissionBasis, name="commission_basis", values_callable=lambda e: [m.value for m in e]),
        default=CommissionBasis.PERCENT,
        nullable=False,
    )
    #: Percentage applied, when the basis is percent. Kept even for fixed
    #: amounts so a report can show what the effective rate turned out to be.
    rate: Mapped[float | None] = mapped_column(Numeric(6, 3))
    #: The figure the rate was applied to — normally the sale price.
    base_amount: Mapped[float | None] = mapped_column(Numeric(16, 2))
    amount: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)

    status: Mapped[CommissionStatus] = mapped_column(
        SAEnum(CommissionStatus, name="commission_status", values_callable=lambda e: [m.value for m in e]),
        default=CommissionStatus.PENDING,
        nullable=False,
        index=True,
    )
    earned_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    received_on: Mapped[date | None] = mapped_column(Date)
    reference: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)

    recorded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )


class InvestmentKind(str, enum.Enum):
    ACQUISITION = "acquisition"
    RENOVATION = "renovation"
    CONSTRUCTION = "construction"
    FEES = "fees"
    MARKETING = "marketing"
    OTHER = "other"


class Investment(Base, UUIDPrimaryKey, TimestampMixin):
    """Money the company put into a parcel.

    Paired with the sale record and the commission, this is what makes a
    per-property return calculable: what went in, what came back, what we kept.
    """

    __tablename__ = "investments"
    __table_args__ = (Index("ix_investment_property_date", "property_id", "spent_on"),)

    property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL")
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL")
    )

    kind: Mapped[InvestmentKind] = mapped_column(
        SAEnum(InvestmentKind, name="investment_kind", values_callable=lambda e: [m.value for m in e]),
        default=InvestmentKind.ACQUISITION,
        nullable=False,
        index=True,
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="RWF", nullable=False)
    spent_on: Mapped[date] = mapped_column(Date, nullable=False)
    #: Set when the spend has been recovered by a sale.
    is_recovered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reference: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)

    recorded_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
