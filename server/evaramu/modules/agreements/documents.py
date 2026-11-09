"""Agreement documents: templates with {{placeholders}}, safe rendering, digital signing.

Rendering is done only here (server side) so the HTML staff preview, the HTML
the parties sign and the HTML that is printed are byte-for-byte the same.

Signing model
-------------
* A document is editable (title, body, fill-in fields) while it is a draft.
* The first signature freezes it: the rendered HTML is stored and a SHA-256
  ``content_hash`` is computed over it. From then on nothing can change.
* Each signature stores the drawn signature (PNG re-encoded server side), the
  typed name, timestamp and IP, plus a digest binding the signature image to
  the content hash. ``verify`` recomputes everything to detect tampering.
* Documents are never deleted; a wrong one is voided with a reason.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import html
import io
import json
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi import Request
from PIL import Image, UnidentifiedImageError
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from evaramu.core.errors import Conflict, DomainError, NotFound
from evaramu.modules.agreements.models import (
    AgreementDocument,
    AgreementTemplate,
    DocumentStatus,
    RentalAgreement,
)
from evaramu.modules.identity.models import User
from evaramu.modules.system.models import AppSetting
from evaramu.modules.system.services import audit, next_number

# ------------------------------------------------------------ placeholders ----


@dataclass(frozen=True)
class Placeholder:
    key: str
    label: str
    group: str
    source: str  # "auto" (filled from records, still editable) | "manual"


PLACEHOLDERS: list[Placeholder] = [
    Placeholder("tenant_name", "Tenant full name", "Tenant", "auto"),
    Placeholder("tenant_id_number", "Tenant ID number", "Tenant", "auto"),
    Placeholder("tenant_phone", "Tenant phone", "Tenant", "auto"),
    Placeholder("tenant_email", "Tenant email", "Tenant", "auto"),
    Placeholder("landlord_name", "Landlord name", "Landlord", "auto"),
    Placeholder("landlord_phone", "Landlord phone", "Landlord", "auto"),
    Placeholder("bank_name", "Bank", "Landlord", "auto"),
    Placeholder("bank_account_number", "Bank account number", "Landlord", "auto"),
    Placeholder("bank_account_name", "Bank account name", "Landlord", "auto"),
    Placeholder("agreement_number", "Agreement number", "Agreement", "auto"),
    Placeholder("start_date", "Start date", "Agreement", "auto"),
    Placeholder("end_date", "End date", "Agreement", "auto"),
    Placeholder("monthly_rent", "Monthly rent (Frw)", "Rent", "auto"),
    Placeholder("monthly_rent_words", "Monthly rent in words", "Rent", "manual"),
    Placeholder("deposit", "Deposit (Frw)", "Rent", "auto"),
    Placeholder("due_day", "Rent due day of month", "Rent", "auto"),
    Placeholder("payment_start_date", "Rent payment date", "Rent", "auto"),
    Placeholder("prepaid_months", "Months paid in advance", "Rent", "manual"),
    Placeholder("prepaid_amount", "Amount paid in advance (Frw)", "Rent", "manual"),
    Placeholder("prepaid_amount_words", "Amount paid in advance in words", "Rent", "manual"),
    Placeholder("prepaid_from", "Advance covers from", "Rent", "manual"),
    Placeholder("prepaid_to", "Advance covers until", "Rent", "manual"),
    Placeholder("unit_code", "Unit code", "Unit", "auto"),
    Placeholder("unit_name", "Unit name", "Unit", "auto"),
    Placeholder("property_name", "Property name", "Unit", "auto"),
    Placeholder("address", "Street address", "Unit", "auto"),
    Placeholder("village", "Umudugudu (village)", "Unit", "auto"),
    Placeholder("cell", "Akagari (cell)", "Unit", "auto"),
    Placeholder("sector", "Umurenge (sector)", "Unit", "auto"),
    Placeholder("district", "Akarere (district)", "Unit", "auto"),
    Placeholder("city", "City", "Unit", "auto"),
    Placeholder("signing_city", "Place of signing", "Document", "auto"),
    Placeholder("document_date", "Document date", "Document", "auto"),
    Placeholder("company_name", "Company name", "Document", "auto"),
]
PLACEHOLDER_KEYS = {p.key for p in PLACEHOLDERS}
_TOKEN = re.compile(r"\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}")
_BOLD = re.compile(r"\*\*(.+?)\*\*")
MAX_FIELD = 500


def fmt_date(d: date | None) -> str:
    return d.strftime("%d/%m/%Y") if d else ""


def fmt_frw(amount: Decimal | None) -> str:
    return f"{amount:,.0f}" if amount is not None else ""


def _settings(db: Session) -> dict:
    return {s.key: s.value for s in db.execute(select(AppSetting)).scalars()}


def auto_fields(db: Session, ag: RentalAgreement, today: date | None = None) -> dict[str, str]:
    """Values filled from the agreement, tenant, unit, property and settings."""
    s = _settings(db)
    t, u = ag.tenant, ag.unit
    p = u.property
    rwf = ag.currency == "RWF"
    return {
        "tenant_name": t.full_name,
        "tenant_id_number": t.id_number or "",
        "tenant_phone": t.phone or "",
        "tenant_email": t.email or "",
        "landlord_name": str(s.get("landlord.name") or s.get("company.name") or ""),
        "landlord_phone": str(s.get("landlord.phone") or s.get("contact.phone") or ""),
        "bank_name": str(s.get("landlord.bank_name") or ""),
        "bank_account_number": str(s.get("landlord.bank_account_number") or ""),
        "bank_account_name": str(s.get("landlord.bank_account_name") or ""),
        "agreement_number": ag.agreement_number,
        "start_date": fmt_date(ag.start_date),
        "end_date": fmt_date(ag.end_date),
        # Documents are drawn up in Rwandan francs; a USD agreement needs the Frw figure typed in.
        "monthly_rent": fmt_frw(ag.monthly_rent) if rwf else "",
        "monthly_rent_words": "",
        "deposit": fmt_frw(ag.deposit_required) if rwf and ag.deposit_required else "",
        "due_day": str(ag.due_day),
        "payment_start_date": fmt_date(ag.start_date),
        "prepaid_months": "",
        "prepaid_amount": "",
        "prepaid_amount_words": "",
        "prepaid_from": "",
        "prepaid_to": "",
        "unit_code": u.code,
        "unit_name": u.name,
        "property_name": p.name,
        "address": p.address,
        # The property's own address; the landlord's defaults (from their agreement) when blank.
        "village": p.village or str(s.get("landlord.default_village") or ""),
        "cell": p.cell or str(s.get("landlord.default_cell") or ""),
        "sector": p.sector or str(s.get("landlord.default_sector") or ""),
        "district": p.district or str(s.get("landlord.default_district") or ""),
        "city": p.city or "Kigali",
        "signing_city": str(s.get("landlord.city") or p.city or "Kigali"),
        "document_date": fmt_date(today or date.today()),
        "company_name": str(s.get("company.name") or ""),
    }


SAMPLE_FIELDS = {
    "tenant_name": "Uwase Aline", "tenant_id_number": "1199080012345678", "tenant_phone": "0788000000",
    "tenant_email": "aline@example.com", "landlord_name": "LANDLORD NAME", "landlord_phone": "0780000000",
    "bank_name": "BANK", "bank_account_number": "0000000000", "bank_account_name": "ACCOUNT NAME",
    "agreement_number": "AGR-202611-0001", "start_date": "01/11/2026", "end_date": "31/10/2027",
    "monthly_rent": "150,000", "monthly_rent_words": "", "deposit": "150,000", "due_day": "5",
    "payment_start_date": "01/11/2026", "prepaid_months": "3", "prepaid_amount": "450,000",
    "prepaid_amount_words": "", "prepaid_from": "01/11/2026", "prepaid_to": "31/01/2027", "unit_code": "B01-S3",
    "unit_name": "Shop 3", "property_name": "Sample Building", "address": "KK 15 Rd", "village": "Bisambu",
    "cell": "Nyarurama", "sector": "Gatenga", "district": "Kicukiro", "city": "Kigali", "signing_city": "Kigali",
    "document_date": "08/11/2026", "company_name": "Evaramu Group Ltd",
}


# --------------------------------------------------------------- rendering ----


def _inline(raw: str, fields: dict[str, str]) -> str:
    text = html.escape(raw, quote=False)
    text = _BOLD.sub(r"<strong>\1</strong>", text)

    def fill(m: re.Match) -> str:
        key = m.group(1)
        if key not in PLACEHOLDER_KEYS:
            return m.group(0)
        value = (fields.get(key) or "").strip()
        if not value:
            return '<span class="doc-blank">……………………</span>'
        return f'<span class="doc-fill">{html.escape(value, quote=False)}</span>'

    return _TOKEN.sub(fill, text)


def render_html(title: str, body: str, fields: dict[str, str]) -> str:
    """Tiny, safe markup: blank line = paragraph, '# ' heading, '- ' bullets,
    '1. ' numbered items, **bold**, {{placeholders}}. Everything else is escaped."""
    out: list[str] = [f'<h1 class="doc-title">{html.escape(title, quote=False)}</h1>']
    para: list[str] = []
    list_tag: str | None = None

    def flush_para() -> None:
        if para:
            out.append("<p>" + "<br>".join(para) + "</p>")
            para.clear()

    def close_list() -> None:
        nonlocal list_tag
        if list_tag:
            out.append(f"</{list_tag}>")
            list_tag = None

    for line in body.replace("\r\n", "\n").split("\n"):
        stripped = line.strip()
        bullet = re.match(r"^[-*]\s+(.*)$", stripped)
        numbered = re.match(r"^\d+[.)]\s+(.*)$", stripped)
        if not stripped:
            flush_para()
            close_list()
        elif stripped.startswith("## ") or stripped.startswith("# "):
            flush_para()
            close_list()
            level = "h3" if stripped.startswith("## ") else "h2"
            out.append(f"<{level}>{_inline(stripped.lstrip('#').strip(), fields)}</{level}>")
        elif bullet or numbered:
            flush_para()
            tag = "ul" if bullet else "ol"
            if list_tag != tag:
                close_list()
                out.append(f"<{tag}>")
                list_tag = tag
            out.append(f"<li>{_inline((bullet or numbered).group(1), fields)}</li>")
        else:
            close_list()
            para.append(_inline(stripped, fields))
    flush_para()
    close_list()
    return "\n".join(out)


def clean_fields(values: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in (values or {}).items():
        if k not in PLACEHOLDER_KEYS:
            raise DomainError(f"Unknown field: {k}")
        v = "" if v is None else str(v).strip()
        if len(v) > MAX_FIELD:
            raise DomainError(f"Field {k} is too long")
        out[k] = v
    return out


def used_placeholders(body: str) -> list[str]:
    seen: list[str] = []
    for m in _TOKEN.finditer(body):
        if m.group(1) in PLACEHOLDER_KEYS and m.group(1) not in seen:
            seen.append(m.group(1))
    return seen


def missing_fields(doc: AgreementDocument) -> list[str]:
    return [k for k in used_placeholders(doc.body) if not (doc.fields or {}).get(k, "").strip()]


# --------------------------------------------------------------- templates ----


def get_template(db: Session, template_id: int) -> AgreementTemplate:
    t = db.get(AgreementTemplate, template_id)
    if t is None:
        raise NotFound("Template not found")
    return t


def default_template(db: Session) -> AgreementTemplate:
    t = db.execute(select(AgreementTemplate).where(
        AgreementTemplate.is_default.is_(True), AgreementTemplate.is_archived.is_(False))).scalar_one_or_none()
    if t is None:
        t = db.execute(select(AgreementTemplate).where(AgreementTemplate.is_archived.is_(False))
                       .order_by(AgreementTemplate.id)).scalars().first()
    if t is None:
        raise DomainError("Create an agreement template first (Agreements → Templates)")
    return t


def _check_template_body(body: str) -> None:
    unknown = sorted({m.group(1) for m in _TOKEN.finditer(body)} - PLACEHOLDER_KEYS)
    if unknown:
        raise DomainError("Unknown placeholders: " + ", ".join("{{" + u + "}}" for u in unknown))


def save_template(db: Session, t: AgreementTemplate | None, data: dict, *, actor: User,
                  request: Request | None) -> AgreementTemplate:
    if "body" in data and data["body"] is not None:
        _check_template_body(data["body"])
    if t is None:
        t = AgreementTemplate(name=data["name"], description=data.get("description") or "", title=data["title"],
                              body=data["body"], is_default=False, is_archived=False, version=1,
                              updated_by_id=actor.id)
        db.add(t)
        db.flush()
        if not db.execute(select(AgreementTemplate.id).where(
                AgreementTemplate.is_default.is_(True), AgreementTemplate.is_archived.is_(False))).first():
            t.is_default = True
        action = "template.created"
    else:
        if t.is_archived:
            raise Conflict("This template is archived")
        changed = False
        for k in ("name", "description", "title", "body"):
            if data.get(k) is not None and getattr(t, k) != data[k]:
                setattr(t, k, data[k])
                changed = True
        if changed:
            t.version += 1
        t.updated_by_id = actor.id
        action = "template.updated"
    db.flush()
    audit(db, actor=actor, action=action, entity_type="agreement_template", entity_id=t.id,
          summary=f"{'Created' if action.endswith('created') else 'Updated'} agreement template "
                  f"“{t.name}” (version {t.version})", request=request)
    return t


def make_default(db: Session, t: AgreementTemplate, *, actor: User, request: Request | None) -> None:
    if t.is_archived:
        raise Conflict("Archived templates cannot be the default")
    db.execute(update(AgreementTemplate).where(AgreementTemplate.id != t.id).values(is_default=False))
    db.flush()
    t.is_default = True
    db.flush()
    audit(db, actor=actor, action="template.default", entity_type="agreement_template", entity_id=t.id,
          summary=f"“{t.name}” is now the default agreement template", request=request)


def archive_template(db: Session, t: AgreementTemplate, *, actor: User, request: Request | None) -> None:
    was_default = t.is_default
    t.is_archived, t.is_default = True, False
    db.flush()
    if was_default:
        nxt = db.execute(select(AgreementTemplate).where(AgreementTemplate.is_archived.is_(False))
                         .order_by(AgreementTemplate.id)).scalars().first()
        if nxt:
            nxt.is_default = True
    audit(db, actor=actor, action="template.archived", entity_type="agreement_template", entity_id=t.id,
          summary=f"Archived agreement template “{t.name}”", request=request)


# --------------------------------------------------------------- documents ----


def get_document(db: Session, doc_id: int, *, for_update: bool = False) -> AgreementDocument:
    stmt = select(AgreementDocument).where(AgreementDocument.id == doc_id)
    if for_update:
        stmt = stmt.with_for_update()
    doc = db.execute(stmt).scalar_one_or_none()
    if doc is None:
        raise NotFound("Document not found")
    return doc


def create_document(db: Session, ag: RentalAgreement, template: AgreementTemplate, *, actor: User,
                    request: Request | None) -> AgreementDocument:
    if template.is_archived:
        raise Conflict("This template is archived")
    doc = AgreementDocument(
        document_number=next_number(db, "DOC", period=date.today()), agreement_id=ag.id,
        template_id=template.id, template_version=template.version, status=DocumentStatus.DRAFT.value,
        title=template.title, body=template.body, fields=auto_fields(db, ag), created_by_id=actor.id,
        tenant_signed_name="", landlord_signed_name="", void_reason="",
    )
    db.add(doc)
    db.flush()
    audit(db, actor=actor, action="document.created", entity_type="agreement_document", entity_id=doc.id,
          summary=f"Drew up {doc.document_number} for {ag.agreement_number} from “{template.name}”",
          request=request)
    return doc


def update_document(db: Session, doc: AgreementDocument, data: dict, *, actor: User,
                    request: Request | None) -> None:
    if doc.status != DocumentStatus.DRAFT.value:
        raise Conflict("A document cannot be changed once someone has signed it. Void it and draw up a new one.",
                       code="document_frozen")
    if data.get("body") is not None:
        _check_template_body(data["body"])
        doc.body = data["body"]
    if data.get("title") is not None:
        doc.title = data["title"]
    if data.get("fields") is not None:
        doc.fields = {**(doc.fields or {}), **clean_fields(data["fields"])}
    if data.get("refresh"):
        doc.fields = {**(doc.fields or {}), **auto_fields(db, doc.agreement)}
    db.flush()
    audit(db, actor=actor, action="document.updated", entity_type="agreement_document", entity_id=doc.id,
          summary=f"Edited {doc.document_number}", request=request)


def content_hash(doc: AgreementDocument) -> str:
    payload = json.dumps({"number": doc.document_number, "html": doc.rendered_html}, ensure_ascii=False,
                         separators=(",", ":"))
    return hashlib.sha256(payload.encode()).hexdigest()


def _signature_digest(doc: AgreementDocument, party: str, png_b64: str, name: str, at: datetime) -> str:
    raw = f"{doc.content_hash}|{party}|{name}|{at.isoformat()}|{hashlib.sha256(png_b64.encode()).hexdigest()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _clean_signature(data_url: str) -> str:
    """Accept a drawn signature as a PNG data URL; return a re-encoded PNG (base64)."""
    prefix = "data:image/png;base64,"
    if not data_url or not data_url.startswith(prefix):
        raise DomainError("Draw a signature first", code="bad_signature")
    try:
        raw = base64.b64decode(data_url[len(prefix):], validate=True)
    except (binascii.Error, ValueError) as exc:
        raise DomainError("The signature image is invalid", code="bad_signature") from exc
    if len(raw) > 400_000:
        raise DomainError("The signature image is too large", code="bad_signature")
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            if probe.format != "PNG":
                raise DomainError("The signature image is invalid", code="bad_signature")
            probe.verify()
        img = Image.open(io.BytesIO(raw)).convert("RGBA")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise DomainError("The signature image is invalid", code="bad_signature") from exc
    if not (50 <= img.width <= 2000 and 20 <= img.height <= 1000):
        raise DomainError("The signature image has an unexpected size", code="bad_signature")
    alpha = img.getchannel("A")
    if alpha.getbbox() is None:
        raise DomainError("The signature is empty — please sign in the box", code="bad_signature")
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()


def sign(db: Session, doc: AgreementDocument, *, party: str, name: str, signature: str, actor: User,
         request: Request | None) -> None:
    if party not in ("tenant", "landlord"):
        raise DomainError("Unknown signing party")
    if doc.status in (DocumentStatus.SIGNED.value, DocumentStatus.VOID.value):
        raise Conflict(f"This document is {doc.status}")
    if getattr(doc, f"{party}_signed_at") is not None:
        raise Conflict(f"The {party} has already signed this document")
    name = name.strip()
    if len(name) < 2:
        raise DomainError("Type the signer's full name")
    if doc.status == DocumentStatus.DRAFT.value:
        missing = missing_fields(doc)
        if missing:
            labels = {p.key: p.label for p in PLACEHOLDERS}
            raise DomainError("Fill in every blank before signing: " + ", ".join(labels[m] for m in missing),
                              code="document_incomplete", details={"missing": missing})
        doc.rendered_html = render_html(doc.title, doc.body, doc.fields or {})
        doc.content_hash = content_hash(doc)
        doc.frozen_at = datetime.now(UTC)
        doc.status = DocumentStatus.SIGNING.value
    png = _clean_signature(signature)
    at = datetime.now(UTC)
    ip = request.client.host if request is not None and request.client else None
    setattr(doc, f"{party}_signature", png)
    setattr(doc, f"{party}_signed_name", name[:160])
    setattr(doc, f"{party}_signed_at", at)
    setattr(doc, f"{party}_sign_ip", ip)
    setattr(doc, f"{party}_signature_digest", _signature_digest(doc, party, png, name[:160], at))
    if party == "tenant":
        doc.tenant_witnessed_by_id = actor.id
    else:
        doc.landlord_signed_by_id = actor.id
    if doc.tenant_signed_at and doc.landlord_signed_at:
        doc.status = DocumentStatus.SIGNED.value
    db.flush()
    who = "Tenant" if party == "tenant" else "Landlord"
    audit(db, actor=actor, action=f"document.signed_{party}", entity_type="agreement_document", entity_id=doc.id,
          summary=f"{who} {name} signed {doc.document_number}"
                  + (" — fully signed" if doc.status == DocumentStatus.SIGNED.value else ""),
          request=request)


def void(db: Session, doc: AgreementDocument, *, reason: str, actor: User, request: Request | None) -> None:
    if doc.status == DocumentStatus.VOID.value:
        raise Conflict("This document is already void")
    if len(reason.strip()) < 3:
        raise DomainError("Give a reason for voiding the document")
    doc.status = DocumentStatus.VOID.value
    doc.voided_at = datetime.now(UTC)
    doc.void_reason = reason.strip()
    db.flush()
    audit(db, actor=actor, action="document.voided", entity_type="agreement_document", entity_id=doc.id,
          summary=f"Voided {doc.document_number}: {reason.strip()}", request=request)


def verify(doc: AgreementDocument) -> dict:
    """Recompute the content hash and signature digests from what is stored."""
    if not doc.rendered_html or not doc.content_hash:
        return {"frozen": False, "content_intact": None, "tenant_signature_valid": None,
                "landlord_signature_valid": None}

    def check(party: str) -> bool | None:
        png = getattr(doc, f"{party}_signature")
        at = getattr(doc, f"{party}_signed_at")
        if not png or not at:
            return None
        return _signature_digest(doc, party, png, getattr(doc, f"{party}_signed_name"), at) == \
            getattr(doc, f"{party}_signature_digest")

    return {
        "frozen": True,
        "content_intact": content_hash(doc) == doc.content_hash,
        "tenant_signature_valid": check("tenant"),
        "landlord_signature_valid": check("landlord"),
    }


def verification_code(doc: AgreementDocument) -> str | None:
    return doc.content_hash[:16].upper() if doc.content_hash else None
