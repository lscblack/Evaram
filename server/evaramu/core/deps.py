"""Request dependencies: database session, current user, permission checks."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Query, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from evaramu.core.database import get_db
from evaramu.core.errors import Forbidden, Unauthorized
from evaramu.core.security import decode_access_token
from evaramu.modules.identity.models import User

DB = Annotated[Session, Depends(get_db)]

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    db: DB,
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise Unauthorized("Authentication required")
    payload = decode_access_token(creds.credentials)
    if payload is None:
        raise Unauthorized("Session expired. Please sign in again.", code="token_invalid")
    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active or user.token_version != payload.get("ver"):
        raise Unauthorized("Session is no longer valid. Please sign in again.", code="token_invalid")
    request.state.user = user
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require(*codes: str):
    """Dependency enforcing that the user holds *all* given permissions."""

    def dependency(user: CurrentUser) -> User:
        missing = [c for c in codes if c not in user.permission_codes]
        if missing:
            raise Forbidden("You do not have permission to perform this action.")
        return user

    return dependency


class PageParams:
    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        page_size: Annotated[int, Query(ge=1, le=200)] = 25,
    ):
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


Paging = Annotated[PageParams, Depends()]
