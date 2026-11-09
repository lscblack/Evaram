"""Runtime configuration.

Values come from real environment variables first, then ``server/.env``. The
file location is resolved from this module (not the working directory) so the
app reads the same configuration whether it is started from ``server/``, from
the repository root, or by systemd.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL

SERVER_ROOT = Path(__file__).resolve().parents[2]

_INSECURE_SECRETS = {
    "",
    "replace-with-a-long-random-string",
    "change-me",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=SERVER_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    APP_NAME: str = "Evaramu Rent Management API"
    APP_ENV: Literal["development", "staging", "production", "test"] = "development"
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # ---- database (no defaults for credentials: they must come from env) ----
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = ""
    DB_PASSWORD: str = ""
    DB_NAME: str = ""
    DB_SSLMODE: str = "disable"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10
    TEST_DB_NAME: str | None = None

    # ---- security ----
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_MINUTES: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 14
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15
    COOKIE_SECURE: bool = False
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # ---- files ----
    MEDIA_ROOT: Path = Field(default=SERVER_ROOT / "storage" / "media")
    PRIVATE_ROOT: Path = Field(default=SERVER_ROOT / "storage" / "private")
    MAX_UPLOAD_MB: int = 8

    PUBLIC_SITE_URL: str = "http://localhost:5173"

    # ---- email (sign-in codes) ----
    #: smtp = send through SMTP_*; file = write .eml files to MAIL_OUTBOX_DIR (development/tests only);
    #: disabled = the "email me a code" option is hidden.
    MAIL_BACKEND: Literal["smtp", "file", "disabled"] = "disabled"
    MAIL_FROM: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: SecretStr = SecretStr("")
    SMTP_SECURITY: Literal["starttls", "ssl", "none"] = "starttls"
    MAIL_OUTBOX_DIR: Path = Field(default=SERVER_ROOT / "storage" / "outbox")
    LOGIN_CODE_TTL_MINUTES: int = 10

    # ---- passkeys (WebAuthn) ----
    #: Domain the passkeys belong to (e.g. evaramu.rw). Default: host of PUBLIC_SITE_URL.
    WEBAUTHN_RP_ID: str = ""
    WEBAUTHN_RP_NAME: str = "Evaramu"
    #: Comma-separated site origins allowed to use passkeys. Default: origin of PUBLIC_SITE_URL.
    WEBAUTHN_ORIGINS: str = ""

    # ---- bootstrap administrator (optional) ----
    # When both are set, `cli ensure-admin` (run by scripts/migrate.sh) creates
    # this account if it does not exist yet. An existing account is never
    # modified, so a password changed in the app is not overwritten.
    SUPER_ADMIN_EMAIL: str = ""
    SUPER_ADMIN_PASSWORD: SecretStr = SecretStr("")
    SUPER_ADMIN_NAME: str = "Administrator"

    @model_validator(mode="after")
    def _resolve_and_validate(self) -> "Settings":
        # Relative storage paths are relative to server/, never the CWD.
        if not self.MEDIA_ROOT.is_absolute():
            self.MEDIA_ROOT = (SERVER_ROOT / self.MEDIA_ROOT).resolve()
        if not self.PRIVATE_ROOT.is_absolute():
            self.PRIVATE_ROOT = (SERVER_ROOT / self.PRIVATE_ROOT).resolve()
        if not self.MAIL_OUTBOX_DIR.is_absolute():
            self.MAIL_OUTBOX_DIR = (SERVER_ROOT / self.MAIL_OUTBOX_DIR).resolve()
        if self.MAIL_BACKEND == "smtp" and not (self.SMTP_HOST and self.MAIL_FROM):
            raise ValueError("MAIL_BACKEND=smtp needs SMTP_HOST and MAIL_FROM")
        if self.APP_ENV == "production":
            if self.SECRET_KEY in _INSECURE_SECRETS or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be set to at least 32 random characters in production"
                )
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
            if self.MAIL_BACKEND == "file":
                raise ValueError("MAIL_BACKEND=file is for development only; use smtp or disabled in production")
        return self

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def webauthn_rp_id(self) -> str:
        return self.WEBAUTHN_RP_ID or (urlsplit(self.PUBLIC_SITE_URL).hostname or "localhost")

    @property
    def webauthn_origins(self) -> list[str]:
        if self.WEBAUTHN_ORIGINS.strip():
            return [o.strip().rstrip("/") for o in self.WEBAUTHN_ORIGINS.split(",") if o.strip()]
        u = urlsplit(self.PUBLIC_SITE_URL)
        return [f"{u.scheme}://{u.netloc}"]

    @property
    def mail_enabled(self) -> bool:
        return self.MAIL_BACKEND != "disabled"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def signing_key(self) -> str:
        """Key used to sign tokens.

        Outside production a missing/short SECRET_KEY is tolerated by deriving
        a per-database key, so local development works out of the box; the
        production validator above refuses to start without a real secret.
        """
        if len(self.SECRET_KEY) >= 32:
            return self.SECRET_KEY
        return f"dev-only-insecure-key::{self.DB_NAME}::{self.DB_HOST}::not-for-production"

    def database_url(self, database: str | None = None) -> URL:
        if not self.DB_NAME and database is None:
            raise RuntimeError("DB_NAME is not configured (server/.env or environment)")
        return URL.create(
            "postgresql+psycopg",
            username=self.DB_USER or None,
            password=self.DB_PASSWORD or None,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=database or self.DB_NAME,
            query={"sslmode": self.DB_SSLMODE} if self.DB_SSLMODE else {},
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
