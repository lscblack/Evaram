"""Invoices, payments and their allocations.

Balance model
-------------
Each invoice carries its own receivable:

    balance_due = amount_charged - amount_credited - amount_paid

``amount_paid`` is derived exclusively from allocations of *approved*
payments, recomputed inside the same transaction whenever a payment is
approved, reversed or re-allocated. ``previous_balance`` is an informational
snapshot of what the tenant still owed on earlier invoices (same agreement,
same currency) when the invoice was issued; it is shown as "total amount due"
on the invoice but is never added to this invoice's own receivable, so arrears
are never counted twice.
"""

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
from sqlalchemy.orm import Mapped, mapped_column, relationship

from evaramu.core.money import Currency
from evaramu.db.base import Base, Money, TimestampMixin, enum_check


class InvoiceStatus(StrEnum):
    UNPAID = "unpaid"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    VOID = "void"   # cancelled by correction; only possible with no approved payments


class InvoiceKind(StrEnum):
    RENT = "rent"
    OTHER = "other"


class InvoiceItemKind(StrEnum):
    RENT = "rent"
    CHARGE = "charge"
    ADJUSTMENT = "adjustment"


class AdjustmentKind(StrEnum):
    CREDIT = "credit"   # reduces what the tenant owes (waiver, discount, correction)
    DEBIT = "debit"     # adds a charge (damage, utilities, correction)


class PaymentStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REVERSED = "reversed"


class Invoice(TimestampMixin, Base):
    __tablename__ = "invoices"
    __table_args__ = (
        enum_check("status", InvoiceStatus),
        enum_check("kind", InvoiceKind),
        enum_check("currency", Currency),
        CheckConstraint("amount_charged >= 0", name="charged_non_negative"),
        CheckConstraint("amount_credited >= 0", name="credited_non_negative"),
        CheckConstraint("amount_paid >= 0", name="paid_non_negative"),
        CheckConstraint("amount_paid + amount_credited <= amount_charged", name="not_overpaid"),
        CheckConstraint("due_date >= issue_date", name="due_after_issue"),
        # One live rent invoice per agreement per period: makes generation idempotent.
        Index(
            "uq_invoices_rent_period",
            "agreement_id",
            "period_start",
            unique=True,
            postgresql_where=text("kind = 'rent' AND status <> 'void'"),
        ),
        Index("ix_invoices_status_due", "status", "due_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(32), unique=True)
    kind: Mapped[str] = mapped_column(String(16), default=InvoiceKind.RENT.value)
    agreement_id: Mapped[int] = mapped_column(ForeignKey("rental_agreements.id", ondelete="RESTRICT"), index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"), index=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("rental_units.id", ondelete="RESTRICT"), index=True)
    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    issue_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    currency: Mapped[str] = mapped_column(String(3))
    amount_charged: Mapped[Decimal] = mapped_column(Money(), default=Decimal("0"))
    amount_credited: Mapped[Decimal] = mapped_column(Money(), default=Decimal("0"))
    amount_paid: Mapped[Decimal] = mapped_column(Money(), default=Decimal("0"))
    previous_balance: Mapped[Decimal] = mapped_column(Money(), default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(16), default=InvoiceStatus.UNPAID.value)
    notes: Mapped[str] = mapped_column(Text, default="")
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    void_reason: Mapped[str] = mapped_column(Text, default="")
    voided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    items: Mapped[list["InvoiceItem"]] = relationship(
        back_populates="invoice", order_by="InvoiceItem.id", cascade="all, delete-orphan"
    )
    agreement = relationship("RentalAgreement", lazy="joined")
    tenant = relationship("Tenant", lazy="joined")
    unit = relationship("RentalUnit", lazy="joined")

    @property
    def balance_due(self) -> Decimal:
        if self.status == InvoiceStatus.VOID:
            return Decimal("0.00")
        return self.amount_charged - self.amount_credited - self.amount_paid

    @property
    def total_due(self) -> Decimal:
        return self.balance_due + self.previous_balance


class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    __table_args__ = (enum_check("kind", InvoiceItemKind),)

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    description: Mapped[str] = mapped_column(String(255))
    amount: Mapped[Decimal] = mapped_column(Money())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    invoice: Mapped[Invoice] = relationship(back_populates="items")


class FinancialAdjustment(Base):
    """Auditable correction to an invoice. Never edited or deleted."""

    __tablename__ = "financial_adjustments"
    __table_args__ = (
        enum_check("kind", AdjustmentKind),
        enum_check("currency", Currency),
        CheckConstraint("amount > 0", name="amount_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="RESTRICT"), index=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    amount: Mapped[Decimal] = mapped_column(Money())
    currency: Mapped[str] = mapped_column(String(3))
    reason: Mapped[str] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    label: Mapped[str] = mapped_column(String(80))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (
        enum_check("status", PaymentStatus),
        enum_check("currency", Currency),
        CheckConstraint("amount > 0", name="amount_positive"),
        # A provider reference can back only one live (pending/approved) payment.
        Index(
            "uq_payments_live_reference",
            "method_code",
            func.lower(text("transaction_reference")),
            unique=True,
            postgresql_where=text("status IN ('pending', 'approved') AND transaction_reference <> ''"),
        ),
        Index("ix_payments_status_date", "status", "payment_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_number: Mapped[str] = mapped_column(String(32), unique=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id", ondelete="RESTRICT"), index=True)
    agreement_id: Mapped[int] = mapped_column(ForeignKey("rental_agreements.id", ondelete="RESTRICT"), index=True)
    unit_id: Mapped[int] = mapped_column(ForeignKey("rental_units.id", ondelete="RESTRICT"), index=True)
    amount: Mapped[Decimal] = mapped_column(Money())
    currency: Mapped[str] = mapped_column(String(3))
    payment_date: Mapped[date] = mapped_column(Date)
    method_code: Mapped[str] = mapped_column(ForeignKey("payment_methods.code", ondelete="RESTRICT"))
    transaction_reference: Mapped[str] = mapped_column(String(120), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default=PaymentStatus.PENDING.value)
    evidence_key: Mapped[str | None] = mapped_column(String(255))
    evidence_name: Mapped[str | None] = mapped_column(String(255))
    recorded_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rejection_reason: Mapped[str] = mapped_column(Text, default="")
    reversed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reversed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reversal_reason: Mapped[str] = mapped_column(Text, default="")

    allocations: Mapped[list["PaymentAllocation"]] = relationship(
        back_populates="payment", order_by="PaymentAllocation.id", cascade="all, delete-orphan"
    )
    tenant = relationship("Tenant", lazy="joined")
    agreement = relationship("RentalAgreement", lazy="joined")
    unit = relationship("RentalUnit", lazy="joined")
    method = relationship("PaymentMethod", lazy="joined")
    recorded_by = relationship("User", foreign_keys=[recorded_by_id], lazy="joined")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id], lazy="joined")
    reversed_by = relationship("User", foreign_keys=[reversed_by_id], lazy="joined")

    @property
    def allocated_amount(self) -> Decimal:
        return sum((a.amount for a in self.allocations), Decimal("0"))

    @property
    def unapplied_amount(self) -> Decimal:
        return self.amount - self.allocated_amount


class PaymentAllocation(Base):
    """Portion of a payment applied to an invoice.

    Rows of a pending payment are the *requested* allocation; they count toward
    an invoice only while the payment is approved.
    """

    __tablename__ = "payment_allocations"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        Index("uq_payment_allocations_payment_invoice", "payment_id", "invoice_id", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    payment_id: Mapped[int] = mapped_column(ForeignKey("payments.id", ondelete="RESTRICT"), index=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="RESTRICT"), index=True)
    amount: Mapped[Decimal] = mapped_column(Money())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    payment: Mapped[Payment] = relationship(back_populates="allocations")
    invoice: Mapped[Invoice] = relationship(lazy="joined")
