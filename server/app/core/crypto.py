"""
Transport payload encryption.

Every request and response body on the v1 API is sealed with AES-256-GCM under
a key agreed per session via ephemeral ECDH (P-256) + HKDF-SHA256. The wire —
and therefore the browser's Network tab — carries only ciphertext.

Honest scope: the browser must decrypt in order to render, so this is strong
against network inspection, scraping and log leakage, and *not* a defence
against someone stepping through the client in a debugger. It raises the cost
of bulk extraction enormously; it does not make the client trusted.

Cost: AES-GCM runs on AES-NI through OpenSSL here and through Web Crypto in the
browser. A 100 KB payload seals in well under a millisecond. The ECDH handshake
happens once per session.
"""

import base64
import os
import time
from dataclasses import dataclass

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

CURVE = ec.SECP256R1()
KEY_INFO = b"evaramu-e2e-v1"
NONCE_BYTES = 12
SESSION_TTL_SECONDS = 3600
MAX_SESSIONS = 20_000


def b64e(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def b64d(value: str) -> bytes:
    return base64.b64decode(value)


@dataclass(slots=True)
class Session:
    key: bytes
    expires_at: float


class SessionStore:
    """
    In-process store for negotiated session keys.

    Single-node by design; move to Redis when you run more than one worker so a
    handshake on one process is usable on another.
    """

    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._last_sweep = time.monotonic()

    def put(self, session_id: str, key: bytes, ttl: int = SESSION_TTL_SECONDS) -> None:
        self._maybe_sweep()
        if len(self._sessions) >= MAX_SESSIONS:
            self._sweep(force=True)
        self._sessions[session_id] = Session(key=key, expires_at=time.monotonic() + ttl)

    def get(self, session_id: str) -> bytes | None:
        entry = self._sessions.get(session_id)
        if entry is None:
            return None
        if entry.expires_at < time.monotonic():
            self._sessions.pop(session_id, None)
            return None
        return entry.key

    def drop(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def _maybe_sweep(self) -> None:
        if time.monotonic() - self._last_sweep > 300:
            self._sweep()

    def _sweep(self, force: bool = False) -> None:
        now = time.monotonic()
        self._last_sweep = now
        dead = [k for k, v in self._sessions.items() if v.expires_at < now]
        for key in dead:
            self._sessions.pop(key, None)
        # Under pressure, shed the oldest half rather than refuse handshakes.
        if force and len(self._sessions) >= MAX_SESSIONS:
            ordered = sorted(self._sessions.items(), key=lambda kv: kv[1].expires_at)
            for key, _ in ordered[: len(ordered) // 2]:
                self._sessions.pop(key, None)

    @property
    def size(self) -> int:
        return len(self._sessions)


sessions = SessionStore()


def generate_server_keypair() -> tuple[ec.EllipticCurvePrivateKey, str]:
    """Returns the private key and its uncompressed public point, base64."""
    private_key = ec.generate_private_key(CURVE)
    public_raw = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    return private_key, b64e(public_raw)


def derive_shared_key(
    private_key: ec.EllipticCurvePrivateKey, client_public_b64: str, salt: bytes
) -> bytes:
    """ECDH → HKDF-SHA256 → 32-byte AES key. Mirrors the client exactly."""
    client_public = ec.EllipticCurvePublicKey.from_encoded_point(
        CURVE, b64d(client_public_b64)
    )
    shared_secret = private_key.exchange(ec.ECDH(), client_public)
    return HKDF(
        algorithm=hashes.SHA256(), length=32, salt=salt, info=KEY_INFO
    ).derive(shared_secret)


def seal(key: bytes, plaintext: bytes) -> str:
    """`base64(nonce || ciphertext || tag)`."""
    nonce = os.urandom(NONCE_BYTES)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, None)
    return b64e(nonce + ciphertext)


def unseal(key: bytes, payload: str) -> bytes:
    raw = b64d(payload)
    if len(raw) <= NONCE_BYTES:
        raise ValueError("payload too short")
    return AESGCM(key).decrypt(raw[:NONCE_BYTES], raw[NONCE_BYTES:], None)


def new_session_id() -> str:
    return base64.urlsafe_b64encode(os.urandom(18)).decode().rstrip("=")


def new_salt() -> bytes:
    return os.urandom(16)
