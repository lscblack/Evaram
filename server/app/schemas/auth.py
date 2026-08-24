import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole, UserStatus
from app.schemas.common import ORMModel


# ---------------------------------------------------------------- captcha
class CaptchaIssue(BaseModel):
    token: str
    prompt: str
    #: Inline SVG — the answer is never sent to the client.
    image_svg: str
    expires_in: int


class CaptchaAnswer(BaseModel):
    token: str
    answer: str = Field(min_length=1, max_length=32)


# ---------------------------------------------------------------- login
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)
    captcha_token: str | None = None
    captcha_answer: str | None = None


class LoginChallenge(BaseModel):
    """Step one succeeded; an OTP is now required."""

    status: str = "otp_required"
    pre_auth_token: str
    #: Masked destination, e.g. `l***@gmail.com`.
    sent_to: str
    expires_in: int
    #: True when SMTP could not deliver, so the UI can offer a resend.
    delivery_failed: bool = False


class OtpVerifyRequest(BaseModel):
    pre_auth_token: str
    code: str = Field(min_length=4, max_length=12)


class OtpResendRequest(BaseModel):
    pre_auth_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserPublic"


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------- users
class UserPublic(ORMModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    status: UserStatus
    phone: str | None = None
    job_title: str | None = None
    division: str | None = None
    photo_url: str | None = None
    email_verified: bool
    last_login_at: datetime | None = None
    created_at: datetime


class UserAdminOut(UserPublic):
    """Everything the console needs to edit a staff profile.

    `UserPublic` deliberately stays lean — it is what the app hands to the
    signed-in user about themselves. The console additionally needs the fields
    that drive the public team page, or it cannot populate an edit form.
    """

    bio: str | None = None
    languages: list[str] | None = None
    specialties: list[str] | None = None
    covers: list[str] | None = None
    linkedin_url: str | None = None
    joined_year: str | None = None
    rating: float | None = None
    deals_closed: int = 0
    is_public: bool = False
    display_order: int = 0


class TeamMemberPublic(ORMModel):
    """The subset of a staff profile that appears on the public team page."""

    id: uuid.UUID
    full_name: str
    job_title: str | None = None
    division: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    email: EmailStr
    phone: str | None = None
    languages: list[str] | None = None
    specialties: list[str] | None = None
    covers: list[str] | None = None
    linkedin_url: str | None = None
    joined_year: str | None = None
    rating: float | None = None
    deals_closed: int
    display_order: int


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str | None = Field(default=None, max_length=256)
    role: UserRole = UserRole.USER
    phone: str | None = None
    job_title: str | None = None
    division: str | None = None
    send_welcome_email: bool = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = None
    role: UserRole | None = None
    status: UserStatus | None = None
    job_title: str | None = None
    division: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    languages: list[str] | None = None
    specialties: list[str] | None = None
    covers: list[str] | None = None
    linkedin_url: str | None = None
    joined_year: str | None = None
    rating: float | None = None
    deals_closed: int | None = None
    is_public: bool | None = None
    display_order: int | None = None
    otp_enabled: bool | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=256)


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=10, max_length=256)
    phone: str | None = None
    captcha_token: str | None = None
    captcha_answer: str | None = None


TokenPair.model_rebuild()


class UserDeleteRequest(BaseModel):
    """Ids to delete, capped so one request cannot wipe the table."""

    ids: list[uuid.UUID] = Field(min_length=1, max_length=100)
    #: Delete even when it would take bid history with it. Off by default so a
    #: destructive cascade is always a deliberate second decision.
    force: bool = False


class UserDeleteOutcome(BaseModel):
    id: uuid.UUID
    email: str | None = None
    deleted: bool
    reason: str | None = None


class UserDeleteResult(BaseModel):
    deleted: int
    skipped: int
    outcomes: list[UserDeleteOutcome]
    detail: str
