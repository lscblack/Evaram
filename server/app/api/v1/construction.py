"""Construction work: the manager's queue, the job card, and the portfolio.

Staff routes are open to a construction manager or an admin — never to a
real-estate agent, whose job is the other side of the business. The public
routes are the brief a visitor sends in and the finished projects we choose
to show.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import cache
from app.core.database import get_db
from app.core.deps import client_ip, require_admin, require_construction
from app.core.limiter import limiter
from app.models.construction import (
    OPEN_STATUSES,
    ConstructionProject,
    ConstructionUpdate,
    ProjectKind,
    ProjectStatus,
)
from app.models.user import User, UserRole, UserStatus
from app.schemas.common import Message, Page
from app.schemas.construction import (
    ProjectCreate,
    ProjectDetail,
    ProjectOut,
    ProjectUpdate,
    PublicRequest,
    QueueSummary,
    ShowcaseOut,
    StaffOption,
    UpdateIn,
)
from app.services import captcha_service, storage_service
from app.services.audit import diff, record

router = APIRouter(prefix="/construction", tags=["construction"])

#: Statuses at which a job is finished and its dates are settled.
CLOSED = (ProjectStatus.COMPLETED, ProjectStatus.CANCELLED)


# ------------------------------------------------------------------ helpers
async def next_reference(db: AsyncSession) -> str:
    """`CON-2026-0007`: the year, then a counter that restarts each January."""
    year = datetime.now(timezone.utc).year
    prefix = f"CON-{year}-"
    latest = await db.scalar(
        select(ConstructionProject.reference)
        .where(ConstructionProject.reference.like(f"{prefix}%"))
        .order_by(ConstructionProject.reference.desc())
        .limit(1)
    )
    number = int(latest[len(prefix):]) + 1 if latest else 1
    return f"{prefix}{number:04d}"


async def _load(db: AsyncSession, project_id: uuid.UUID) -> ConstructionProject:
    # `populate_existing`: a job already in the session gets its history
    # re-read, so an update added a moment ago is in the response that follows.
    row = await db.scalar(
        select(ConstructionProject)
        .options(selectinload(ConstructionProject.updates))
        .where(ConstructionProject.id == project_id)
        .execution_options(populate_existing=True)
    )
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return row


def _settle_dates(row: ConstructionProject) -> None:
    """Dates follow the status so nobody has to remember to set them."""
    today = date.today()
    if row.status is ProjectStatus.IN_PROGRESS and row.started_on is None:
        row.started_on = today
    if row.status is ProjectStatus.COMPLETED:
        row.completed_on = row.completed_on or today
        row.progress_percent = 100
    elif row.completed_on and row.status not in CLOSED:
        # Reopened: it is no longer complete, whatever the date says.
        row.completed_on = None


async def _invalidate() -> None:
    await cache.invalidate("public:construction")


# ================================================================ staff
@router.get("/projects", response_model=Page[ProjectOut], summary="The queue")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_construction),
    status_filter: str | None = Query(default=None, alias="status"),
    kind: ProjectKind | None = None,
    engineer_id: uuid.UUID | None = None,
    q: str | None = Query(default=None, max_length=120),
    open_only: bool = False,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
) -> Page[ProjectOut]:
    stmt = select(ConstructionProject)
    if status_filter:
        wanted = [ProjectStatus(s) for s in status_filter.split(",") if s]
        stmt = stmt.where(ConstructionProject.status.in_(wanted))
    elif open_only:
        stmt = stmt.where(ConstructionProject.status.in_(OPEN_STATUSES))
    if kind:
        stmt = stmt.where(ConstructionProject.kind == kind)
    if engineer_id:
        stmt = stmt.where(ConstructionProject.engineer_id == engineer_id)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                ConstructionProject.reference.ilike(needle),
                ConstructionProject.title.ilike(needle),
                ConstructionProject.client_name.ilike(needle),
                ConstructionProject.client_phone.ilike(needle),
                ConstructionProject.district.ilike(needle),
                ConstructionProject.engineer_name.ilike(needle),
            )
        )

    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (
        await db.scalars(
            stmt.order_by(ConstructionProject.updated_at.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return Page(
        items=[ProjectOut.model_validate(r) for r in rows],
        total=total, page=page, per_page=per_page,
        pages=max(1, -(-total // per_page)),
    )


@router.get("/summary", response_model=QueueSummary, summary="What needs attention")
async def queue_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_construction),
) -> QueueSummary:
    counts = dict(
        (await db.execute(
            select(ConstructionProject.status, func.count()).group_by(ConstructionProject.status)
        )).all()
    )
    by_status = {s.value: int(counts.get(s, 0)) for s in ProjectStatus}
    open_count = sum(by_status[s.value] for s in OPEN_STATUSES)
    today = date.today()
    week = today + timedelta(days=7)
    due_week = await db.scalar(
        select(func.count()).select_from(ConstructionProject).where(
            ConstructionProject.status.in_(OPEN_STATUSES),
            ConstructionProject.due_on.between(today, week),
        )
    )
    overdue = await db.scalar(
        select(func.count()).select_from(ConstructionProject).where(
            ConstructionProject.status.in_(OPEN_STATUSES),
            ConstructionProject.due_on < today,
        )
    )
    unassigned = await db.scalar(
        select(func.count()).select_from(ConstructionProject).where(
            ConstructionProject.status.in_(
                (ProjectStatus.APPROVED, ProjectStatus.IN_PROGRESS)
            ),
            ConstructionProject.engineer_id.is_(None),
            ConstructionProject.engineer_name.is_(None),
        )
    )
    return QueueSummary(
        open=open_count, by_status=by_status,
        due_this_week=int(due_week or 0), overdue=int(overdue or 0),
        unassigned=int(unassigned or 0),
    )


@router.get("/staff", response_model=list[StaffOption], summary="Who a job can be assigned to")
async def staff_options(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_construction),
) -> list[StaffOption]:
    """Construction managers and admins — the people who carry a job."""
    rows = (
        await db.scalars(
            select(User).where(
                User.role.in_([UserRole.CONSTRUCTION_MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
                User.status == UserStatus.ACTIVE,
            ).order_by(User.full_name)
        )
    ).all()
    return [
        StaffOption(id=u.id, full_name=u.full_name, job_title=u.job_title, role=u.role.value)
        for u in rows
    ]


@router.post(
    "/projects",
    response_model=ProjectDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Record a job",
)
async def create_project(
    request: Request,
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_construction),
) -> ProjectDetail:
    data = payload.model_dump()
    data["photos"] = [p.model_dump() for p in payload.photos] if payload.photos else None
    row = ConstructionProject(
        **data,
        reference=await next_reference(db),
        created_by_id=actor.id,
    )
    _settle_dates(row)
    db.add(row)
    await db.flush()
    db.add(ConstructionUpdate(
        project_id=row.id, author_id=actor.id, author_name=actor.full_name,
        note="Job recorded", status=row.status, progress_percent=row.progress_percent,
    ))
    await record(
        db, actor=actor, action="construction.create", entity_type="construction_project",
        entity_id=row.reference, summary=f"Recorded {row.reference} — {row.title}", request=request,
    )
    await db.commit()
    await _invalidate()
    return ProjectDetail.model_validate(await _load(db, row.id))


@router.get("/projects/{project_id}", response_model=ProjectDetail, summary="One job, with its history")
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_construction),
) -> ProjectDetail:
    return ProjectDetail.model_validate(await _load(db, project_id))


@router.patch("/projects/{project_id}", response_model=ProjectDetail, summary="Edit a job")
async def update_project(
    request: Request,
    project_id: uuid.UUID,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_construction),
) -> ProjectDetail:
    row = await _load(db, project_id)
    changes = payload.model_dump(exclude_unset=True)
    if "photos" in changes and payload.photos is not None:
        changes["photos"] = [p.model_dump() for p in payload.photos]

    before = {k: getattr(row, k) for k in changes}
    for key, value in changes.items():
        setattr(row, key, value)
    _settle_dates(row)

    # A status change made through the form still lands in the history, so
    # the timeline never has a gap the client could ask about.
    if "status" in changes and before["status"] != row.status:
        db.add(ConstructionUpdate(
            project_id=row.id, author_id=actor.id, author_name=actor.full_name,
            note=f"Moved to {row.status.value.replace('_', ' ')}",
            status=row.status, progress_percent=row.progress_percent,
        ))

    await record(
        db, actor=actor, action="construction.update", entity_type="construction_project",
        entity_id=row.reference, summary=f"Edited {row.reference}",
        changes=diff(before, changes), request=request,
    )
    await db.commit()
    await _invalidate()
    return ProjectDetail.model_validate(await _load(db, row.id))


@router.post(
    "/projects/{project_id}/updates",
    response_model=ProjectDetail,
    summary="Add to a job's history — a visit, a drawing issued, a delay",
)
async def add_update(
    request: Request,
    project_id: uuid.UUID,
    payload: UpdateIn,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_construction),
) -> ProjectDetail:
    row = await _load(db, project_id)
    before = {"status": row.status, "progress_percent": row.progress_percent}
    if payload.status is not None:
        row.status = payload.status
    if payload.progress_percent is not None:
        row.progress_percent = payload.progress_percent
    _settle_dates(row)
    db.add(ConstructionUpdate(
        project_id=row.id, author_id=actor.id, author_name=actor.full_name,
        note=payload.note.strip(),
        status=row.status if payload.status is not None else None,
        progress_percent=row.progress_percent if payload.progress_percent is not None else None,
    ))
    await record(
        db, actor=actor, action="construction.note", entity_type="construction_project",
        entity_id=row.reference, summary=f"Update on {row.reference}",
        changes=diff(before, {"status": row.status, "progress_percent": row.progress_percent}),
        request=request,
    )
    await db.commit()
    await _invalidate()
    return ProjectDetail.model_validate(await _load(db, row.id))


@router.post(
    "/projects/{project_id}/photos",
    response_model=ProjectDetail,
    summary="Add site or result photographs",
)
async def add_photos(
    request: Request,
    project_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_construction),
) -> ProjectDetail:
    row = await _load(db, project_id)
    existing = list(row.photos or [])
    if len(existing) + len(files) > 40:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "A project carries at most 40 photographs")
    saved: list[dict] = []
    try:
        for upload in files:
            saved.append(await storage_service.save_upload(upload, kind="content"))
    except HTTPException:
        for item in saved:
            storage_service.delete(item["url"])
        raise
    row.photos = existing + [{"url": item["url"], "caption": None} for item in saved]
    await record(
        db, actor=actor, action="construction.photos", entity_type="construction_project",
        entity_id=row.reference, summary=f"{len(saved)} photo(s) added to {row.reference}",
        request=request,
    )
    await db.commit()
    await _invalidate()
    return ProjectDetail.model_validate(await _load(db, row.id))


@router.delete("/projects/{project_id}", response_model=Message, summary="Delete a job")
async def delete_project(
    request: Request,
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    """Admin only. Cancelling is the normal way to close a job that fell through."""
    row = await _load(db, project_id)
    for photo in row.photos or []:
        storage_service.delete(photo.get("url", ""))
    reference = row.reference
    await db.delete(row)
    await record(
        db, actor=actor, action="construction.delete", entity_type="construction_project",
        entity_id=reference, summary=f"Deleted {reference}", request=request,
    )
    await db.commit()
    await _invalidate()
    return Message(detail=f"Deleted {reference}")


# ================================================================ public
public = APIRouter(prefix="/public/construction", tags=["construction"])


@public.get("/projects", response_model=list[ShowcaseOut], summary="The portfolio")
async def showcase(db: AsyncSession = Depends(get_db)) -> list[ShowcaseOut]:
    """Finished projects the manager has chosen to show, newest first.

    Only what a prospective client should see: what was built, where, when,
    and the pictures. Never who paid for it or what it cost.
    """
    key = "public:construction:showcase"
    cached = await cache.get(key)
    if cached is not None:
        return [ShowcaseOut.model_validate(c) for c in cached]

    rows = (
        await db.scalars(
            select(ConstructionProject)
            .where(
                ConstructionProject.is_showcased.is_(True),
                ConstructionProject.status == ProjectStatus.COMPLETED,
            )
            .order_by(ConstructionProject.completed_on.desc().nullslast(), ConstructionProject.updated_at.desc())
            .limit(200)
        )
    ).all()
    out = [
        ShowcaseOut(
            reference=r.reference, title=r.title, kind=r.kind, district=r.district, sector=r.sector,
            completed_on=r.completed_on, summary=r.showcase_summary or r.description,
            photos=[p for p in (r.photos or []) if p.get("url")],
        )
        for r in rows
    ]
    await cache.set(key, [o.model_dump(mode="json") for o in out], ttl=300)
    return out


@public.post(
    "/requests",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
    summary="Send a construction brief",
)
@limiter.limit("10/hour")
async def public_request(
    request: Request,
    payload: PublicRequest,
    db: AsyncSession = Depends(get_db),
) -> Message:
    """The brief from the construction page lands straight in the manager's queue."""
    await captcha_service.verify(
        db, payload.captcha_token, payload.captcha_answer, scope="contact"
    )

    lines = [
        f"Project type: {payload.project_type}" if payload.project_type else None,
        f"Package: {payload.package}" if payload.package else None,
        f"Listing: {payload.property_reference}" if payload.property_reference else None,
        payload.message.strip() if payload.message else None,
    ]
    title = payload.project_type or payload.kind.value.replace("_", " ").title()
    row = ConstructionProject(
        reference=await next_reference(db),
        title=f"{title} for {payload.full_name}",
        kind=payload.kind,
        status=ProjectStatus.ENQUIRY,
        description="\n".join(l for l in lines if l) or None,
        client_name=payload.full_name,
        client_phone=payload.phone,
        client_email=str(payload.email) if payload.email else None,
        district=payload.district,
        address=payload.location,
        source="website",
        notes=f"Sent from the website · {client_ip(request)}",
    )
    db.add(row)
    await db.flush()
    db.add(ConstructionUpdate(
        project_id=row.id, author_name=payload.full_name,
        note="Brief received from the website", status=ProjectStatus.ENQUIRY,
    ))
    await record(
        db, actor=None, action="construction.request", entity_type="construction_project",
        entity_id=row.reference, summary=f"Brief from {payload.full_name}", request=request,
    )
    await db.commit()
    return Message(detail=f"Thank you — your brief is {row.reference}. We will call you within one working day.")
