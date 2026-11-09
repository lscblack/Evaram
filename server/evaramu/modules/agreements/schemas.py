from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from evaramu.core.money import Currency
from evaramu.core.schemas import MoneyOut, ORMModel
from evaramu.modules.agreements.models import DepositKind


class AgreementCreate(BaseModel):
    tenant_id: int
    unit_id: int
    start_date: date
    end_date: date | None = None
    monthly_rent: Decimal | None = Field(default=None, gt=0, description="Defaults to the unit's rent")
    currency: Currency | None = Field(default=None, description="Defaults to the unit's currency")
    due_day: int = Field(default=5, ge=1, le=28)
    deposit_required: Decimal = Field(default=Decimal("0"), ge=0)
    special_conditions: str = Field(default="", max_length=5000)
    activate: bool = Field(default=False, description="Activate immediately after creating")


class AgreementUpdate(BaseModel):
    unit_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    monthly_rent: Decimal | None = Field(default=None, gt=0)
    currency: Currency | None = None
    due_day: int | None = Field(default=None, ge=1, le=28)
    deposit_required: Decimal | None = Field(default=None, ge=0)
    special_conditions: str | None = Field(default=None, max_length=5000)


class TerminateIn(BaseModel):
    terminated_on: date
    reason: str = Field(min_length=3, max_length=2000)
    tenant_vacated: bool = False
    move_out_date: date | None = None


class MoveOutIn(BaseModel):
    move_out_date: date


class RenewIn(BaseModel):
    start_date: date | None = None
    end_date: date
    monthly_rent: Decimal | None = Field(default=None, gt=0)
    due_day: int | None = Field(default=None, ge=1, le=28)
    special_conditions: str | None = Field(default=None, max_length=5000)


class DepositIn(BaseModel):
    kind: DepositKind
    amount: Decimal = Field(gt=0)
    transaction_date: date
    method: str = Field(default="", max_length=32)
    reference: str = Field(default="", max_length=120)
    notes: str = Field(default="", max_length=2000)


class DepositOut(ORMModel):
    id: int
    kind: str
    amount: MoneyOut
    currency: str
    transaction_date: date
    method: str
    reference: str
    notes: str
    created_at: datetime


class AgreementOut(BaseModel):
    id: int
    agreement_number: str
    status: str
    tenant_id: int
    tenant_name: str
    tenant_phone: str
    unit_id: int
    unit_code: str
    unit_name: str
    property_id: int
    property_name: str
    location: str
    start_date: date
    end_date: date | None
    monthly_rent: MoneyOut
    currency: str
    due_day: int
    deposit_required: MoneyOut
    deposit_held: MoneyOut
    special_conditions: str
    activated_at: datetime | None
    terminated_on: date | None
    termination_reason: str
    move_out_date: date | None
    renewed_from_id: int | None
    renewed_to_id: int | None = None
    awaiting_move_out: bool = False
    days_to_expiry: int | None = None
    created_at: datetime


class AgreementDetail(AgreementOut):
    deposits: list[DepositOut] = []
    outstanding: MoneyOut = Decimal("0")
