"""ECDH handshake — the one endpoint that is always plaintext."""

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.core import crypto
from app.core.limiter import limiter

router = APIRouter(prefix="/secure", tags=["secure"])


class HandshakeRequest(BaseModel):
    #: Client's ephemeral P-256 public key, uncompressed point, base64.
    public_key: str = Field(min_length=64, max_length=256)


class HandshakeResponse(BaseModel):
    session_id: str
    public_key: str
    salt: str
    expires_in: int
    algorithm: str = "ECDH-P256 + HKDF-SHA256 + AES-256-GCM"


@router.post("/handshake", response_model=HandshakeResponse, summary="Negotiate a session key")
@limiter.limit("60/minute")
async def handshake(request: Request, payload: HandshakeRequest) -> HandshakeResponse:
    private_key, server_public = crypto.generate_server_keypair()
    salt = crypto.new_salt()

    try:
        shared_key = crypto.derive_shared_key(private_key, payload.public_key, salt)
    except Exception:
        # A malformed point is the only realistic failure here.
        from fastapi import HTTPException, status

        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid public key") from None

    session_id = crypto.new_session_id()
    crypto.sessions.put(session_id, shared_key)

    return HandshakeResponse(
        session_id=session_id,
        public_key=server_public,
        salt=crypto.b64e(salt),
        expires_in=crypto.SESSION_TTL_SECONDS,
    )
