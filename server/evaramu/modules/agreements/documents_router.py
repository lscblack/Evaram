"""HTTP API for agreement templates and signed agreement documents."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from evaramu.core.deps import DB, require
from evaramu.core.ratelimit import rate_limit
from evaramu.modules.agreements import documents as svc
from evaramu.modules.agreements import service as agreements
from evaramu.modules.agreements.models import AgreementDocument, AgreementTemplate, DocumentStatus
from evaramu.modules.identity.models import User

router = APIRouter(tags=["agreement documents"])
Manager = Annotated[User, Depends(require("agreements.manage"))]
View = Depends(require("agreements.view"))


# ----------------------------------------------------------------- schemas ----


class PlaceholderOut(BaseModel):
    key: str
    label: str
    group: str
    source: str


class TemplateOut(BaseModel):
    id: int
    name: str
    description: str
    title: str
    body: str
    is_default: bool
    is_archived: bool
    version: int
    updated_at: datetime
    documents: int = 0


class TemplateIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=255)
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=10, max_length=60_000)


class TemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=255)
    title: str | None = Field(default=None, min_length=2, max_length=200)
    body: str | None = Field(default=None, min_length=10, max_length=60_000)


class PreviewIn(BaseModel):
    title: str = Field(default="", max_length=200)
    body: str = Field(max_length=60_000)


class PreviewOut(BaseModel):
    html: str


class DocumentCreate(BaseModel):
    template_id: int | None = None


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=200)
    body: str | None = Field(default=None, min_length=10, max_length=60_000)
    fields: dict[str, str | None] | None = None
    refresh: bool = False  # re-read tenant/unit/landlord details into the fields


class SignIn(BaseModel):
    party: Literal["tenant", "landlord"]
    name: str = Field(min_length=2, max_length=160)
    signature: str = Field(max_length=600_000)  # PNG data URL from the signature pad


class VoidIn(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class SignatureOut(BaseModel):
    name: str
    signed_at: datetime
    image: str  # data URL


class DocumentSummary(BaseModel):
    id: int
    document_number: str
    status: str
    title: str
    template_name: str | None
    created_at: datetime
    tenant_signed_at: datetime | None
    landlord_signed_at: datetime | None


class DocumentOut(DocumentSummary):
    agreement_id: int
    agreement_number: str
    agreement_currency: str
    tenant_name: str
    unit_code: str
    body: str
    fields: dict[str, str]
    html: str
    missing: list[str]
    used_placeholders: list[str]
    tenant_signature: SignatureOut | None
    landlord_signature: SignatureOut | None
    content_hash: str | None
    verification_code: str | None
    frozen_at: datetime | None
    verification: dict
    voided_at: datetime | None
    void_reason: str


class PublicVerifyOut(BaseModel):
    found: bool
    valid: bool = False
    document_number: str | None = None
    status: str | None = None
    unit_code: str | None = None
    tenant_signed_at: datetime | None = None
    landlord_signed_at: datetime | None = None


# ----------------------------------------------------------------- helpers ----


def _template_out(db: Session, t: AgreementTemplate) -> TemplateOut:
    count = db.execute(select(func.count(AgreementDocument.id))
                       .where(AgreementDocument.template_id == t.id)).scalar_one()
    return TemplateOut(id=t.id, name=t.name, description=t.description, title=t.title, body=t.body,
                       is_default=t.is_default, is_archived=t.is_archived, version=t.version,
                       updated_at=t.updated_at, documents=count)


def _template_name(db: Session, template_id: int | None) -> str | None:
    if template_id is None:
        return None
    t = db.get(AgreementTemplate, template_id)
    return t.name if t else None


def _summary(db: Session, d: AgreementDocument) -> DocumentSummary:
    return DocumentSummary(id=d.id, document_number=d.document_number, status=d.status, title=d.title,
                           template_name=_template_name(db, d.template_id), created_at=d.created_at,
                           tenant_signed_at=d.tenant_signed_at, landlord_signed_at=d.landlord_signed_at)


def _sig(d: AgreementDocument, party: str) -> SignatureOut | None:
    png, at = getattr(d, f"{party}_signature"), getattr(d, f"{party}_signed_at")
    if not png or not at:
        return None
    return SignatureOut(name=getattr(d, f"{party}_signed_name"), signed_at=at, image=f"data:image/png;base64,{png}")


def _document_out(db: Session, d: AgreementDocument) -> DocumentOut:
    ag = d.agreement
    html_out = d.rendered_html if d.rendered_html else svc.render_html(d.title, d.body, d.fields or {})
    return DocumentOut(
        **_summary(db, d).model_dump(),
        agreement_id=ag.id, agreement_number=ag.agreement_number, agreement_currency=ag.currency,
        tenant_name=ag.tenant.full_name, unit_code=ag.unit.code, body=d.body, fields=d.fields or {},
        html=html_out, missing=svc.missing_fields(d) if d.status == DocumentStatus.DRAFT.value else [],
        used_placeholders=svc.used_placeholders(d.body), tenant_signature=_sig(d, "tenant"),
        landlord_signature=_sig(d, "landlord"), content_hash=d.content_hash,
        verification_code=svc.verification_code(d), frozen_at=d.frozen_at, verification=svc.verify(d),
        voided_at=d.voided_at, void_reason=d.void_reason,
    )


# --------------------------------------------------------------- templates ----


@router.get("/agreement-templates/placeholders", response_model=list[PlaceholderOut], dependencies=[View])
def list_placeholders():
    return [PlaceholderOut(**p.__dict__) for p in svc.PLACEHOLDERS]


@router.post("/agreement-templates/preview", response_model=PreviewOut, dependencies=[View])
def preview_template(body: PreviewIn):
    return PreviewOut(html=svc.render_html(body.title, body.body, svc.SAMPLE_FIELDS))


@router.get("/agreement-templates", response_model=list[TemplateOut], dependencies=[View])
def list_templates(db: DB, include_archived: bool = False):
    stmt = select(AgreementTemplate).order_by(AgreementTemplate.is_default.desc(), AgreementTemplate.name)
    if not include_archived:
        stmt = stmt.where(AgreementTemplate.is_archived.is_(False))
    return [_template_out(db, t) for t in db.execute(stmt).scalars()]


@router.post("/agreement-templates", response_model=TemplateOut, status_code=201)
def create_template(body: TemplateIn, request: Request, db: DB, actor: Manager):
    t = svc.save_template(db, None, body.model_dump(), actor=actor, request=request)
    db.commit()
    return _template_out(db, t)


@router.get("/agreement-templates/{template_id}", response_model=TemplateOut, dependencies=[View])
def get_template(template_id: int, db: DB):
    return _template_out(db, svc.get_template(db, template_id))


@router.patch("/agreement-templates/{template_id}", response_model=TemplateOut)
def update_template(template_id: int, body: TemplateUpdate, request: Request, db: DB, actor: Manager):
    t = svc.save_template(db, svc.get_template(db, template_id), body.model_dump(exclude_unset=True),
                          actor=actor, request=request)
    db.commit()
    return _template_out(db, t)


@router.post("/agreement-templates/{template_id}/default", response_model=TemplateOut)
def set_default_template(template_id: int, request: Request, db: DB, actor: Manager):
    t = svc.get_template(db, template_id)
    svc.make_default(db, t, actor=actor, request=request)
    db.commit()
    return _template_out(db, t)


@router.post("/agreement-templates/{template_id}/archive", response_model=TemplateOut)
def archive_template(template_id: int, request: Request, db: DB, actor: Manager):
    t = svc.get_template(db, template_id)
    svc.archive_template(db, t, actor=actor, request=request)
    db.commit()
    return _template_out(db, t)


# --------------------------------------------------------------- documents ----


@router.get("/agreements/{agreement_id}/documents", response_model=list[DocumentSummary], dependencies=[View])
def list_documents(agreement_id: int, db: DB):
    agreements.get_agreement(db, agreement_id)
    rows = db.execute(select(AgreementDocument).where(AgreementDocument.agreement_id == agreement_id)
                      .order_by(AgreementDocument.id.desc())).scalars()
    return [_summary(db, d) for d in rows]


@router.post("/agreements/{agreement_id}/documents", response_model=DocumentOut, status_code=201)
def create_document(agreement_id: int, body: DocumentCreate, request: Request, db: DB, actor: Manager):
    ag = agreements.get_agreement(db, agreement_id)
    template = svc.get_template(db, body.template_id) if body.template_id else svc.default_template(db)
    doc = svc.create_document(db, ag, template, actor=actor, request=request)
    db.commit()
    return _document_out(db, svc.get_document(db, doc.id))


@router.get("/agreement-documents/{doc_id}", response_model=DocumentOut, dependencies=[View])
def get_document(doc_id: int, db: DB):
    return _document_out(db, svc.get_document(db, doc_id))


@router.patch("/agreement-documents/{doc_id}", response_model=DocumentOut)
def update_document(doc_id: int, body: DocumentUpdate, request: Request, db: DB, actor: Manager):
    doc = svc.get_document(db, doc_id, for_update=True)
    svc.update_document(db, doc, body.model_dump(exclude_unset=True), actor=actor, request=request)
    db.commit()
    return _document_out(db, svc.get_document(db, doc_id))


@router.post("/agreement-documents/{doc_id}/sign", response_model=DocumentOut)
def sign_document(doc_id: int, body: SignIn, request: Request, db: DB, actor: Manager):
    doc = svc.get_document(db, doc_id, for_update=True)
    svc.sign(db, doc, party=body.party, name=body.name, signature=body.signature, actor=actor, request=request)
    db.commit()
    return _document_out(db, svc.get_document(db, doc_id))


@router.post("/agreement-documents/{doc_id}/void", response_model=DocumentOut)
def void_document(doc_id: int, body: VoidIn, request: Request, db: DB, actor: Manager):
    doc = svc.get_document(db, doc_id, for_update=True)
    svc.void(db, doc, reason=body.reason, actor=actor, request=request)
    db.commit()
    return _document_out(db, svc.get_document(db, doc_id))


# ----------------------------------------------------------- public verify ----


@router.get("/public/documents/verify", response_model=PublicVerifyOut,
            dependencies=[Depends(rate_limit("doc-verify", 30, 60))])
def public_verify(number: str, code: str, db: DB):
    """Anyone holding a printed copy can confirm it is genuine and unaltered.
    Requires the document number AND its verification code; reveals no personal data."""
    doc = db.execute(select(AgreementDocument).where(
        AgreementDocument.document_number == number.strip().upper())).scalar_one_or_none()
    if doc is None or svc.verification_code(doc) != code.strip().upper().replace(" ", ""):
        return PublicVerifyOut(found=False)
    check = svc.verify(doc)
    valid = bool(check["content_intact"]) and check["tenant_signature_valid"] is not False \
        and check["landlord_signature_valid"] is not False and doc.status != DocumentStatus.VOID.value
    return PublicVerifyOut(found=True, valid=valid, document_number=doc.document_number, status=doc.status,
                           unit_code=doc.agreement.unit.code, tenant_signed_at=doc.tenant_signed_at,
                           landlord_signed_at=doc.landlord_signed_at)


__all__ = ["router"]
