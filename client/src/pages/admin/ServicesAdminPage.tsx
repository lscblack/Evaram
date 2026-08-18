import { useState } from 'react'
import { Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'
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
import { MarketStatsPanel } from '@/components/admin/MarketStatsPanel'
import type { ApiServiceLine } from '@/types/api'

const DIVISIONS = ['Realty', 'Construction', 'Group']

const EMPTY_DRAFT = {
  slug: '',
  title: '',
  tagline: '',
  description: '',
  division: 'Realty',
  icon: '',
  href: '',
  bullets: '',
  display_order: '',
}

/** `slugify` for the one field where a typo means a broken link. */
const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * The services shown on the site, editable.
 *
 * These were seeded rows with no way to change them — adding a service meant a
 * deploy. Deactivating is the normal way to take one off the site; deletion is
 * super-admin only, because a removed row cannot be recovered from here.
 */
export default function ServicesAdminPage() {
  const [tab, setTab] = useState<'services' | 'stats'>('services')
  const { can } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState(EMPTY_DRAFT)
  /** rw/fr overrides for the row being edited, keyed by locale then field. */
  const [editLocale, setEditLocale] = useState<Locale>('en')
  const [editTranslations, setEditTranslations] = useState<LocaleDraft>(EMPTY_LOCALES)

  const { data, loading, refetch } = useQuery<ApiServiceLine[]>('/admin/services', { ttl: 0 })
  const services = data ?? []

  /** Every mutation refreshes both this list and the public cache behind it. */
  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusy(id)
    setError(null)
    try {
      await action()
      invalidate('/admin/services')
      invalidate('/public/services')
      refetch()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
      return false
    } finally {
      setBusy(null)
    }
  }

  const bodyFrom = (d: typeof EMPTY_DRAFT) => ({
    slug: d.slug || toSlug(d.title),
    title: d.title,
    tagline: d.tagline || null,
    description: d.description || null,
    division: d.division,
    icon: d.icon || null,
    href: d.href || null,
    // One bullet per line is how people actually type a list.
    bullets: d.bullets
      ? d.bullets.split('\n').map((b) => b.trim()).filter(Boolean)
      : null,
    display_order: d.display_order ? Number(d.display_order) : 0,
  })

  const create = async () => {
    if (!draft.title.trim()) return setError('A service needs a title.')
    const ok = await run('new', () => api.post('/admin/services', bodyFrom(draft)))
    if (ok) {
      setDraft(EMPTY_DRAFT)
      setAdding(false)
    }
  }

  const startEdit = (row: ApiServiceLine) => {
    setEditing(row.id)
    setEditLocale('en')
    setEditTranslations(readLocales(row.translations))
    setEdit({
      slug: row.slug,
      title: row.title,
      tagline: row.tagline ?? '',
      description: row.description ?? '',
      division: row.division,
      icon: row.icon ?? '',
      href: row.href ?? '',
      bullets: (row.bullets ?? []).join('\n'),
      display_order: String(row.display_order),
    })
  }

  const saveEdit = async (id: string) => {
    const ok = await run(id, () =>
      api.patch(`/admin/services/${id}`, {
        ...bodyFrom(edit),
        translations: packLocales(editTranslations),
      }),
    )
    if (ok) setEditing(null)
  }

  return (
    <>
      <PageHeader
        title="Services & market stats"
        description="What the site says you do, and the four numbers on the home page."
        action={
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas"
          >
            <Plus className="size-4" strokeWidth={2.4} />
            Add service
          </button>
        }
      />

      <div className="mb-5 flex gap-2">
        {([
          ['services', 'Services'],
          ['stats', 'Market stats'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors',
              tab === id
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'stats' && <MarketStatsPanel canDelete={can('super_admin')} />}

      {error && tab === 'services' && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {tab === 'services' && adding && (
        <div className="mb-5">
          <Panel title="New service">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <ServiceFields draft={draft} setDraft={setDraft} />
              <div className="sm:col-span-2 flex gap-3">
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

      {tab === 'services' && (
      <Panel>
        {loading && services.length === 0 ? (
          <Loading />
        ) : services.length === 0 ? (
          <Empty title="No services yet" detail="Add the first one to have it appear on the site." />
        ) : (
          <ul className="divide-y divide-line">
            {services.map((row) => (
              <li key={row.id} className="p-5">
                {editing === row.id ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 flex items-center justify-between gap-3">
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
                      <ServiceFields draft={edit} setDraft={setEdit} />
                    ) : (
                      <TranslatedServiceFields
                        values={editTranslations[editLocale]}
                        onChange={(field, value) =>
                          setEditTranslations((t) => ({
                            ...t,
                            [editLocale]: { ...t[editLocale], [field]: value },
                          }))
                        }
                      />
                    )}
                    <div className="sm:col-span-2 flex gap-3">
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
                        <Badge tone={row.division === 'Construction' ? 'warn' : 'info'}>
                          {row.division}
                        </Badge>
                        {!row.is_active && <Badge tone="neutral">hidden</Badge>}
                      </div>
                      {row.tagline && (
                        <p className="mt-1 text-[0.875rem] text-gold-600">{row.tagline}</p>
                      )}
                      {row.description && (
                        <p className="mt-1.5 max-w-2xl text-[0.875rem] text-ink-soft">
                          {row.description}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-[0.6875rem] text-ink-faint">
                        {row.slug} · order {row.display_order} · {row.bullets?.length ?? 0} bullets
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
                        title={row.is_active ? 'Hide from the site' : 'Show on the site'}
                        onClick={() =>
                          void run(row.id, () =>
                            api.patch(`/admin/services/${row.id}`, { is_active: !row.is_active }),
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
                            void run(row.id, () => api.delete(`/admin/services/${row.id}`))
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
      )}
    </>
  )
}

function ServiceFields({
  draft,
  setDraft,
}: {
  draft: typeof EMPTY_DRAFT
  setDraft: React.Dispatch<React.SetStateAction<typeof EMPTY_DRAFT>>
}) {
  const set = (key: keyof typeof EMPTY_DRAFT) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }))

  return (
    <>
      <Field label="Title">
        <input className={FIELD} value={draft.title} onChange={(e) => set('title')(e.target.value)} />
      </Field>
      <Field label="Slug" hint="Left blank, it is built from the title.">
        <input className={FIELD} value={draft.slug} onChange={(e) => set('slug')(e.target.value)} />
      </Field>
      <Field label="Tagline">
        <input
          className={FIELD}
          value={draft.tagline}
          onChange={(e) => set('tagline')(e.target.value)}
        />
      </Field>
      <Field label="Division">
        <select
          className={FIELD}
          value={draft.division}
          onChange={(e) => set('division')(e.target.value)}
        >
          {DIVISIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Icon" hint="A lucide icon name, e.g. Building2.">
        <input className={FIELD} value={draft.icon} onChange={(e) => set('icon')(e.target.value)} />
      </Field>
      <Field label="Link" hint="Where the card points, e.g. /services#manage.">
        <input className={FIELD} value={draft.href} onChange={(e) => set('href')(e.target.value)} />
      </Field>
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
      <div className="sm:col-span-2">
        <Field label="Bullets" hint="One per line.">
          <textarea
            rows={4}
            className={cn(FIELD, 'h-auto py-2.5')}
            value={draft.bullets}
            onChange={(e) => set('bullets')(e.target.value)}
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


/* ------------------------------------------------- translated service fields */

type LocaleFields = { title: string; tagline: string; description: string; bullets: string }
type LocaleDraft = Record<'rw' | 'fr', LocaleFields>

const EMPTY_LOCALE_FIELDS: LocaleFields = { title: '', tagline: '', description: '', bullets: '' }
const EMPTY_LOCALES: LocaleDraft = { rw: { ...EMPTY_LOCALE_FIELDS }, fr: { ...EMPTY_LOCALE_FIELDS } }

/** Read rw/fr out of the stored blob into editable strings. */
function readLocales(translations: ApiServiceLine['translations']): LocaleDraft {
  const one = (locale: string): LocaleFields => {
    const found = (translations?.[locale] ?? {}) as Record<string, unknown>
    const text = (k: string) => (typeof found[k] === 'string' ? (found[k] as string) : '')
    return {
      title: text('title'),
      tagline: text('tagline'),
      description: text('description'),
      // Bullets are an array on the wire and one-per-line in the form.
      bullets: Array.isArray(found.bullets) ? (found.bullets as string[]).join('\n') : '',
    }
  }
  return { rw: one('rw'), fr: one('fr') }
}

/** Back to the wire shape, dropping anything blank so English shows through. */
function packLocales(draft: LocaleDraft): Record<string, Record<string, unknown>> | null {
  const out: Record<string, Record<string, unknown>> = {}
  for (const locale of ['rw', 'fr'] as const) {
    const fields = draft[locale]
    const entry: Record<string, unknown> = {}
    if (fields.title.trim()) entry.title = fields.title.trim()
    if (fields.tagline.trim()) entry.tagline = fields.tagline.trim()
    if (fields.description.trim()) entry.description = fields.description.trim()
    const bullets = fields.bullets.split('\n').map((b) => b.trim()).filter(Boolean)
    if (bullets.length) entry.bullets = bullets
    if (Object.keys(entry).length) out[locale] = entry
  }
  return Object.keys(out).length ? out : null
}

function TranslatedServiceFields({
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
      <Field label="Tagline">
        <input className={FIELD} value={values.tagline} onChange={(e) => onChange('tagline', e.target.value)} />
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
      <div className="sm:col-span-2">
        <Field label="Bullets" hint="One per line.">
          <textarea
            rows={4}
            className={cn(FIELD, 'h-auto py-2.5')}
            value={values.bullets}
            onChange={(e) => onChange('bullets', e.target.value)}
          />
        </Field>
      </div>
    </>
  )
}
