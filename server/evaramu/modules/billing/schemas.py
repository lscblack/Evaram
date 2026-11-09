from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from evaramu.core.schemas import MoneyOut, ORMModel
from evaramu.modules.billing.models import AdjustmentKind


class InvoiceItemOut(ORMModel):
    id: int
    kind: str
    description: str
    amount: MoneyOut


class AdjustmentOut(ORMModel):
    id: int
    kind: str
    amount: MoneyOut
    currency: str
    reason: str
    created_at: datetime


class AllocationOut(BaseModel):
    payment_id: int
    payment_number: str
    invoice_id: int
    invoice_number: str
    amount: MoneyOut
    payment_status: str
    payment_date: date
    method: str


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    kind: str
    status: str
    agreement_id: int
    agreement_number: str
    tenant_id: int
    tenant_name: str
    unit_id: int
    unit_code: str
    property_name: str
    location: str
    period_start: date | None
    period_end: date | None
    issue_date: date
    due_date: date
    currency: str
    amount_charged: MoneyOut
    amount_credited: MoneyOut
    amount_paid: MoneyOut
    balance_due: MoneyOut
    previous_balance: MoneyOut
    total_due: MoneyOut
    days_overdue: int = 0
    created_at: datetime


class InvoiceDetail(InvoiceOut):
    items: list[InvoiceItemOut]
    adjustments: list[AdjustmentOut]
    allocations: list[AllocationOut]
    notes: str
    void_reason: str
    pending_amount: MoneyOut = Decimal("0")


class GenerateIn(BaseModel):
    period: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="YYYY-MM")
    agreement_id: int | None = None


class GenerateOut(BaseModel):
    period: str
    created: int
    skipped: int
    invoice_numbers: list[str]


class InvoiceLineIn(BaseModel):
    description: str = Field(min_length=2, max_length=255)
    amount: Decimal = Field(gt=0)


class ManualInvoiceIn(BaseModel):
    agreement_id: int
    issue_date: date
    due_date: date
    items: list[InvoiceLineIn] = Field(min_length=1, max_length=20)
    notes: str = Field(default="", max_length=2000)


class AdjustmentIn(BaseModel):
    kind: AdjustmentKind
    amount: Decimal = Field(gt=0)
    reason: str = Field(min_length=3, max_length=2000)


class ReasonIn(BaseModel):
    reason: str = Field(min_length=3, max_length=2000)


class AllocationIn(BaseModel):
    invoice_id: int
    amount: Decimal = Field(gt=0)


class PaymentMethodOut(ORMModel):
    id: int
    code: str
    label: str
    is_active: bool
    sort_order: int


class PaymentMethodIn(BaseModel):
    code: str = Field(pattern=r"^[a-z][a-z0-9_]{1,31}$")
    label: str = Field(min_length=2, max_length=80)
    is_active: bool = True
    sort_order: int = Field(default=10, ge=0, le=1000)


class PaymentMethodUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=2, max_length=80)
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0, le=1000)


class PaymentOut(BaseModel):
    id: int
    payment_number: str
    status: str
    tenant_id: int
    tenant_name: str
    agreement_id: int
    agreement_number: str
    unit_id: int
    unit_code: str
    property_name: str
    amount: MoneyOut
    currency: str
    payment_date: date
    method_code: str
    method_label: str
    transaction_reference: str
    notes: str
    has_evidence: bool
    recorded_by: str | None
    created_at: datetime
    reviewed_by: str | None
    reviewed_at: datetime | None
    rejection_reason: str
    reversed_by: str | None
    reversed_at: datetime | None
    reversal_reason: str
    allocated_amount: MoneyOut
    unapplied_amount: MoneyOut
    allocations: list[AllocationOut]
    possible_duplicate_of: list[str] = []
    months_covered: int | None = None


class CoverageMonth(BaseModel):
    period: str               # YYYY-MM
    label: str                # "November 2026"
    amount_due: MoneyOut
    invoice_number: str | None  # None: the invoice is created when the payment is approved


class CoverageOut(BaseModel):
    agreement_id: int
    currency: str
    requested: int
    available: int
    total: MoneyOut
    months: list[CoverageMonth]


class ApproveIn(BaseModel):
    confirm_duplicate: bool = False
    auto_allocate: bool = True
    note: str = Field(default="", max_length=1000)


class PaymentMethodBreakdown(BaseModel):
    method_code: str
    currency: str
    amount: MoneyOut
    count: int
