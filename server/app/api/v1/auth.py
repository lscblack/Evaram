from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import client_ip, get_current_user
from app.core.limiter import limiter
from app.core.security import (
    hash_password,
    validate_password_strength,
    verify_password,
)
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    CaptchaIssue,
    LoginChallenge,
    LoginRequest,
    OtpResendRequest,
    OtpVerifyRequest,
    PasswordChange,
    ProfileUpdate,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserPublic,
)
from app.schemas.common import Message
from app.services import auth_service, captcha_service, storage_service
from app.services.audit import diff, record

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/captcha", response_model=CaptchaIssue, summary="Issue a captcha challenge")
@limiter.limit("30/minute")
async def get_captcha(
    request: Request,
    scope: str = "generic",
    db: AsyncSession = Depends(get_db),
) -> CaptchaIssue:
    return await captcha_service.issue(db, ip=client_ip(request), scope=scope)


@router.post(
    "/login",
    response_model=LoginChallenge,
    summary="Step 1 — verify the password and send a one-time code",
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginChallenge:
    await captcha_service.verify(db, payload.captcha_token, payload.captcha_answer, scope="login")
    _, challenge = await auth_service.start_login(db, payload.email, payload.password)
    return challenge


@router.post(
    "/verify-otp",
    response_model=TokenPair,
    summary="Step 2 — exchange the one-time code for a session",
)
@limiter.limit("20/minute")
async def verify_otp(
    request: Request,
    payload: OtpVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    pair = await auth_service.verify_otp(db, payload.pre_auth_token, payload.code, request)
    await record(
        db,
        actor=None,
        action="auth.login",
        entity_type="user",
        entity_id=str(pair.user.id),
        summary=f"{pair.user.email} signed in",
        request=request,
    )
    await db.commit()
    return pair


@router.post("/resend-otp", response_model=LoginChallenge, summary="Resend the code")
@limiter.limit("5/minute")
async def resend_otp(
    request: Request,
    payload: OtpResendRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginChallenge:
    return await auth_service.resend_otp(db, payload.pre_auth_token)


@router.post("/refresh", response_model=TokenPair, summary="Rotate the session")
@limiter.limit("60/minute")
async def refresh(
    request: Request,
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    return await auth_service.refresh_session(db, payload.refresh_token, request)


@router.post("/logout", response_model=Message, summary="Revoke the current session")
async def logout(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> Message:
    await auth_service.revoke_session(db, payload.refresh_token)
    return Message(detail="Signed out")


@router.post("/logout-all", response_model=Message, summary="Revoke every session")
async def logout_all(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Message:
    await auth_service.revoke_all_sessions(db, user.id)
    return Message(detail="All sessions revoked")


@router.post(
    "/register",
    response_model=LoginChallenge,
    status_code=status.HTTP_201_CREATED,
    summary="Public self-service registration (buyer/seller accounts)",
)
@limiter.limit("5/hour")
async def register(
    request: Request,
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginChallenge:
    await captcha_service.verify(
        db, payload.captcha_token, payload.captcha_answer, scope="register"
    )

    error = validate_password_strength(payload.password)
    if error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, error)

    email = payload.email.lower().strip()
    if await db.scalar(select(User.id).where(User.email == email)):
        # Do not confirm which addresses exist.
        raise HTTPException(
            status.HTTP_409_CONFLICT, "That email cannot be registered. Try signing in instead."
        )

    user = User(
        email=email,
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        role=UserRole.USER,
        status=UserStatus.PENDING,
    )
    db.add(user)
    await db.commit()

    _, challenge = await auth_service.start_login(db, email, payload.password)
    return challenge


@router.get("/me", response_model=UserPublic, summary="The signed-in account")
async def me(user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(user)


@router.patch("/me", response_model=UserPublic, summary="Update your own profile")
async def update_me(
    request: Request,
    payload: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    """Change your own details.

    Email is not here on purpose: it is the account's identity and the address
    a sign-in code goes to, so changing it is a verification flow rather than a
    form field.
    """
    changes = payload.model_dump(exclude_unset=True)
    before = {key: getattr(user, key) for key in changes}

    for key, value in changes.items():
        setattr(user, key, value)

    await record(
        db,
        actor=user,
        action="auth.profile_update",
        entity_type="user",
        entity_id=str(user.id),
        changes=diff(before, {k: getattr(user, k) for k in changes}),
        request=request,
    )
    await db.commit()
    await db.refresh(user)
    return UserPublic.model_validate(user)


@router.post(
    "/me/photo",
    response_model=UserPublic,
    summary="Upload your profile picture",
)
@limiter.limit("12/hour")
async def upload_my_photo(
    request: Request,
    file: UploadFile = File(..., description="A square-ish image works best"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    """Replace the signed-in user's picture.

    The previous file is deleted rather than orphaned — a profile picture is
    personal data, and leaving old ones on disk means the person cannot really
    remove their face from our servers.
    """
    stored = await storage_service.save_upload(file, kind="avatar")
    previous = user.photo_url
    user.photo_url = stored["url"]

    await record(
        db, actor=user, action="auth.photo_update", entity_type="user",
        entity_id=str(user.id), request=request,
    )
    await db.commit()
    await db.refresh(user)

    if previous:
        storage_service.delete(previous)
    return UserPublic.model_validate(user)


@router.delete("/me/photo", response_model=UserPublic, summary="Remove your picture")
async def delete_my_photo(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    previous = user.photo_url
    user.photo_url = None
    await record(
        db, actor=user, action="auth.photo_remove", entity_type="user",
        entity_id=str(user.id), request=request,
    )
    await db.commit()
    await db.refresh(user)

    if previous:
        storage_service.delete(previous)
    return UserPublic.model_validate(user)


@router.post("/change-password", response_model=Message)
async def change_password(
    request: Request,
    payload: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Message:
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")

    error = validate_password_strength(payload.new_password)
    if error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, error)

    user.hashed_password = hash_password(payload.new_password)
    await record(
        db,
        actor=user,
        action="auth.password_change",
        entity_type="user",
        entity_id=str(user.id),
        request=request,
    )
    await db.commit()

    # Force every other device to sign in again.
    await auth_service.revoke_all_sessions(db, user.id)
    return Message(detail="Password updated. Please sign in again on your other devices.")


@router.get("/config", summary="Public auth configuration for the client")
async def auth_config() -> dict:
    return {
        "captcha_required": settings.CAPTCHA_REQUIRED,
        "otp_length": settings.OTP_LENGTH,
        "otp_ttl_seconds": settings.OTP_TTL_SECONDS,
        "password_min_length": 10,
    }
