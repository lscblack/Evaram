from __future__ import annotations

import re
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from evaramu.core.schemas import CurrencyAmount, ORMModel
from evaramu.modules.tenants.models import IdType

PHONE_RE = re.compile(r"^\+?[0-9 ()-]{7,20}$")


def _phone(v: str | None) -> str | None:
    if v is None or v == "":
        return v
    v = v.strip()
    if not PHONE_RE.match(v):
        raise ValueError("Enter a valid phone number, e.g. +250 788 123 456")
    return v


class TenantBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str = Field(max_length=32)
    email: EmailStr | None = None
    id_type: IdType | None = None
    id_number: str | None = Field(default=None, max_length=64)
    nationality: str = Field(default="", max_length=80)
    occupation: str = Field(default="", max_length=120)
    emergency_contact_name: str = Field(default="", max_length=160)
    emergency_contact_phone: str = Field(default="", max_length=32)
    emergency_contact_relationship: str = Field(default="", max_length=64)
    notes: str = Field(default="", max_length=5000)
    registered_on: date | None = None

    _p1 = field_validator("phone")(_phone)
    _p2 = field_validator("emergency_contact_phone")(_phone)


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
    id_type: IdType | None = None
    id_number: str | None = Field(default=None, max_length=64)
    nationality: str | None = Field(default=None, max_length=80)
    occupation: str | None = Field(default=None, max_length=120)
    emergency_contact_name: str | None = Field(default=None, max_length=160)
    emergency_contact_phone: str | None = Field(default=None, max_length=32)
    emergency_contact_relationship: str | None = Field(default=None, max_length=64)
    notes: str | None = Field(default=None, max_length=5000)

    _p1 = field_validator("phone")(_phone)
    _p2 = field_validator("emergency_contact_phone")(_phone)


class CurrentTenancy(BaseModel):
    agreement_id: int
    agreement_number: str
    unit_id: int
    unit_code: str
    property_name: str


class TenantOut(ORMModel):
    id: int
    full_name: str
    phone: str
    email: str | None
    id_type: str | None
    #: Masked ("•••• 4821") unless the viewer holds tenants.view_sensitive.
    id_number: str | None
    id_number_masked: bool
    nationality: str
    occupation: str
    emergency_contact_name: str
    emergency_contact_phone: str
    emergency_contact_relationship: str
    notes: str
    registered_on: date
    is_archived: bool
    created_at: datetime
    current_tenancies: list[CurrentTenancy] = []
    outstanding: list[CurrencyAmount] = []


class TenantAgreementRow(BaseModel):
    id: int
    agreement_number: str
    status: str
    unit_id: int
    unit_code: str
    property_name: str
    start_date: date
    end_date: date | None
    monthly_rent: str
    currency: str
    move_out_date: date | None


class TenantDetail(TenantOut):
    agreements: list[TenantAgreementRow] = []
    credit: list[CurrencyAmount] = []
    total_paid: list[CurrencyAmount] = []
