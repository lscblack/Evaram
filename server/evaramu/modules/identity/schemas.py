from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from evaramu.core.schemas import ORMModel
from evaramu.core.security import validate_password_strength


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class PermissionOut(ORMModel):
    code: str
    group: str
    description: str


class RoleBrief(ORMModel):
    id: int
    name: str


class RoleOut(ORMModel):
    id: int
    name: str
    description: str
    is_system: bool
    permissions: list[str]
    user_count: int = 0


class RoleIn(BaseModel):
    name: str = Field(min_length=2, max_length=64)
    description: str = Field(default="", max_length=255)
    permission_codes: list[str] = []


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=64)
    description: str | None = Field(default=None, max_length=255)
    permission_codes: list[str] | None = None


class UserOut(ORMModel):
    id: int
    email: str
    full_name: str
    phone: str | None
    is_active: bool
    role: RoleBrief
    last_login_at: datetime | None
    created_at: datetime


class MeOut(UserOut):
    permissions: list[str]


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: MeOut


def _strong(v: str) -> str:
    validate_password_strength(v)
    return v


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    role_id: int
    password: str = Field(max_length=256)

    _pw = field_validator("password")(_strong)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    role_id: int | None = None
    is_active: bool | None = None


class PasswordReset(BaseModel):
    new_password: str = Field(max_length=256)

    _pw = field_validator("new_password")(_strong)


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=256)
    new_password: str = Field(max_length=256)

    _pw = field_validator("new_password")(_strong)
