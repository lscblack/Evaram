import { useState } from 'react'
import { Clock, Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorNote,
  FIELD,
  Field,
  Loading,
  PageHeader,
  Panel,
} from '@/components/admin/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { invalidate, useQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { LocaleTabs, type Locale } from '@/components/admin/LocaleTabs'
import type { ApiConsultationType } from '@/types/api'

/** Weekdays as JavaScript counts them — the order the booking calendar uses. */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY_DRAFT = {
  slug: '',
  title: '',
  description: '',
  duration_minutes: '30',
  price_label: 'Free',
  icon: '',
  modes: '',
  available_days: [1, 2, 3, 4, 5] as number[],
  slots: '',
  display_order: '',
}

type Draft = typeof EMPTY_DRAFT

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** "09:00, 11:00" or one per line — both are how people type a timetable. */
const splitList = (value: string) =>
  value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean)

/**
 * The consultations a visitor can book, editable.
 *
 * Price, length, how it is held and when — the four things that change as the
 * business does, and until now lived only in the seed. Hiding takes one off
 * the booking form without touching the bookings already made against it;
 * deletion is super-admin only and refused once anything has been booked.
 */
export default function ConsultationsAdminPage() {
  const { can } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState<Draft>(EMPTY_DRAFT)
  const [editLocale, setEditLocale] = useState<Locale>('en')
  const [editTranslations, setEditTranslations] = useState<LocaleDraft>(EMPTY_LOCALES)

  const { data, loading, refetch } = useQuery<ApiConsultationType[]>(
    '/admin/consultation-types',
    { ttl: 0 },
  )
  const types = data ?? []

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusy(id)
    setError(null)
    try {
      await action()
      invalidate('/admin/consultation-types')
      invalidate('/public/consultation-types')
      refetch()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
      return false
    } finally {
      setBusy(null)
    }
  }

  const bodyFrom = (d: Draft) => ({
    slug: d.slug || toSlug(d.title),
    title: d.title.trim(),
    description: d.description.trim() || null,
    duration_minutes: Number(d.duration_minutes) || 30,
    price_label: d.price_label.trim() || 'Free',
    icon: d.icon.trim() || null,
    modes: splitList(d.modes).length ? splitList(d.modes) : null,
    available_days: [...d.available_days].sort(),
    slots: splitList(d.slots).length ? splitList(d.slots) : null,
    display_order: d.display_order ? Number(d.display_order) : 0,
  })

  const create = async () => {
    if (!draft.title.trim()) return setError('A consultation needs a title.')
    const ok = await run('new', () => api.post('/admin/consultation-types', bodyFrom(draft)))
    if (ok) {
      setDraft(EMPTY_DRAFT)
      setAdding(false)
    }
  }

  const startEdit = (row: ApiConsultationType) => {
    setEditing(row.id)
    setEditLocale('en')
    setEditTranslations(readLocales(row.translations))
    setEdit({
      slug: row.slug,
      title: row.title,
      description: row.description ?? '',
      duration_minutes: String(row.duration_minutes),
      price_label: row.price_label,
      icon: row.icon ?? '',
      modes: (row.modes ?? []).join(', '),
      available_days: row.available_days ?? [],
      slots: (row.slots ?? []).join(', '),
      display_order: String(row.display_order),
    })
  }

  const saveEdit = async (id: string) => {
    const ok = await run(id, () =>
      api.patch(`/admin/consultation-types/${id}`, {
        ...bodyFrom(edit),
        translations: packLocales(editTranslations),
      }),
    )
    if (ok) setEditing(null)
  }

  return (
    <>
      <PageHeader
        title="Consultations"
        description="What a visitor can book, what it costs, how long it takes and when it is offered."
        action={
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas"
          >
            <Plus className="size-4" strokeWidth={2.4} />
            Add consultation
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {adding && (
        <div className="mb-5">
          <Panel title="New consultation">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <ConsultationFields draft={draft} setDraft={setDraft} />
              <div className="flex gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={create}
                  disabled={busy === 'new'}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas disabled:opacity-50"
                >
                  <Save className="size-4" strokeWidth={2.4} />
                  {busy === 'new' ? 'Saving…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false)
                    setDraft(EMPTY_DRAFT)
                  }}
                  className="h-11 rounded-xl border border-line px-4 text-[0.875rem] font-semibold text-ink-soft"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      <Panel>
        {loading && types.length === 0 ? (
          <Loading />
        ) : types.length === 0 ? (
          <Empty
            title="No consultations yet"
            detail="Add one and it appears on the booking page straight away."
          />
        ) : (
          <ul className="divide-y divide-line">
            {types.map((row) => (
              <li key={row.id} className="p-5">
                {editing === row.id ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3 sm:col-span-2">
                      <LocaleTabs
                        locale={editLocale}
                        onChange={setEditLocale}
                        hasContent={(l) =>
                          l === 'en' ||
                          Object.values(editTranslations[l] ?? {}).some((v) => v.trim())
                        }
                      />
                      {editLocale !== 'en' && (
                        <span className="text-[0.75rem] text-ink-muted">
                          Blank falls back to English
                        </span>
                      )}
                    </div>

                    {editLocale === 'en' ? (
                      <ConsultationFields draft={edit} setDraft={setEdit} />
                    ) : (
                      <TranslatedFields
                        values={editTranslations[editLocale]}
                        onChange={(field, value) =>
                          setEditTranslations((t) => ({
                            ...t,
                            [editLocale]: { ...t[editLocale], [field]: value },
                          }))
                        }
                      />
                    )}
                    <div className="flex gap-3 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit(row.id)}
                        disabled={busy === row.id}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas disabled:opacity-50"
                      >
                        <Save className="size-4" strokeWidth={2.4} />
                        {busy === row.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="h-11 rounded-xl border border-line px-4 text-[0.875rem] font-semibold text-ink-soft"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <p className="font-semibold text-ink">{row.title}</p>
                        <Badge tone={row.price_label.toLowerCase() === 'free' ? 'info' : 'warn'}>
                          {row.price_label}
                        </Badge>
                        {!row.is_active && <Badge tone="neutral">hidden</Badge>}
                      </div>
                      {row.description && (
                        <p className="mt-1.5 max-w-2xl text-[0.875rem] text-ink-soft">
                          {row.description}
                        </p>
                      )}
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-ink-muted">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" strokeWidth={2.2} />
                          {row.duration_minutes} min
                        </span>
                        {row.modes?.length ? <span>{row.modes.join(' / ')}</span> : null}
                        <span>
                          {(row.available_days ?? []).length
                            ? row.available_days!.map((d) => DAYS[d]).join(' ')
                            : 'no days set'}
                        </span>
                        <span>{row.slots?.length ?? 0} time slots</span>
                      </p>
                      <p className="mt-2 font-mono text-[0.6875rem] text-ink-faint">
                        {row.slug} · order {row.display_order}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="h-10 rounded-xl border border-line px-3.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        title={row.is_active ? 'Hide from the booking page' : 'Show on the booking page'}
                        onClick={() =>
                          void run(row.id, () =>
                            api.patch(`/admin/consultation-types/${row.id}`, {
                              is_active: !row.is_active,
                            }),
                          )
                        }
                        disabled={busy === row.id}
                        className="grid size-10 place-items-center rounded-xl border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                      >
                        {row.is_active ? (
                          <Eye className="size-4" strokeWidth={2.2} />
                        ) : (
                          <EyeOff className="size-4" strokeWidth={2.2} />
                        )}
                      </button>
                      {can('super_admin') && (
                        <button
                          type="button"
                          title="Delete permanently"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Delete "${row.title}" permanently? Hiding it is usually safer — this cannot be undone.`,
                              )
                            )
                              return
                            void run(row.id, () => api.delete(`/admin/consultation-types/${row.id}`))
                          }}
                          disabled={busy === row.id}
                          className="grid size-10 place-items-center rounded-xl border border-line text-ink-faint transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="size-4" strokeWidth={2.2} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}

function ConsultationFields({
  draft,
  setDraft,
}: {
  draft: Draft
  setDraft: React.Dispatch<React.SetStateAction<Draft>>
}) {
  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))
  const toggleDay = (day: number) =>
    setDraft((d) => ({
      ...d,
      available_days: d.available_days.includes(day)
        ? d.available_days.filter((x) => x !== day)
        : [...d.available_days, day],
    }))

  return (
    <>
      <Field label="Title">
        <input className={FIELD} value={draft.title} onChange={(e) => set('title')(e.target.value)} />
      </Field>
      <Field label="Slug" hint="Left blank, it is built from the title.">
        <input className={FIELD} value={draft.slug} onChange={(e) => set('slug')(e.target.value)} />
      </Field>
      <Field label="Price" hint="Shown as written — “Free”, “RWF 25,000”, “From RWF 50,000”.">
        <input
          className={FIELD}
          value={draft.price_label}
          onChange={(e) => set('price_label')(e.target.value)}
        />
      </Field>
      <Field label="Length (minutes)">
        <input
          type="number"
          min={5}
          max={480}
          className={FIELD}
          value={draft.duration_minutes}
          onChange={(e) => set('duration_minutes')(e.target.value)}
        />
      </Field>
      <Field label="How it is held" hint="Comma-separated; the first is the default. e.g. Phone, WhatsApp video, In person.">
        <input className={FIELD} value={draft.modes} onChange={(e) => set('modes')(e.target.value)} />
      </Field>
      <Field label="Icon" hint="A lucide icon name, e.g. Phone or MapPin.">
        <input className={FIELD} value={draft.icon} onChange={(e) => set('icon')(e.target.value)} />
      </Field>

      <div className="sm:col-span-2">
        <Field label="Days offered">
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((label, day) => {
              const on = draft.available_days.includes(day)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(day)}
                  aria-pressed={on}
                  className={cn(
                    'h-9 rounded-lg border px-3 text-[0.8125rem] font-semibold transition-colors',
                    on
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field
          label="Time slots"
          hint="24-hour times, comma-separated, in Kigali time — e.g. 09:00, 11:00, 14:00. Each is one bookable start time."
        >
          <input className={FIELD} value={draft.slots} onChange={(e) => set('slots')(e.target.value)} />
        </Field>
      </div>

      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea
            rows={2}
            className={cn(FIELD, 'h-auto py-2.5')}
            value={draft.description}
            onChange={(e) => set('description')(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Display order">
        <input
          className={FIELD}
          inputMode="numeric"
          value={draft.display_order}
          onChange={(e) => set('display_order')(e.target.value)}
        />
      </Field>
    </>
  )
}

/* ------------------------------------------------------- translated fields */

type LocaleFields = { title: string; description: string; price_label: string }
type LocaleDraft = Record<'rw' | 'fr', LocaleFields>

const EMPTY_LOCALE_FIELDS: LocaleFields = { title: '', description: '', price_label: '' }
const EMPTY_LOCALES: LocaleDraft = { rw: { ...EMPTY_LOCALE_FIELDS }, fr: { ...EMPTY_LOCALE_FIELDS } }

function readLocales(translations: ApiConsultationType['translations']): LocaleDraft {
  const one = (locale: string): LocaleFields => {
    const found = (translations?.[locale] ?? {}) as Record<string, unknown>
    const text = (k: string) => (typeof found[k] === 'string' ? (found[k] as string) : '')
    return { title: text('title'), description: text('description'), price_label: text('price_label') }
  }
  return { rw: one('rw'), fr: one('fr') }
}

function packLocales(draft: LocaleDraft): Record<string, Record<string, unknown>> | null {
  const out: Record<string, Record<string, unknown>> = {}
  for (const locale of ['rw', 'fr'] as const) {
    const entry: Record<string, unknown> = {}
    for (const key of ['title', 'description', 'price_label'] as const) {
      if (draft[locale][key].trim()) entry[key] = draft[locale][key].trim()
    }
    if (Object.keys(entry).length) out[locale] = entry
  }
  return Object.keys(out).length ? out : null
}

function TranslatedFields({
  values,
  onChange,
}: {
  values: LocaleFields
  onChange: (field: keyof LocaleFields, value: string) => void
}) {
  return (
    <>
      <Field label="Title">
        <input className={FIELD} value={values.title} onChange={(e) => onChange('title', e.target.value)} />
      </Field>
      <Field label="Price">
        <input
          className={FIELD}
          value={values.price_label}
          onChange={(e) => onChange('price_label', e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea
            rows={2}
            className={cn(FIELD, 'h-auto py-2.5')}
            value={values.description}
            onChange={(e) => onChange('description', e.target.value)}
          />
        </Field>
      </div>
    </>
  )
}
