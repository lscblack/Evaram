from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from evaramu.core.money import Currency
from evaramu.db.base import Base, Money, TimestampMixin, enum_check


class AgreementStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"


class DepositKind(StrEnum):
    RECEIVED = "received"
    REFUNDED = "refunded"
    DEDUCTED = "deducted"   # retained for damages / unpaid rent


class RentalAgreement(TimestampMixin, Base):
    __tablename__ = "rental_agreements"
    __table_args__ = (
        enum_check("status", AgreementStatus),
        enum_check("currency", Currency),
        CheckConstraint("monthly_rent > 0", name="rent_positive"),
        CheckConstraint("deposit_required >= 0", name="deposit_non_negative"),
        CheckConstraint("due_day BETWEEN 1 AND 28", name="due_day_range"),
        CheckConstraint("end_date IS NULL OR end_date >= start_date", name="dates_ordered"),
        # The hard guarantee behind "no two active agreements on one unit".
        Index(
            "uq_rental_agreements_one_active_per_unit",
            "unit_id",
            unique=True,
            postgresql_where=text("status = 'active'"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    agreement_number: Mapped[str] = mapped_column(String(32), unique=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"), index=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("rental_units.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(16), default=AgreementStatus.DRAFT.value, index=True)
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    monthly_rent: Mapped[Decimal] = mapped_column(Money())
    currency: Mapped[str] = mapped_column(String(3))
    #: Day of the month rent is due (1–28 so it exists in every month).
    due_day: Mapped[int] = mapped_column(Integer, default=5)
    deposit_required: Mapped[Decimal] = mapped_column(Money(), default=Decimal("0"))
    special_conditions: Mapped[str] = mapped_column(Text, default="")
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    terminated_on: Mapped[date | None] = mapped_column(Date)
    termination_reason: Mapped[str] = mapped_column(Text, default="")
    #: Date the tenant physically handed the unit back. Availability returns
    #: only after this and an explicit "ready to let" check.
    move_out_date: Mapped[date | None] = mapped_column(Date)
    renewed_from_id: Mapped[int | None] = mapped_column(
        ForeignKey("rental_agreements.id", ondelete="SET NULL")
    )
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    tenant = relationship("Tenant", lazy="joined")
    unit = relationship("RentalUnit", lazy="joined")
    deposits: Mapped[list["DepositTransaction"]] = relationship(
        back_populates="agreement", order_by="DepositTransaction.transaction_date"
    )


class DepositTransaction(Base):
    __tablename__ = "deposit_transactions"
    __table_args__ = (
        enum_check("kind", DepositKind),
        enum_check("currency", Currency),
        CheckConstraint("amount > 0", name="amount_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    agreement_id: Mapped[int] = mapped_column(
        ForeignKey("rental_agreements.id", ondelete="RESTRICT"), index=True
    )
    kind: Mapped[str] = mapped_column(String(16))
    amount: Mapped[Decimal] = mapped_column(Money())
    currency: Mapped[str] = mapped_column(String(3))
    transaction_date: Mapped[date] = mapped_column(Date)
    method: Mapped[str] = mapped_column(String(32), default="")
    reference: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    recorded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    agreement: Mapped[RentalAgreement] = relationship(back_populates="deposits")


# ------------------------------------------------------- agreement documents ----


class DocumentStatus(StrEnum):
    DRAFT = "draft"        # editable, no signatures yet
    SIGNING = "signing"    # text frozen at the first signature
    SIGNED = "signed"      # both parties signed
    VOID = "void"          # withdrawn; kept for the record


class AgreementTemplate(TimestampMixin, Base):
    """Editable contract text with {{placeholders}}; documents snapshot it."""

    __tablename__ = "agreement_templates"
    __table_args__ = (
        Index("uq_agreement_templates_default", "is_default", unique=True,
              postgresql_where=text("is_default AND NOT is_archived")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(String(255), default="")
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


class AgreementDocument(TimestampMixin, Base):
    """A contract generated for one agreement, signed digitally, never deleted."""

    __tablename__ = "agreement_documents"
    __table_args__ = (enum_check("status", DocumentStatus),)

    id: Mapped[int] = mapped_column(primary_key=True)
    document_number: Mapped[str] = mapped_column(String(32), unique=True)
    agreement_id: Mapped[int] = mapped_column(ForeignKey("rental_agreements.id", ondelete="RESTRICT"), index=True)
    template_id: Mapped[int | None] = mapped_column(ForeignKey("agreement_templates.id", ondelete="SET NULL"))
    template_version: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default=DocumentStatus.DRAFT.value, index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    fields: Mapped[dict] = mapped_column(JSONB, default=dict)
    #: Frozen at the first signature: the exact HTML both parties signed.
    rendered_html: Mapped[str | None] = mapped_column(Text)
    content_hash: Mapped[str | None] = mapped_column(String(64))
    frozen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    tenant_signature: Mapped[str | None] = mapped_column(Text)        # PNG, base64
    tenant_signed_name: Mapped[str] = mapped_column(String(160), default="")
    tenant_signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    tenant_sign_ip: Mapped[str | None] = mapped_column(String(64))
    tenant_signature_digest: Mapped[str | None] = mapped_column(String(64))
    tenant_witnessed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    landlord_signature: Mapped[str | None] = mapped_column(Text)
    landlord_signed_name: Mapped[str] = mapped_column(String(160), default="")
    landlord_signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    landlord_sign_ip: Mapped[str | None] = mapped_column(String(64))
    landlord_signature_digest: Mapped[str | None] = mapped_column(String(64))
    landlord_signed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    void_reason: Mapped[str] = mapped_column(Text, default="")
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    agreement: Mapped[RentalAgreement] = relationship()
