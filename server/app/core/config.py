from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, computed_field
from sqlalchemy import URL
from pydantic_settings import BaseSettings, SettingsConfigDict

#: `server/`, derived from this file rather than the working directory.
#:
#: A bare `env_file=".env"` is resolved against the process CWD, so the app
#: silently fell back to the compiled defaults whenever it was not launched
#: from `server/` — which is the normal case under systemd, where the unit's
#: WorkingDirectory decides it. Booting against the wrong database because of
#: the directory you happened to be in is not a failure worth keeping.
SERVER_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime configuration, read from the environment / `.env`."""

    model_config = SettingsConfigDict(
        # Real environment variables still win over the file, so a container or
        # a systemd `Environment=` line can override any of this.
        env_file=SERVER_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # ---------------- app ----------------
    APP_NAME: str = "Evaramu API"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # ---------------- database ----------------
    DB_HOST: str = "localhost"
    DB_PORT: int = 5433
    DB_USER: str = "evaramu"
    DB_PASSWORD: str = "evaramu_dev_pwd"
    DB_NAME: str = "evaramu"
    DB_SSLMODE: str = "disable"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # ---------------- security ----------------
    SECRET_KEY: str = Field(
        default="change-me-in-production-a-long-random-string-please",
        min_length=32,
    )
    ACCESS_TOKEN_TTL_MINUTES: int = 30
    REFRESH_TOKEN_TTL_DAYS: int = 14
    JWT_ALGORITHM: str = "HS256"

    OTP_TTL_SECONDS: int = 600
    OTP_LENGTH: int = 6
    OTP_MAX_ATTEMPTS: int = 5
    #: Fixed code accepted for the super admin so the founder is never locked
    #: out if SMTP is unavailable. Ignored entirely for every other role.
    SUPER_ADMIN_OTP_BYPASS: str = "555555"

    LOGIN_MAX_ATTEMPTS: int = 8
    LOGIN_LOCKOUT_MINUTES: int = 15

    CAPTCHA_TTL_SECONDS: int = 300
    CAPTCHA_REQUIRED: bool = True

    # ---------------- bootstrap super admin ----------------
    SUPER_ADMIN_EMAIL: str = "louesauveur18@gmail.com"
    SUPER_ADMIN_PASSWORD: str = "Chriss@123"
    SUPER_ADMIN_NAME: str = "Super Admin"

    # ---------------- email ----------------
    EMAIL_SMTP_SERVER: str = "mail.nexventures.net"
    EMAIL_SMTP_PORT: int = 587
    EMAIL_SENDER_EMAIL: str = "security@nexventures.net"
    EMAIL_SENDER_PASSWORD: str = ""
    EMAIL_LOGIN: str = "security@nexventures.net"
    EMAIL_FROM_NAME: str = "Evaramu Group Ltd"
    EMAIL_ENABLED: bool = True
    #: When SMTP is unreachable in dev, log the message instead of failing.
    EMAIL_FAIL_SILENTLY: bool = True

    # ---------------- cors ----------------
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5180,http://127.0.0.1:5180"

    # ---------------- media ----------------
    MEDIA_ROOT: str = "media"
    MEDIA_URL: str = "/media"
    MAX_UPLOAD_MB: int = 25

    # ---------------- caching ----------------
    PUBLIC_CACHE_TTL_SECONDS: int = 60

    @computed_field
    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def _url(self, driver: str) -> str:
        """Assemble the DSN with every component escaped.

        Built through `URL.create` rather than an f-string on purpose: a
        password containing `@`, `:`, `/`, `?`, `#` or `%` silently corrupts an
        interpolated URL. `Very@Strong@Pass@127.0.0.1` parses as the host
        `Strong@Pass@127.0.0.1`, which then fails as a DNS error and sends you
        looking at the wrong thing entirely.
        """
        return URL.create(
            driver,
            username=self.DB_USER,
            password=self.DB_PASSWORD,
            host=self.DB_HOST,
            port=self.DB_PORT,
            database=self.DB_NAME,
        ).render_as_string(hide_password=False)

    @computed_field
    @property
    def database_url(self) -> str:
        return self._url("postgresql+asyncpg")

    @computed_field
    @property
    def sync_database_url(self) -> str:
        """Alembic runs synchronously."""
        return self._url("postgresql+psycopg2")

    @computed_field
    @property
    def alembic_url(self) -> str:
        """`sync_database_url`, safe to hand to `config.set_main_option`.

        Alembic stores that value in a ConfigParser, which treats `%` as the
        start of an interpolation. Percent-encoding the password (`@` → `%40`)
        therefore produces a config file Alembic cannot read, so the sign has to
        be doubled on the way in.
        """
        return self.sync_database_url.replace("%", "%%")

    @computed_field
    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
