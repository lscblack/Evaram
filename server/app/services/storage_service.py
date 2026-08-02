"""Local file storage for property media and seller documents.

Deliberately filesystem-backed rather than S3: this runs on one box today, and
a storage bucket is a deployment decision that should not be baked into the
API. `save_upload` returns a URL, so swapping the backend later touches only
this module.
"""

import hashlib
import mimetypes
import secrets
import uuid
from datetime import date
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

#: What a browser may send us. Anything else is rejected outright rather than
#: sniffed — an uploader that lies about its type is not worth accommodating.
IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/avif": ".avif",
    "image/gif": ".gif",
}
VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}
DOCUMENT_TYPES = {
    "application/pdf": ".pdf",
    **IMAGE_TYPES,
}

#: Read in chunks so a large upload never lands in memory whole.
CHUNK = 1024 * 1024


def _root() -> Path:
    root = Path(settings.MEDIA_ROOT)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _bucket(kind: str) -> Path:
    """One directory per kind per month — keeps any single directory small."""
    today = date.today()
    path = _root() / kind / f"{today.year:04d}-{today.month:02d}"
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload(
    file: UploadFile,
    *,
    kind: str = "property",
    allowed: dict[str, str] | None = None,
) -> dict:
    """Streams one upload to disk and returns its public URL and metadata.

    The stored name is random: an original filename is attacker-controlled and
    can carry path separators, unicode tricks or someone's real name.
    """
    allowed = allowed or IMAGE_TYPES
    content_type = (file.content_type or "").split(";")[0].strip().lower()

    if content_type not in allowed:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"{file.filename or 'That file'} is a {content_type or 'unknown'} — "
            f"accepted here: {', '.join(sorted(allowed))}",
        )

    suffix = allowed[content_type] or mimetypes.guess_extension(content_type) or ".bin"
    name = f"{uuid.uuid4().hex}{secrets.token_hex(4)}{suffix}"
    destination = _bucket(kind) / name

    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    written = 0
    digest = hashlib.sha256()

    try:
        with destination.open("wb") as out:
            while chunk := await file.read(CHUNK):
                written += len(chunk)
                if written > limit:
                    raise HTTPException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"{file.filename or 'That file'} is over the "
                        f"{settings.MAX_UPLOAD_MB} MB limit",
                    )
                digest.update(chunk)
                out.write(chunk)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    if written == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "That file was empty")

    relative = destination.relative_to(_root())
    return {
        "url": f"{settings.MEDIA_URL}/{relative.as_posix()}",
        "bytes": written,
        "content_type": content_type,
        "checksum": digest.hexdigest(),
        "original_name": (file.filename or "")[:200],
    }


def delete(url: str) -> None:
    """Best effort — a missing file must never block deleting its record."""
    prefix = settings.MEDIA_URL.rstrip("/") + "/"
    if not url.startswith(prefix):
        return
    target = (_root() / url[len(prefix) :]).resolve()
    try:
        # Refuse to follow a crafted path outside the media root.
        target.relative_to(_root().resolve())
    except ValueError:
        return
    target.unlink(missing_ok=True)
