import { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  HardHat,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Badge,
  Empty,
  ErrorNote,
  FIELD,
  Field,
  Loading,
  PageHeader,
  Panel,
  Stat,
} from '@/components/admin/ui'
import { api, mediaUrl, qs } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { EASE } from '@/lib/motion'
import { invalidate, useQuery } from '@/lib/queries'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useLocalities, useSectors } from '@/components/ui/LocationPicker'
import { MoneyInput } from '@/components/ui/MoneyInput'
import {
  OPEN_STATUSES,
  PROJECT_KINDS,
  PROJECT_STATUSES,
  kindLabel,
  statusMeta,
} from '@/data/construction'
import type {
  ConstructionProject,
  ConstructionProjectDetail,
  ConstructionQueueSummary,
  ConstructionStaff,
  Page,
  ProjectKind,
  ProjectStatus,
} from '@/types/api'

/** The job card as a form. Strings throughout — it is what inputs hold. */
const EMPTY_DRAFT = {
  title: '',
  kind: 'construction' as ProjectKind,
  status: 'enquiry' as ProjectStatus,
  description: '',
  client_name: '',
  client_phone: '',
  client_email: '',
  district: '',
  sector: '',
  address: '',
  engineer_id: '',
  engineer_name: '',
  quote_amount: '',
  amount_paid: '',
  started_on: '',
  due_on: '',
  completed_on: '',
  progress_percent: '0',
  is_showcased: false,
  showcase_summary: '',
  source: 'staff',
  notes: '',
}
type Draft = typeof EMPTY_DRAFT

const SOURCES = ['staff', 'website', 'phone', 'walk_in', 'referral']

function draftFrom(p: ConstructionProject): Draft {
  return {
    title: p.title,
    kind: p.kind,
    status: p.status,
    description: p.description ?? '',
    client_name: p.client_name ?? '',
    client_phone: p.client_phone ?? '',
    client_email: p.client_email ?? '',
    district: p.district ?? '',
    sector: p.sector ?? '',
    address: p.address ?? '',
    engineer_id: p.engineer_id ?? '',
    engineer_name: p.engineer_name ?? '',
    quote_amount: p.quote_amount != null ? String(Math.round(p.quote_amount)) : '',
    amount_paid: p.amount_paid != null ? String(Math.round(p.amount_paid)) : '',
    started_on: p.started_on ?? '',
    due_on: p.due_on ?? '',
    completed_on: p.completed_on ?? '',
    progress_percent: String(p.progress_percent),
    is_showcased: p.is_showcased,
    showcase_summary: p.showcase_summary ?? '',
    source: p.source,
    notes: p.notes ?? '',
  }
}

function bodyFrom(d: Draft) {
  return {
    title: d.title.trim(),
    kind: d.kind,
    status: d.status,
    description: d.description.trim() || null,
    client_name: d.client_name.trim() || null,
    client_phone: d.client_phone.trim() || null,
    client_email: d.client_email.trim() || null,
    district: d.district || null,
    sector: d.sector || null,
    address: d.address.trim() || null,
    engineer_id: d.engineer_id || null,
    engineer_name: d.engineer_name.trim() || null,
    quote_amount: d.quote_amount ? Number(d.quote_amount) : null,
    amount_paid: d.amount_paid ? Number(d.amount_paid) : null,
    started_on: d.started_on || null,
    due_on: d.due_on || null,
    completed_on: d.completed_on || null,
    progress_percent: Math.max(0, Math.min(100, Number(d.progress_percent) || 0)),
    is_showcased: d.is_showcased,
    showcase_summary: d.showcase_summary.trim() || null,
    source: d.source,
    notes: d.notes.trim() || null,
  }
}

/**
 * The construction manager's desk.
 *
 * Every job the division has taken on — from a land survey to a full build —
 * with where it stands, who is on it and what is due. A brief sent from the
 * website lands here as an enquiry; a finished job marked "showcase" becomes a
 * project on the public portfolio.
 */
export default function ConstructionAdminPage() {
  const { can } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'open' | ProjectStatus | 'all'>('open')
  const [kind, setKind] = useState<ProjectKind | ''>('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  // Search is debounced: the queue is small, but every keystroke would still
  // be a round trip.
  useEffect(() => {
    const id = window.setTimeout(() => setQ(search.trim()), 300)
    return () => window.clearTimeout(id)
  }, [search])

  const listPath =
    '/construction/projects' +
    qs({
      open_only: status === 'open',
      status: status !== 'open' && status !== 'all' ? status : undefined,
      kind: kind || undefined,
      q: q || undefined,
      per_page: 100,
    })
  const { data, loading, refetch } = useQuery<Page<ConstructionProject>>(listPath, { ttl: 0 })
  const { data: summary, refetch: refetchSummary } = useQuery<ConstructionQueueSummary>(
    '/construction/summary',
    { ttl: 0 },
  )
  const { data: staff } = useQuery<ConstructionStaff[]>('/construction/staff')
  const rows = data?.items ?? []

  const refresh = () => {
    invalidate('/construction/')
    invalidate('/public/construction')
    refetch()
    refetchSummary()
  }

  const open = openId ? rows.find((r) => r.id === openId) ?? null : null

  return (
    <>
      <PageHeader
        title="Construction jobs"
        description="Every survey, drawing, permit and build — where it stands, who is on it, and what is due."
        action={
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas"
          >
            <Plus className="size-4" strokeWidth={2.4} />
            Record a job
          </button>
        }
      />

      {summary && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Open jobs" value={summary.open} tone="gold" />
          <Stat label="New enquiries" value={summary.by_status.enquiry} detail="Waiting for a call back" />
          <Stat label="In progress" value={summary.by_status.in_progress} />
          <Stat label="Due this week" value={summary.due_this_week} detail={summary.overdue ? `${summary.overdue} overdue` : undefined} />
          <Stat label="Unassigned" value={summary.unassigned} detail="Approved or running, no engineer" />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {adding && (
        <div className="mb-5">
          <JobForm
            title="New job"
            initial={EMPTY_DRAFT}
            staff={staff ?? []}
            busyKey="new"
            onCancel={() => setAdding(false)}
            onSave={async (draft) => {
              setError(null)
              try {
                const created = await api.post<ConstructionProjectDetail>('/construction/projects', bodyFrom(draft))
                setAdding(false)
                refresh()
                setOpenId(created.id)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'That did not save.')
              }
            }}
          />
        </div>
      )}

      {/* ---- filters ---- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {([
          ['open', 'Open'],
          ...PROJECT_STATUSES.map((s) => [s.id, s.label] as const),
          ['all', 'Everything'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatus(id)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors',
              status === id
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {label}
            {summary && id !== 'open' && id !== 'all' && summary.by_status[id] > 0 && (
              <span className="ml-1.5 text-[0.6875rem] opacity-70">{summary.by_status[id]}</span>
            )}
          </button>
        ))}
        <select
          className={cn(FIELD, 'h-9 w-auto min-w-40 py-0 text-[0.8125rem]')}
          value={kind}
          onChange={(e) => setKind(e.target.value as ProjectKind | '')}
        >
          <option value="">Every kind of work</option>
          {PROJECT_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <label className="relative ml-auto block w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" strokeWidth={2.2} />
          <input
            className={cn(FIELD, 'h-9 pl-9 text-[0.8125rem]')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Reference, client, district, engineer…"
          />
        </label>
      </div>

      <Panel>
        {loading && rows.length === 0 ? (
          <Loading label="Reading the queue…" />
        ) : rows.length === 0 ? (
          <Empty
            title={status === 'open' ? 'Nothing open' : 'No jobs match'}
            detail={
              status === 'open'
                ? 'Briefs from the website and jobs you record appear here.'
                : 'Try another status or clear the search.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const meta = statusMeta(row.status)
              const overdue =
                row.due_on && OPEN_STATUSES.includes(row.status) && row.due_on < new Date().toISOString().slice(0, 10)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(row.id)}
                    className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas-alt"
                  >
                    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-canvas-alt text-ink-faint">
                      {row.photos?.[0]?.url ? (
                        <img src={mediaUrl(row.photos[0].url)} alt="" className="size-full object-cover" />
                      ) : (
                        <HardHat className="size-5" strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{row.title}</span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {row.is_showcased && <Badge tone="info">showcased</Badge>}
                        {overdue && <Badge tone="bad">overdue</Badge>}
                      </span>
                      <span className="mt-1 block text-[0.8125rem] text-ink-soft">
                        {kindLabel(row.kind)}
                        {row.client_name ? ` · ${row.client_name}` : ''}
                        {row.district ? ` · ${row.district}` : ''}
                        {row.engineer_name || row.engineer_id
                          ? ` · ${row.engineer_name ?? staff?.find((s) => s.id === row.engineer_id)?.full_name ?? 'assigned'}`
                          : ' · no engineer yet'}
                      </span>
                      <span className="mt-1.5 flex items-center gap-3 text-[0.6875rem] text-ink-faint">
                        <span className="font-mono">{row.reference}</span>
                        {row.due_on && <span>due {formatDate(row.due_on)}</span>}
                        {row.quote_amount != null && <span>{formatCurrency(row.quote_amount, row.currency)}</span>}
                        <span className="ml-auto hidden items-center gap-2 sm:flex">
                          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-canvas-alt">
                            <span
                              className="block h-full rounded-full bg-gold-500"
                              style={{ width: `${row.progress_percent}%` }}
                            />
                          </span>
                          {row.progress_percent}%
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="mt-3 size-4 shrink-0 text-ink-faint" strokeWidth={2.2} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <AnimatePresence>
        {open && (
          <JobDrawer
            key={open.id}
            id={open.id}
            staff={staff ?? []}
            canDelete={can('admin')}
            onClose={() => setOpenId(null)}
            onChanged={refresh}
          />
        )}
      </AnimatePresence>
    </>
  )
}

/* ------------------------------------------------------------------ form */

function JobForm({
  title,
  initial,
  staff,
  busyKey,
  onSave,
  onCancel,
}: {
  title: string
  initial: Draft
  staff: ConstructionStaff[]
  busyKey: string
  onSave: (draft: Draft) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<Draft>(initial)
  const [busy, setBusy] = useState(false)
  const set = (key: keyof Draft) => (value: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: value }))
  const { districts } = useLocalities()
  const sectors = useSectors(draft.district)

  const submit = async () => {
    if (!draft.title.trim()) return
    setBusy(true)
    try {
      await onSave(draft)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title={title}>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Job title" hint="What the client would recognise — “Boundary survey, Kanombe plot”.">
            <input className={FIELD} value={draft.title} onChange={(e) => set('title')(e.target.value)} />
          </Field>
        </div>
        <Field label="Kind of work">
          <select className={FIELD} value={draft.kind} onChange={(e) => set('kind')(e.target.value)}>
            {PROJECT_KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={FIELD} value={draft.status} onChange={(e) => set('status')(e.target.value)}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Client name">
          <input className={FIELD} value={draft.client_name} onChange={(e) => set('client_name')(e.target.value)} />
        </Field>
        <Field label="Client phone">
          <input className={FIELD} value={draft.client_phone} onChange={(e) => set('client_phone')(e.target.value)} />
        </Field>
        <Field label="Client email">
          <input className={FIELD} type="email" value={draft.client_email} onChange={(e) => set('client_email')(e.target.value)} />
        </Field>
        <Field label="How it reached us">
          <select className={FIELD} value={draft.source} onChange={(e) => set('source')(e.target.value)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>

        <Field label="District">
          <select
            className={FIELD}
            value={draft.district}
            onChange={(e) => setDraft((d) => ({ ...d, district: e.target.value, sector: '' }))}
          >
            <option value="">Choose…</option>
            {districts.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sector">
          <select className={FIELD} value={draft.sector} disabled={!draft.district} onChange={(e) => set('sector')(e.target.value)}>
            <option value="">{draft.district ? 'Choose…' : 'Choose a district first'}</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Site address or landmark">
            <input className={FIELD} value={draft.address} onChange={(e) => set('address')(e.target.value)} />
          </Field>
        </div>

        <Field label="Engineer on the job" hint="A staff account, or a name if the work is subcontracted.">
          <select className={FIELD} value={draft.engineer_id} onChange={(e) => set('engineer_id')(e.target.value)}>
            <option value="">Not a staff account</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.job_title ? ` — ${s.job_title}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Engineer / surveyor name">
          <input className={FIELD} value={draft.engineer_name} onChange={(e) => set('engineer_name')(e.target.value)} placeholder="Eng. …" />
        </Field>

        <Field label="Quoted amount">
          <MoneyInput currency="RWF" className={FIELD} value={draft.quote_amount} onChange={set('quote_amount')} />
        </Field>
        <Field label="Paid so far">
          <MoneyInput currency="RWF" className={FIELD} value={draft.amount_paid} onChange={set('amount_paid')} />
        </Field>

        <Field label="Started on">
          <input type="date" className={FIELD} value={draft.started_on} onChange={(e) => set('started_on')(e.target.value)} />
        </Field>
        <Field label="Due on">
          <input type="date" className={FIELD} value={draft.due_on} onChange={(e) => set('due_on')(e.target.value)} />
        </Field>
        <Field label="Completed on">
          <input type="date" className={FIELD} value={draft.completed_on} onChange={(e) => set('completed_on')(e.target.value)} />
        </Field>
        <Field label={`Progress · ${draft.progress_percent}%`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            className="mt-3 w-full accent-gold-500"
            value={draft.progress_percent}
            onChange={(e) => set('progress_percent')(e.target.value)}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="What the job is" hint="Scope, plot size, storeys, what the client asked for.">
            <textarea rows={3} className={cn(FIELD, 'h-auto py-2.5')} value={draft.description} onChange={(e) => set('description')(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Internal notes" hint="Never shown to the client.">
            <textarea rows={2} className={cn(FIELD, 'h-auto py-2.5')} value={draft.notes} onChange={(e) => set('notes')(e.target.value)} />
          </Field>
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-canvas-alt p-4 sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-gold-500"
              checked={draft.is_showcased}
              onChange={(e) => set('is_showcased')(e.target.checked)}
            />
            <span>
              <span className="block text-[0.875rem] font-medium text-ink">Show on the public portfolio</span>
              <span className="mt-0.5 block text-[0.75rem] text-ink-muted">
                Appears under “Projects we have built” once the job is completed. Client and money never do.
              </span>
            </span>
          </label>
          {draft.is_showcased && (
            <Field label="What the portfolio says" hint="Written for a prospective client — what was built, where, and what made it work.">
              <textarea rows={3} className={cn(FIELD, 'h-auto py-2.5')} value={draft.showcase_summary} onChange={(e) => set('showcase_summary')(e.target.value)} />
            </Field>
          )}
        </div>

        <div className="flex gap-3 sm:col-span-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !draft.title.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas disabled:opacity-50"
          >
            <Save className="size-4" strokeWidth={2.4} />
            {busy ? 'Saving…' : busyKey === 'new' ? 'Record job' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-line px-4 text-[0.875rem] font-semibold text-ink-soft">
            Cancel
          </button>
        </div>
      </div>
    </Panel>
  )
}

/* ---------------------------------------------------------------- drawer */

function JobDrawer({
  id,
  staff,
  canDelete,
  onClose,
  onChanged,
}: {
  id: string
  staff: ConstructionStaff[]
  canDelete: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { data: job, refetch } = useQuery<ConstructionProjectDetail>(`/construction/projects/${id}`, { ttl: 0 })
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteStatus, setNoteStatus] = useState<ProjectStatus | ''>('')
  const [noteProgress, setNoteProgress] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const changed = () => {
    refetch()
    onChanged()
  }

  const addNote = async () => {
    if (!note.trim()) return
    setSending(true)
    setError(null)
    try {
      await api.post(`/construction/projects/${id}/updates`, {
        note: note.trim(),
        status: noteStatus || null,
        progress_percent: noteProgress ? Number(noteProgress) : null,
      })
      setNote('')
      setNoteStatus('')
      setNoteProgress('')
      changed()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
    } finally {
      setSending(false)
    }
  }

  const engineer = useMemo(
    () => job?.engineer_name ?? staff.find((s) => s.id === job?.engineer_id)?.full_name ?? null,
    [job, staff],
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-navy-950/40"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-line bg-canvas"
        role="dialog"
        aria-modal="true"
        aria-label="Construction job"
      >
        {!job ? (
          <Loading label="Opening the job…" />
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-canvas/95 px-6 py-5 backdrop-blur">
              <div className="min-w-0">
                <p className="font-mono text-[0.75rem] text-ink-faint">{job.reference}</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-ink">{job.title}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone={statusMeta(job.status).tone}>{statusMeta(job.status).label}</Badge>
                  <Badge tone="neutral">{kindLabel(job.kind)}</Badge>
                  {job.is_showcased && <Badge tone="info">showcased</Badge>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="h-10 rounded-xl border border-line px-3.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                >
                  {editing ? 'Close editor' : 'Edit'}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    title="Delete permanently"
                    onClick={async () => {
                      if (!window.confirm(`Delete ${job.reference} permanently? Cancelling it is usually the right move.`)) return
                      try {
                        await api.delete(`/construction/projects/${id}`)
                        onChanged()
                        onClose()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'That did not delete.')
                      }
                    }}
                    className="grid size-10 place-items-center rounded-xl border border-line text-ink-faint transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    <Trash2 className="size-4" strokeWidth={2.2} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="grid size-10 place-items-center rounded-xl text-ink-soft transition-colors hover:bg-canvas-alt"
                >
                  <X className="size-5" strokeWidth={2.2} />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {error && <ErrorNote message={error} />}

              {editing ? (
                <JobForm
                  title="Edit job"
                  initial={draftFrom(job)}
                  staff={staff}
                  busyKey={job.id}
                  onCancel={() => setEditing(false)}
                  onSave={async (draft) => {
                    setError(null)
                    try {
                      await api.patch(`/construction/projects/${id}`, bodyFrom(draft))
                      setEditing(false)
                      changed()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'That did not save.')
                    }
                  }}
                />
              ) : (
                <>
                  {/* ---- facts ---- */}
                  <dl className="grid gap-x-6 gap-y-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-3">
                    {[
                      ['Client', [job.client_name, job.client_phone, job.client_email].filter(Boolean).join(' · ')],
                      ['Where', [job.address, job.sector, job.district].filter(Boolean).join(', ')],
                      ['Engineer', engineer ?? 'Not assigned yet'],
                      ['Quoted', job.quote_amount != null ? formatCurrency(job.quote_amount, job.currency) : '—'],
                      ['Paid', job.amount_paid != null ? formatCurrency(job.amount_paid, job.currency) : '—'],
                      [
                        'Dates',
                        [
                          job.started_on ? `started ${formatDate(job.started_on)}` : null,
                          job.due_on ? `due ${formatDate(job.due_on)}` : null,
                          job.completed_on ? `completed ${formatDate(job.completed_on)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—',
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">{label}</dt>
                        <dd className="mt-1 text-[0.875rem] text-ink">{value || '—'}</dd>
                      </div>
                    ))}
                    <div className="sm:col-span-3">
                      <dt className="text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">Progress</dt>
                      <dd className="mt-2 flex items-center gap-3">
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-canvas-alt">
                          <span className="block h-full rounded-full bg-gold-500" style={{ width: `${job.progress_percent}%` }} />
                        </span>
                        <span className="text-[0.8125rem] font-semibold text-ink tabular-nums">{job.progress_percent}%</span>
                      </dd>
                    </div>
                    {job.description && (
                      <div className="sm:col-span-3">
                        <dt className="text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">Scope</dt>
                        <dd className="mt-1 text-[0.875rem] whitespace-pre-line text-ink-soft">{job.description}</dd>
                      </div>
                    )}
                    {job.notes && (
                      <div className="sm:col-span-3">
                        <dt className="text-[0.6875rem] font-bold tracking-wide text-ink-muted uppercase">Internal notes</dt>
                        <dd className="mt-1 text-[0.875rem] whitespace-pre-line text-ink-muted">{job.notes}</dd>
                      </div>
                    )}
                  </dl>

                  {/* ---- photos ---- */}
                  <div className="rounded-2xl border border-line bg-surface p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                        Photographs · {job.photos?.length ?? 0}
                      </h3>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink">
                        {uploading ? <Loader2 className="size-3.5 animate-spin" strokeWidth={2.2} /> : <Camera className="size-3.5" strokeWidth={2.2} />}
                        {uploading ? 'Uploading…' : 'Add photos'}
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="sr-only"
                          disabled={uploading}
                          onChange={async (e) => {
                            const picked = Array.from(e.target.files ?? [])
                            e.target.value = ''
                            if (!picked.length) return
                            setUploading(true)
                            setError(null)
                            try {
                              await api.upload(`/construction/projects/${id}/photos`, picked)
                              changed()
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Those photos were not uploaded.')
                            } finally {
                              setUploading(false)
                            }
                          }}
                        />
                      </label>
                    </div>
                    {job.photos?.length ? (
                      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {job.photos.map((photo, i) => (
                          <li key={`${photo.url}-${i}`} className="group relative overflow-hidden rounded-xl border border-line">
                            <img src={mediaUrl(photo.url)} alt={photo.caption ?? ''} className="aspect-square w-full object-cover" />
                            {i === 0 && (
                              <span className="absolute top-1.5 left-1.5 rounded-md bg-navy-950/70 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">
                                cover
                              </span>
                            )}
                            <button
                              type="button"
                              title="Remove"
                              onClick={async () => {
                                const photos = (job.photos ?? []).filter((_, j) => j !== i)
                                try {
                                  await api.patch(`/construction/projects/${id}`, { photos })
                                  changed()
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'That did not save.')
                                }
                              }}
                              className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-navy-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X className="size-3.5" strokeWidth={2.4} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[0.8125rem] text-ink-muted">
                        Site and result photographs. The first one is the cover on the portfolio.
                      </p>
                    )}
                  </div>

                  {/* ---- history ---- */}
                  <div className="rounded-2xl border border-line bg-surface p-5">
                    <h3 className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">History</h3>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                      <input
                        className={cn(FIELD, 'h-10')}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Site visit done, drawings issued, waiting on the permit…"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void addNote()
                        }}
                      />
                      <select
                        className={cn(FIELD, 'h-10 w-auto py-0 text-[0.8125rem]')}
                        value={noteStatus}
                        onChange={(e) => setNoteStatus(e.target.value as ProjectStatus | '')}
                        aria-label="Move to status"
                      >
                        <option value="">Status unchanged</option>
                        {PROJECT_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>
                            → {s.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={cn(FIELD, 'h-10 w-24 text-[0.8125rem]')}
                        value={noteProgress}
                        onChange={(e) => setNoteProgress(e.target.value)}
                        placeholder="%"
                        aria-label="Progress percent"
                      />
                      <button
                        type="button"
                        onClick={() => void addNote()}
                        disabled={sending || !note.trim()}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-[0.8125rem] font-semibold text-canvas disabled:opacity-50"
                      >
                        <Send className="size-3.5" strokeWidth={2.4} />
                        Add
                      </button>
                    </div>

                    <ol className="mt-4 space-y-3 border-l border-line pl-4">
                      {job.updates.map((u) => (
                        <li key={u.id} className="relative">
                          <span className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-surface bg-gold-500" />
                          <p className="text-[0.875rem] text-ink">{u.note}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.6875rem] text-ink-faint">
                            <span>{formatDate(u.created_at)}</span>
                            {u.author_name && <span>· {u.author_name}</span>}
                            {u.status && <Badge tone={statusMeta(u.status).tone}>{statusMeta(u.status).label}</Badge>}
                            {u.progress_percent != null && <span>· {u.progress_percent}%</span>}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* ---- public toggle, one click ---- */}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await api.patch(`/construction/projects/${id}`, { is_showcased: !job.is_showcased })
                        changed()
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'That did not save.')
                      }
                    }}
                    className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-ink-soft hover:text-ink"
                  >
                    {job.is_showcased ? <EyeOff className="size-4" strokeWidth={2.2} /> : <Eye className="size-4" strokeWidth={2.2} />}
                    {job.is_showcased ? 'Take off the public portfolio' : 'Show on the public portfolio (once completed)'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </motion.aside>
    </motion.div>
  )
}
