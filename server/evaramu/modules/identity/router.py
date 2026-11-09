from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, Response
from sqlalchemy import func, select

from evaramu.core.config import get_settings
from evaramu.core.deps import DB, CurrentUser, require
from evaramu.core.errors import Conflict, DomainError, Forbidden, Unauthorized
from evaramu.core.ratelimit import rate_limit
from evaramu.core.schemas import Message
from evaramu.core.security import hash_password, verify_password
from evaramu.modules.identity import service
from evaramu.modules.identity.models import Permission, Role, User
from evaramu.modules.identity.permissions import ADMIN_ROLE
from evaramu.modules.identity.schemas import (
    LoginIn,
    MeOut,
    PasswordChange,
    PasswordReset,
    PermissionOut,
    RoleIn,
    RoleOut,
    RoleUpdate,
    TokenOut,
    UserCreate,
    UserOut,
    UserUpdate,
)
from evaramu.modules.system.services import audit, diff

REFRESH_COOKIE = "evaramu_refresh"

auth_router = APIRouter(prefix="/auth", tags=["auth"])
users_router = APIRouter(prefix="/users", tags=["users"])
roles_router = APIRouter(tags=["roles"])


def _cookie_path() -> str:
    return f"{get_settings().API_PREFIX}/auth"


def _set_refresh_cookie(response: Response, raw: str) -> None:
    s = get_settings()
    response.set_cookie(
        REFRESH_COOKIE,
        raw,
        max_age=s.REFRESH_TOKEN_TTL_DAYS * 86400,
        httponly=True,
        secure=s.COOKIE_SECURE,
        samesite="strict",
        path=_cookie_path(),
    )


def _me(user: User) -> MeOut:
    return MeOut.model_validate(
        {**UserOut.model_validate(user).model_dump(), "permissions": sorted(user.permission_codes)}
    )


def _csrf_guard(x_requested_with: Annotated[str | None, Header()] = None) -> None:
    # Cookie-authenticated endpoints require a custom header, which a
    # cross-site form post cannot set (defence in depth beyond SameSite).
    if x_requested_with != "evaramu":
        raise Forbidden("Missing request header", code="csrf")


@auth_router.post(
    "/login", response_model=TokenOut, dependencies=[Depends(rate_limit("login", 10, 60))]
)
def login(body: LoginIn, request: Request, response: Response, db: DB):
    user = service.authenticate(db, body.email, body.password)
    access, ttl, raw = service.issue_tokens(db, user, request.headers.get("user-agent"))
    audit(db, actor=user, action="auth.login", entity_type="user", entity_id=user.id,
          summary=f"{user.email} signed in", request=request)
    db.commit()
    _set_refresh_cookie(response, raw)
    return TokenOut(access_token=access, expires_in=ttl, user=_me(user))


@auth_router.post(
    "/refresh",
    response_model=TokenOut,
    dependencies=[Depends(_csrf_guard), Depends(rate_limit("refresh", 60, 60))],
)
def refresh(request: Request, response: Response, db: DB):
    user, access, ttl, raw = service.rotate_refresh(
        db, request.cookies.get(REFRESH_COOKIE), request.headers.get("user-agent")
    )
    db.commit()
    _set_refresh_cookie(response, raw)
    return TokenOut(access_token=access, expires_in=ttl, user=_me(user))


@auth_router.post("/logout", response_model=Message, dependencies=[Depends(_csrf_guard)])
def logout(request: Request, response: Response, db: DB):
    service.revoke_refresh(db, request.cookies.get(REFRESH_COOKIE))
    db.commit()
    response.delete_cookie(REFRESH_COOKIE, path=_cookie_path())
    return Message(detail="Signed out")


@auth_router.get("/me", response_model=MeOut)
def me(user: CurrentUser):
    return _me(user)


@auth_router.post(
    "/change-password", response_model=Message, dependencies=[Depends(rate_limit("pwchange", 10, 300))]
)
def change_password(body: PasswordChange, request: Request, response: Response, user: CurrentUser, db: DB):
    if not verify_password(body.current_password, user.password_hash):
        raise Unauthorized("Current password is incorrect", code="bad_credentials")
    user.password_hash = hash_password(body.new_password)
    service.end_all_sessions(db, user)
    audit(db, actor=user, action="auth.password_changed", entity_type="user", entity_id=user.id,
          summary=f"{user.email} changed their password", request=request)
    db.commit()
    response.delete_cookie(REFRESH_COOKIE, path=_cookie_path())
    return Message(detail="Password changed. Please sign in again.")


# Email codes and passkeys live in their own module, under /auth as well.
from evaramu.modules.identity import passwordless  # noqa: E402

auth_router.include_router(passwordless.router)


# ---------------------------------------------------------------- users ----


@users_router.get("", response_model=list[UserOut], dependencies=[Depends(require("users.manage"))])
def list_users(db: DB):
    return list(db.execute(select(User).order_by(User.full_name)).scalars())


@users_router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, request: Request, db: DB,
                actor: Annotated[User, Depends(require("users.manage"))]):
    service.ensure_unique_email(db, body.email)
    service.get_role(db, body.role_id)
    user = User(
        email=body.email.lower(),
        full_name=body.full_name.strip(),
        phone=body.phone,
        role_id=body.role_id,
        password_hash=hash_password(body.password),
        is_active=True,
        token_version=0,
        failed_login_count=0,
    )
    db.add(user)
    db.flush()
    audit(db, actor=actor, action="user.created", entity_type="user", entity_id=user.id,
          summary=f"Created staff account {user.email}", request=request)
    db.commit()
    db.refresh(user)
    return user


@users_router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, request: Request, db: DB,
                actor: Annotated[User, Depends(require("users.manage"))]):
    user = db.get(User, user_id)
    if user is None:
        raise DomainError("User not found", code="not_found")
    data = body.model_dump(exclude_unset=True)
    if "role_id" in data and data["role_id"] is not None:
        service.get_role(db, data["role_id"])
    was_admin = user.role.name == ADMIN_ROLE and user.is_active
    if user.id == actor.id and (data.get("is_active") is False or
                                ("role_id" in data and data["role_id"] != user.role_id)):
        raise Conflict("You cannot deactivate yourself or change your own role")
    changes = diff(user, {k: v for k, v in data.items() if v is not None or k == "phone"})
    db.flush()
    db.refresh(user)
    if was_admin and (user.role.name != ADMIN_ROLE or not user.is_active) and service.active_admin_count(db) == 0:
        raise Conflict("At least one active Administrator must remain")
    if "is_active" in changes or "role_id" in changes:
        service.end_all_sessions(db, user)
    audit(db, actor=actor, action="user.updated", entity_type="user", entity_id=user.id,
          summary=f"Updated staff account {user.email}", changes=changes, request=request)
    db.commit()
    return user


@users_router.post("/{user_id}/reset-password", response_model=Message)
def reset_password(user_id: int, body: PasswordReset, request: Request, db: DB,
                   actor: Annotated[User, Depends(require("users.manage"))]):
    user = db.get(User, user_id)
    if user is None:
        raise DomainError("User not found", code="not_found")
    user.password_hash = hash_password(body.new_password)
    user.locked_until = None
    user.failed_login_count = 0
    service.end_all_sessions(db, user)
    audit(db, actor=actor, action="user.password_reset", entity_type="user", entity_id=user.id,
          summary=f"Reset password for {user.email}", request=request)
    db.commit()
    return Message(detail="Password reset. The user must sign in with the new password.")


# ---------------------------------------------------------------- roles ----


def _role_out(db, role: Role) -> RoleOut:
    count = db.execute(select(func.count(User.id)).where(User.role_id == role.id)).scalar_one()
    return RoleOut(id=role.id, name=role.name, description=role.description, is_system=role.is_system,
                   permissions=[p.code for p in role.permissions], user_count=count)


@roles_router.get("/permissions", response_model=list[PermissionOut],
                  dependencies=[Depends(require("roles.manage"))])
def list_permissions(db: DB):
    return list(db.execute(select(Permission).order_by(Permission.group, Permission.code)).scalars())


@roles_router.get("/roles", response_model=list[RoleOut])
def list_roles(db: DB, user: CurrentUser):
    if not ({"roles.manage", "users.manage"} & user.permission_codes):
        raise Forbidden("You do not have permission to perform this action.")
    return [_role_out(db, r) for r in db.execute(select(Role).order_by(Role.name)).scalars()]


@roles_router.post("/roles", response_model=RoleOut, status_code=201)
def create_role(body: RoleIn, request: Request, db: DB,
                actor: Annotated[User, Depends(require("roles.manage"))]):
    if db.execute(select(Role.id).where(func.lower(Role.name) == body.name.lower())).first():
        raise Conflict("A role with this name already exists")
    role = Role(name=body.name.strip(), description=body.description, is_system=False)
    role.permissions = service.resolve_permissions(db, body.permission_codes)
    db.add(role)
    db.flush()
    audit(db, actor=actor, action="role.created", entity_type="role", entity_id=role.id,
          summary=f"Created role {role.name}", changes={"permissions": body.permission_codes}, request=request)
    db.commit()
    return _role_out(db, role)


@roles_router.patch("/roles/{role_id}", response_model=RoleOut)
def update_role(role_id: int, body: RoleUpdate, request: Request, db: DB,
                actor: Annotated[User, Depends(require("roles.manage"))]):
    role = service.get_role(db, role_id)
    if role.name == ADMIN_ROLE and (body.permission_codes is not None or body.name not in (None, ADMIN_ROLE)):
        raise Conflict("The Administrator role always holds every permission and cannot be renamed")
    changes: dict = {}
    if body.name is not None and body.name != role.name:
        if role.is_system:
            raise Conflict("Built-in roles cannot be renamed")
        if db.execute(select(Role.id).where(func.lower(Role.name) == body.name.lower(), Role.id != role.id)).first():
            raise Conflict("A role with this name already exists")
        changes["name"] = {"from": role.name, "to": body.name}
        role.name = body.name.strip()
    if body.description is not None:
        role.description = body.description
    if body.permission_codes is not None:
        before = sorted(p.code for p in role.permissions)
        role.permissions = service.resolve_permissions(db, body.permission_codes)
        changes["permissions"] = {"from": before, "to": sorted(body.permission_codes)}
    audit(db, actor=actor, action="role.updated", entity_type="role", entity_id=role.id,
          summary=f"Updated role {role.name}", changes=changes, request=request)
    db.commit()
    return _role_out(db, role)


@roles_router.delete("/roles/{role_id}", response_model=Message)
def delete_role(role_id: int, request: Request, db: DB,
                actor: Annotated[User, Depends(require("roles.manage"))]):
    role = service.get_role(db, role_id)
    if role.is_system:
        raise Conflict("Built-in roles cannot be deleted")
    if db.execute(select(func.count(User.id)).where(User.role_id == role.id)).scalar_one():
        raise Conflict("Reassign the users of this role before deleting it")
    audit(db, actor=actor, action="role.deleted", entity_type="role", entity_id=role.id,
          summary=f"Deleted role {role.name}", request=request)
    db.delete(role)
    db.commit()
    return Message(detail="Role deleted")
