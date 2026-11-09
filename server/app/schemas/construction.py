"""Construction projects — the job card, the queue, and the public portfolio."""

from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.construction import ProjectKind, ProjectStatus
from app.schemas.common import ORMModel

#: `NUMERIC(16, 2)` holds fourteen integer digits.
MAX_MONEY = 10**14 - 1


class Photo(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    caption: str | None = Field(default=None, max_length=200)


class UpdateOut(ORMModel):
    id: uuid.UUID
    author_id: uuid.UUID | None = None
    author_name: str | None = None
    note: str
    status: ProjectStatus | None = None
    progress_percent: int | None = None
    created_at: datetime


class ProjectOut(ORMModel):
    """The staff view — everything on the job card."""

    id: uuid.UUID
    reference: str
    title: str
    kind: ProjectKind
    description: str | None = None
    status: ProjectStatus
    client_name: str | None = None
    client_phone: str | None = None
    client_email: str | None = None
    client_id: uuid.UUID | None = None
    district: str | None = None
    sector: str | None = None
    address: str | None = None
    property_id: uuid.UUID | None = None
    engineer_id: uuid.UUID | None = None
    engineer_name: str | None = None
    currency: str
    quote_amount: float | None = None
    amount_paid: float | None = None
    started_on: date | None = None
    due_on: date | None = None
    completed_on: date | None = None
    progress_percent: int
    is_showcased: bool
    showcase_summary: str | None = None
    photos: list[Photo] | None = None
    source: str
    notes: str | None = None
    created_by_id: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectOut):
    updates: list[UpdateOut] = []


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    kind: ProjectKind = ProjectKind.OTHER
    description: str | None = None
    status: ProjectStatus = ProjectStatus.ENQUIRY
    client_name: str | None = Field(default=None, max_length=160)
    client_phone: str | None = Field(default=None, max_length=48)
    client_email: str | None = Field(default=None, max_length=255)
    client_id: uuid.UUID | None = None
    district: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=240)
    property_id: uuid.UUID | None = None
    engineer_id: uuid.UUID | None = None
    engineer_name: str | None = Field(default=None, max_length=160)
    currency: str = Field(default="RWF", min_length=3, max_length=3)
    quote_amount: float | None = Field(default=None, ge=0, le=MAX_MONEY)
    amount_paid: float | None = Field(default=None, ge=0, le=MAX_MONEY)
    started_on: date | None = None
    due_on: date | None = None
    completed_on: date | None = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    is_showcased: bool = False
    showcase_summary: str | None = None
    photos: list[Photo] | None = Field(default=None, max_length=40)
    source: str = Field(default="staff", max_length=32)
    notes: str | None = None


class ProjectUpdate(BaseModel):
    """Every field optional — a PATCH only touches what it names."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    kind: ProjectKind | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    client_name: str | None = Field(default=None, max_length=160)
    client_phone: str | None = Field(default=None, max_length=48)
    client_email: str | None = Field(default=None, max_length=255)
    client_id: uuid.UUID | None = None
    district: str | None = Field(default=None, max_length=80)
    sector: str | None = Field(default=None, max_length=80)
    address: str | None = Field(default=None, max_length=240)
    property_id: uuid.UUID | None = None
    engineer_id: uuid.UUID | None = None
    engineer_name: str | None = Field(default=None, max_length=160)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    quote_amount: float | None = Field(default=None, ge=0, le=MAX_MONEY)
    amount_paid: float | None = Field(default=None, ge=0, le=MAX_MONEY)
    started_on: date | None = None
    due_on: date | None = None
    completed_on: date | None = None
    progress_percent: int | None = Field(default=None, ge=0, le=100)
    is_showcased: bool | None = None
    showcase_summary: str | None = None
    photos: list[Photo] | None = Field(default=None, max_length=40)
    source: str | None = Field(default=None, max_length=32)
    notes: str | None = None


class UpdateIn(BaseModel):
    """A line for the job's history, optionally moving its status or progress."""

    note: str = Field(min_length=1, max_length=4000)
    status: ProjectStatus | None = None
    progress_percent: int | None = Field(default=None, ge=0, le=100)


class StaffOption(BaseModel):
    id: uuid.UUID
    full_name: str
    job_title: str | None = None
    role: str


class QueueSummary(BaseModel):
    """The numbers at the top of the manager's screen."""

    open: int
    by_status: dict[str, int]
    due_this_week: int
    overdue: int
    unassigned: int


# ------------------------------------------------------------------- public
class ShowcaseOut(BaseModel):
    """A finished project as the portfolio shows it — no client, no money."""

    reference: str
    title: str
    kind: ProjectKind
    district: str | None = None
    sector: str | None = None
    completed_on: date | None = None
    summary: str | None = None
    photos: list[Photo]


class PublicRequest(BaseModel):
    """The brief a visitor sends from the construction page."""

    full_name: str = Field(min_length=2, max_length=160)
    phone: str = Field(min_length=6, max_length=48)
    email: EmailStr | None = None
    kind: ProjectKind = ProjectKind.OTHER
    project_type: str | None = Field(default=None, max_length=120)
    package: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=80)
    location: str | None = Field(default=None, max_length=240)
    property_reference: str | None = Field(default=None, max_length=48)
    message: str | None = Field(default=None, max_length=4000)
    captcha_token: str | None = None
    captcha_answer: str | None = None

    @field_validator("full_name", "phone")
    @classmethod
    def _trim(cls, value: str) -> str:
        return value.strip()
