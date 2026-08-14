import { useState } from 'react'
import { Eye, EyeOff, Plus, Save, Trash2 } from 'lucide-react'
import { Badge, Empty, ErrorNote, FIELD, Field, Loading, Panel } from '@/components/admin/ui'
import { Icon } from '@/components/ui/Icon'
import { api } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'
import type { ApiMarketStat } from '@/types/api'

const EMPTY = { key: '', value: '', label: '', detail: '', icon: '', source: '', display_order: '' }

/**
 * The four numbers in the home page's market band.
 *
 * They live in `market_stats`, not in the page-copy blocks — the heading and the
 * "Sources:" line above them are content blocks, the figures are rows. Until
 * now only the heading was editable, so changing "400,000+" meant a deploy.
 */
export function MarketStatsPanel({ canDelete }: { canDelete: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [edit, setEdit] = useState(EMPTY)

  const { data, loading, refetch } = useQuery<ApiMarketStat[]>('/admin/market-stats', { ttl: 0 })
  const stats = data ?? []

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusy(id)
    setError(null)
    try {
      await action()
      invalidate('/admin/market-stats')
      invalidate('/public/market-stats')
      refetch()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
      return false
    } finally {
      setBusy(null)
    }
  }

  const bodyFrom = (d: typeof EMPTY) => ({
    key: d.key || d.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    value: d.value,
    label: d.label,
    detail: d.detail || null,
    icon: d.icon || null,
    source: d.source || null,
    display_order: d.display_order ? Number(d.display_order) : 0,
  })

  const create = async () => {
    if (!draft.value.trim() || !draft.label.trim()) {
      setError('A stat needs both a figure and a label.')
      return
    }
    if (await run('new', () => api.post('/admin/market-stats', bodyFrom(draft)))) {
      setDraft(EMPTY)
      setAdding(false)
    }
  }

  const startEdit = (row: ApiMarketStat) => {
    setEditing(row.id)
    setEdit({
      key: row.key,
      value: row.value,
      label: row.label,
      detail: row.detail ?? '',
      icon: row.icon ?? '',
      source: row.source ?? '',
      display_order: String(row.display_order),
    })
  }

  const saveEdit = async (id: string) => {
    if (await run(id, () => api.patch(`/admin/market-stats/${id}`, bodyFrom(edit)))) setEditing(null)
  }

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas"
        >
          <Plus className="size-4" strokeWidth={2.4} />
          Add stat
        </button>
      </div>

      {adding && (
        <div className="mb-5">
          <Panel title="New market stat">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <StatFields draft={draft} setDraft={setDraft} />
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
                    setDraft(EMPTY)
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
        {loading && stats.length === 0 ? (
          <Loading />
        ) : stats.length === 0 ? (
          <Empty title="No stats yet" detail="The market band is hidden until at least one exists." />
        ) : (
          <ul className="divide-y divide-line">
            {stats.map((row) => (
              <li key={row.id} className="p-5">
                {editing === row.id ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <StatFields draft={edit} setDraft={setEdit} />
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
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-gold-400">
                        <Icon name={row.icon ?? 'TrendingUp'} className="size-5" strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-2xl leading-none font-semibold text-ink">
                          {row.value}
                        </p>
                        <p className="mt-1.5 font-semibold text-ink">{row.label}</p>
                        {row.detail && (
                          <p className="mt-0.5 text-[0.875rem] text-ink-soft">{row.detail}</p>
                        )}
                        {row.source && (
                          <p className="mt-1 text-[0.75rem] text-ink-faint">Source: {row.source}</p>
                        )}
                        <p className="mt-2 font-mono text-[0.6875rem] text-ink-faint">
                          {row.key} · order {row.display_order}
                          {!row.is_active && ' · hidden'}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {!row.is_active && <Badge tone="neutral">hidden</Badge>}
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
                            api.patch(`/admin/market-stats/${row.id}`, { is_active: !row.is_active }),
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
                      {canDelete && (
                        <button
                          type="button"
                          title="Delete permanently"
                          onClick={() => {
                            if (!window.confirm(`Delete "${row.label}" permanently?`)) return
                            void run(row.id, () => api.delete(`/admin/market-stats/${row.id}`))
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

function StatFields({
  draft,
  setDraft,
}: {
  draft: typeof EMPTY
  setDraft: React.Dispatch<React.SetStateAction<typeof EMPTY>>
}) {
  const set = (key: keyof typeof EMPTY) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }))

  return (
    <>
      <Field label="Figure" hint="Shown large, exactly as typed — e.g. 400,000+ or 15–20%.">
        <input className={FIELD} value={draft.value} onChange={(e) => set('value')(e.target.value)} />
      </Field>
      <Field label="Label">
        <input className={FIELD} value={draft.label} onChange={(e) => set('label')(e.target.value)} />
      </Field>
      <Field label="Detail" hint="The smaller line beneath.">
        <input className={FIELD} value={draft.detail} onChange={(e) => set('detail')(e.target.value)} />
      </Field>
      <Field label="Icon" hint="A lucide icon name, e.g. Home, TrendingUp, Wallet, Users.">
        <input className={FIELD} value={draft.icon} onChange={(e) => set('icon')(e.target.value)} />
      </Field>
      <Field label="Source" hint="Optional attribution.">
        <input className={FIELD} value={draft.source} onChange={(e) => set('source')(e.target.value)} />
      </Field>
      <Field label="Display order">
        <input
          className={FIELD}
          inputMode="numeric"
          value={draft.display_order}
          onChange={(e) => set('display_order')(e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Key" hint="Stable identifier; left blank it is built from the label.">
          <input className={cn(FIELD, 'font-mono')} value={draft.key} onChange={(e) => set('key')(e.target.value)} />
        </Field>
      </div>
    </>
  )
}
