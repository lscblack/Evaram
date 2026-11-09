"""File storage for uploads.

Photographs are decoded with Pillow and *re-encoded* to WebP: this strips EXIF
metadata (including GPS), neutralises polyglot files that only pretend to be
images, and bounds the stored size. Payment evidence is kept under
PRIVATE_ROOT, which is never served statically — only through an
authenticated endpoint.
"""

from __future__ import annotations

import io
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from evaramu.core.config import get_settings
from evaramu.core.errors import DomainError

Image.MAX_IMAGE_PIXELS = 60_000_000  # decompression-bomb guard

_ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
_MAX_EDGE = 2000
_THUMB_EDGE = 640


@dataclass
class StoredImage:
    storage_key: str
    thumb_key: str
    width: int
    height: int
    size_bytes: int


def _read_limited(data: bytes) -> bytes:
    limit = get_settings().MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > limit:
        raise DomainError(f"File is larger than {get_settings().MAX_UPLOAD_MB} MB", code="file_too_large")
    if not data:
        raise DomainError("File is empty", code="file_empty")
    return data


def _dated_dir(root: Path, category: str) -> tuple[Path, str]:
    stamp = datetime.now(UTC).strftime("%Y/%m")
    rel = f"{category}/{stamp}"
    path = root / rel
    path.mkdir(parents=True, exist_ok=True)
    return path, rel


def save_image(data: bytes, category: str = "properties") -> StoredImage:
    data = _read_limited(data)
    try:
        with Image.open(io.BytesIO(data)) as probe:
            fmt = probe.format
            probe.verify()
        if fmt not in _ALLOWED_IMAGE_FORMATS:
            raise DomainError("Only JPEG, PNG or WebP photographs are accepted", code="bad_image")
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise DomainError("The file is not a valid image", code="bad_image") from exc

    img.thumbnail((_MAX_EDGE, _MAX_EDGE))
    folder, rel = _dated_dir(get_settings().MEDIA_ROOT, category)
    name = uuid.uuid4().hex
    full_path = folder / f"{name}.webp"
    img.save(full_path, "WEBP", quality=82, method=4)
    thumb = img.copy()
    thumb.thumbnail((_THUMB_EDGE, _THUMB_EDGE))
    thumb_path = folder / f"{name}_thumb.webp"
    thumb.save(thumb_path, "WEBP", quality=78, method=4)
    return StoredImage(
        storage_key=f"{rel}/{name}.webp",
        thumb_key=f"{rel}/{name}_thumb.webp",
        width=img.width,
        height=img.height,
        size_bytes=full_path.stat().st_size,
    )


def delete_media(*keys: str) -> None:
    root = get_settings().MEDIA_ROOT.resolve()
    for key in keys:
        path = (root / key).resolve()
        if root in path.parents and path.is_file():
            path.unlink()


_EVIDENCE_TYPES = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


def save_evidence(data: bytes, filename: str) -> str:
    """Store payment evidence (image or PDF) privately; returns the key."""
    data = _read_limited(data)
    ext: str | None = None
    if data[:5] == b"%PDF-":
        ext = ".pdf"
    else:
        try:
            with Image.open(io.BytesIO(data)) as probe:
                ext = _EVIDENCE_TYPES.get(probe.format or "")
                probe.verify()
        except (UnidentifiedImageError, OSError):
            ext = None
    if ext is None:
        raise DomainError("Evidence must be a JPEG, PNG, WebP image or a PDF", code="bad_evidence")
    folder, rel = _dated_dir(get_settings().PRIVATE_ROOT, "evidence")
    name = f"{uuid.uuid4().hex}{ext}"
    (folder / name).write_bytes(data)
    return f"{rel}/{name}"


def evidence_path(key: str) -> Path:
    root = get_settings().PRIVATE_ROOT.resolve()
    path = (root / key).resolve()
    if root not in path.parents or not path.is_file():
        raise DomainError("Evidence file not found", code="not_found")
    return path


def delete_evidence(*keys: str) -> None:
    root = get_settings().PRIVATE_ROOT.resolve()
    for key in keys:
        path = (root / key).resolve()
        if root in path.parents and path.is_file():
            path.unlink()


def media_url(key: str | None) -> str | None:
    return f"/media/{key}" if key else None
