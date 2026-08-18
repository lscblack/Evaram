import { useState } from 'react'
import { Building2, Plus, Search, Trash2, User } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorNote,
  FIELD,
  Field,
  Loading,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/admin/ui'
import { ClientDrawer } from '@/components/admin/ClientDrawer'
import { api, qs } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { invalidate, useQuery } from '@/lib/queries'
import { cn, formatCompactCurrency } from '@/lib/utils'
import type {
  AdminUser,
  ApiClient,
  ApiCommission,
  ApiInvestment,
  ClientOption,
  CommissionStatus,
  Page,
} from '@/types/api'

type Tab = 'clients' | 'commissions' | 'investments' | 'past'

const TABS: { id: Tab; label: string }[] = [
  { id: 'clients', label: 'Clients' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'investments', label: 'Investments' },
  { id: 'past', label: 'Record a past sale' },
]

const STATUS_TONE: Record<CommissionStatus, 'warn' | 'good' | 'info' | 'neutral'> = {
  pending: 'warn',
  invoiced: 'info',
  received: 'good',
  written_off: 'neutral',
}

/**
 * The commercial side of the console: who we deal with, what we earned, what we
 * put in, and deals that closed before the system existed.
 */
export default function DealsAdminPage() {
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('clients')

  return (
    <>
      <PageHeader
        title="Clients & deals"
        description="Everyone we transact with, the commission ledger, and what we have invested."
      />

      <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors',
              t.id === tab
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'clients' && <ClientsTab canDelete={can('super_admin')} />}
      {tab === 'commissions' && <CommissionsTab canDelete={can('super_admin')} />}
      {tab === 'investments' && <InvestmentsTab canDelete={can('super_admin')} />}
      {tab === 'past' && <PastSaleTab />}
    </>
  )
}

/* -------------------------------------------------------------- clients */

function ClientsTab({ canDelete }: { canDelete: boolean }) {
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('')
  const [editing, setEditing] = useState<ApiClient | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const path = `/admin/clients${qs({ q: search || undefined, kind: kind || undefined, per_page: 48 })}`
  const { data, loading, refetch } = useQuery<Page<ApiClient>>(path, { ttl: 0 })
  const rows = data?.items ?? []

  const remove = async (row: ApiClient) => {
    if (!window.confirm(`Delete ${row.display_name}? Deactivating keeps their history.`)) return
    setError(null)
    try {
      await api.delete(`/admin/clients/${row.id}`)
      invalidate('/admin/clients')
      void refetch()
    } catch (err) {
      // A client attached to deals cannot be deleted — the API explains why.
      setError(err instanceof Error ? err.message : 'That client could not be deleted.')
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <label htmlFor="client-q" className="sr-only">
            Search clients
          </label>
          <input
            id="client-q"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, email, TIN or national ID"
            className={cn(FIELD, 'pl-9')}
          />
        </div>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={cn(FIELD, 'w-auto')}>
          <option value="">Everyone</option>
          <option value="individual">Individuals</option>
          <option value="company">Companies</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas"
        >
          <Plus className="size-4" strokeWidth={2.4} />
          Add client
        </button>
      </div>

      <Panel>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No clients yet" detail="Add the people and companies you trade with." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Contact</Th>
                <Th>Where</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    setEditing(row)
                    setOpen(true)
                  }}
                  className="cursor-pointer transition-colors hover:bg-canvas-alt"
                >
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-canvas-alt text-ink-soft">
                        {row.kind === 'company' ? (
                          <Building2 className="size-4" />
                        ) : (
                          <User className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{row.display_name}</span>
                        <span className="block text-[0.75rem] text-ink-muted">
                          {row.kind === 'company'
                            ? row.tin
                              ? `TIN ${row.tin}`
                              : 'Company'
                            : row.national_id ?? 'Individual'}
                        </span>
                      </span>
                      {!row.is_active && <Badge tone="neutral">inactive</Badge>}
                    </div>
                  </Td>
                  <Td>
                    <p className="text-ink">{row.phone ?? '—'}</p>
                    <p className="text-[0.75rem] text-ink-muted">{row.email ?? ''}</p>
                  </Td>
                  <Td className="text-ink-soft">{row.district ?? row.country ?? '—'}</Td>
                  <Td className="text-right">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void remove(row)
                        }}
                        title="Delete"
                        className="grid size-9 place-items-center rounded-lg border border-line text-ink-faint transition-colors hover:border-red-300 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2.2} />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <ClientDrawer
        client={editing}
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          invalidate('/admin/clients')
          void refetch()
        }}
      />
    </>
  )
}

/* ---------------------------------------------------------- commissions */

function CommissionsTab({ canDelete }: { canDelete: boolean }) {
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)

  const path = `/admin/commissions${qs({ status: status || undefined, per_page: 48 })}`
  const { data, loading, refetch } = useQuery<Page<ApiCommission>>(path, { ttl: 0 })
  const { data: summary } = useQuery<{
    earned_total: number
    received_total: number
    pending_total: number
  }>('/admin/commissions/summary', { ttl: 0 })
  const rows = data?.items ?? []

  const act = async (run: () => Promise<unknown>) => {
    setError(null)
    try {
      await run()
      invalidate('/admin/commissions')
      void refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      {summary && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Money label="Earned" value={summary.earned_total} />
          <Money label="Received" value={summary.received_total} tone="good" />
          <Money label="Outstanding" value={summary.pending_total} tone="warn" />
        </div>
      )}

      <div className="mb-4 flex gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={cn(FIELD, 'w-auto')}>
          <option value="">All statuses</option>
          {(['pending', 'invoiced', 'received', 'written_off'] as const).map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <Panel>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty
            title="No commissions booked"
            detail="They appear here when a sale is recorded, or when you add one by hand."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Earned</Th>
                <Th>From</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-canvas-alt">
                  <Td className="whitespace-nowrap text-ink-soft">{row.earned_on}</Td>
                  <Td>
                    <p className="font-semibold text-ink">{row.client_name ?? '—'}</p>
                    <p className="text-[0.75rem] text-ink-muted">
                      {[row.property_reference, row.agent_name].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </Td>
                  <Td className="tabular-nums">
                    <p className="font-semibold text-ink">
                      {formatCompactCurrency(row.amount, row.currency)}
                    </p>
                    {row.basis === 'percent' && row.rate != null && (
                      <p className="text-[0.75rem] text-ink-muted">
                        {row.rate}% of{' '}
                        {row.base_amount ? formatCompactCurrency(row.base_amount, row.currency) : '—'}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[row.status]}>{row.status.replace('_', ' ')}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <label htmlFor={`cs-${row.id}`} className="sr-only">
                        Change status
                      </label>
                      <select
                        id={`cs-${row.id}`}
                        value={row.status}
                        onChange={(e) =>
                          void act(() =>
                            api.patch(`/admin/commissions/${row.id}`, { status: e.target.value }),
                          )
                        }
                        className="h-9 rounded-lg border border-line bg-canvas px-2 text-[0.75rem] text-ink"
                      >
                        {(['pending', 'invoiced', 'received', 'written_off'] as const).map((s) => (
                          <option key={s} value={s}>
                            {s.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm('Delete this commission entry?')) return
                            void act(() => api.delete(`/admin/commissions/${row.id}`))
                          }}
                          className="grid size-9 place-items-center rounded-lg border border-line text-ink-faint hover:border-red-300 hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" strokeWidth={2.2} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  )
}

/* ---------------------------------------------------------- investments */

const INVESTMENT_KINDS = ['acquisition', 'renovation', 'construction', 'fees', 'marketing', 'other']

function InvestmentsTab({ canDelete }: { canDelete: boolean }) {
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState({
    label: '',
    kind: 'acquisition',
    amount: '',
    spent_on: '',
    client_id: '',
    reference: '',
  })

  const { data, loading, refetch } = useQuery<Page<ApiInvestment>>('/admin/investments?per_page=48', {
    ttl: 0,
  })
  const { data: clients } = useQuery<ClientOption[]>('/admin/clients/options')
  const rows = data?.items ?? []

  const create = async () => {
    setError(null)
    try {
      await api.post('/admin/investments', {
        label: draft.label,
        kind: draft.kind,
        amount: Number(draft.amount || 0),
        spent_on: draft.spent_on,
        client_id: draft.client_id || null,
        reference: draft.reference || null,
      })
      setDraft({ label: '', kind: 'acquisition', amount: '', spent_on: '', client_id: '', reference: '' })
      setAdding(false)
      invalidate('/admin/investments')
      void refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not save.')
    }
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Money label="Total on this page" value={total} />
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas"
        >
          <Plus className="size-4" strokeWidth={2.4} />
          Record spend
        </button>
      </div>

      {adding && (
        <div className="mb-5">
          <Panel title="New investment">
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="What was it for">
                  <input
                    className={FIELD}
                    value={draft.label}
                    onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                  />
                </Field>
              </div>
              <Field label="Kind">
                <select
                  className={FIELD}
                  value={draft.kind}
                  onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value }))}
                >
                  {INVESTMENT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount (RWF)">
                <input
                  className={FIELD}
                  inputMode="numeric"
                  value={draft.amount}
                  onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                />
              </Field>
              <Field label="Spent on">
                <input
                  type="date"
                  className={FIELD}
                  value={draft.spent_on}
                  onChange={(e) => setDraft((d) => ({ ...d, spent_on: e.target.value }))}
                />
              </Field>
              <Field label="Client (optional)">
                <select
                  className={FIELD}
                  value={draft.client_id}
                  onChange={(e) => setDraft((d) => ({ ...d, client_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => void create()}
                  className="h-11 rounded-xl bg-ink px-4 text-[0.875rem] font-semibold text-canvas"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
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
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="Nothing recorded" detail="Track what you put into a property here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>What</Th>
                <Th>Amount</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-canvas-alt">
                  <Td className="whitespace-nowrap text-ink-soft">{row.spent_on}</Td>
                  <Td>
                    <p className="font-semibold text-ink">{row.label}</p>
                    <p className="text-[0.75rem] text-ink-muted">
                      {[row.kind, row.property_reference, row.client_name].filter(Boolean).join(' · ')}
                    </p>
                  </Td>
                  <Td className="font-semibold tabular-nums text-ink">
                    {formatCompactCurrency(row.amount, row.currency)}
                  </Td>
                  <Td className="text-right">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm('Delete this entry?')) return
                          await api.delete(`/admin/investments/${row.id}`)
                          invalidate('/admin/investments')
                          void refetch()
                        }}
                        className="grid size-9 place-items-center rounded-lg border border-line text-ink-faint hover:border-red-300 hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2.2} />
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  )
}

/* ------------------------------------------------------------ past sale */

function PastSaleTab() {
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({
    reference_number: '',
    title: '',
    upi: '',
    district: '',
    size: '',
    sold_price: '',
    sold_at: '',
    seller_client_id: '',
    buyer_client_id: '',
    agent_id: '',
    commission_basis: 'percent',
    commission_rate: '',
    commission_amount: '',
    notes: '',
  })

  const { data: clients } = useQuery<ClientOption[]>('/admin/clients/options')
  const { data: staff } = useQuery<Page<AdminUser>>('/admin/users?per_page=50')
  const agents = (staff?.items ?? []).filter((u) => u.role === 'agent' || u.role === 'admin')

  const set = (key: keyof typeof draft) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const submit = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const result = await api.post<{ detail: string }>('/admin/past-sales', {
        reference_number: draft.reference_number,
        title: draft.title,
        upi: draft.upi || null,
        district: draft.district || null,
        size: draft.size ? Number(draft.size) : null,
        sold_price: draft.sold_price ? Number(draft.sold_price) : null,
        // The API wants a timestamp; a date input gives a plain day.
        sold_at: draft.sold_at ? `${draft.sold_at}T00:00:00` : null,
        seller_client_id: draft.seller_client_id || null,
        buyer_client_id: draft.buyer_client_id || null,
        agent_id: draft.agent_id || null,
        notes: draft.notes || null,
        commission_basis: draft.commission_rate || draft.commission_amount ? draft.commission_basis : null,
        commission_rate: draft.commission_rate ? Number(draft.commission_rate) : null,
        commission_amount: draft.commission_amount ? Number(draft.commission_amount) : null,
      })
      setDone(result.detail)
      setDraft((d) => ({ ...d, reference_number: '', title: '', upi: '', sold_price: '', commission_rate: '' }))
      invalidate('/admin/commissions')
      invalidate('/admin/clients')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That sale was not recorded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="A deal that closed before the system existed">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <p className="sm:col-span-2 rounded-xl border border-line bg-canvas-alt px-3.5 py-2.5 text-[0.8125rem] text-ink-muted">
          Recorded as historic, so it counts in a client's history without appearing in this
          month's figures. Fill in the commission and it is booked as received at the same time.
        </p>

        <Field label="Reference">
          <input className={FIELD} value={draft.reference_number} onChange={(e) => set('reference_number')(e.target.value)} />
        </Field>
        <Field label="What was sold">
          <input className={FIELD} value={draft.title} onChange={(e) => set('title')(e.target.value)} />
        </Field>
        <Field label="UPI">
          <input className={FIELD} value={draft.upi} onChange={(e) => set('upi')(e.target.value)} />
        </Field>
        <Field label="District">
          <input className={FIELD} value={draft.district} onChange={(e) => set('district')(e.target.value)} />
        </Field>
        <Field label="Size (sqm)">
          <input className={FIELD} inputMode="numeric" value={draft.size} onChange={(e) => set('size')(e.target.value)} />
        </Field>
        <Field label="Sold for (RWF)">
          <input className={FIELD} inputMode="numeric" value={draft.sold_price} onChange={(e) => set('sold_price')(e.target.value)} />
        </Field>
        <Field label="Sold on">
          <input type="date" className={FIELD} value={draft.sold_at} onChange={(e) => set('sold_at')(e.target.value)} />
        </Field>
        <Field label="Agent who closed it">
          <select className={FIELD} value={draft.agent_id} onChange={(e) => set('agent_id')(e.target.value)}>
            <option value="">—</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Seller" hint="Their history builds from this.">
          <select className={FIELD} value={draft.seller_client_id} onChange={(e) => set('seller_client_id')(e.target.value)}>
            <option value="">—</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Buyer">
          <select className={FIELD} value={draft.buyer_client_id} onChange={(e) => set('buyer_client_id')(e.target.value)}>
            <option value="">—</option>
            {(clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Commission basis">
          <select className={FIELD} value={draft.commission_basis} onChange={(e) => set('commission_basis')(e.target.value)}>
            <option value="percent">Percent of the sale</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </Field>
        {draft.commission_basis === 'percent' ? (
          <Field label="Rate (%)" hint="Leave blank to skip booking a commission.">
            <input className={FIELD} inputMode="decimal" value={draft.commission_rate} onChange={(e) => set('commission_rate')(e.target.value)} />
          </Field>
        ) : (
          <Field label="Amount (RWF)" hint="Leave blank to skip booking a commission.">
            <input className={FIELD} inputMode="numeric" value={draft.commission_amount} onChange={(e) => set('commission_amount')(e.target.value)} />
          </Field>
        )}

        <div className="sm:col-span-2">
          <Field label="Notes">
            <textarea rows={2} className={cn(FIELD, 'h-auto py-2.5')} value={draft.notes} onChange={(e) => set('notes')(e.target.value)} />
          </Field>
        </div>

        {error && (
          <div className="sm:col-span-2">
            <ErrorNote message={error} />
          </div>
        )}
        {done && (
          <p className="sm:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.875rem] text-emerald-700">
            {done}
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className="h-11 rounded-xl bg-ink px-5 text-[0.875rem] font-semibold text-canvas disabled:opacity-50"
          >
            {busy ? 'Recording…' : 'Record past sale'}
          </button>
        </div>
      </div>
    </Panel>
  )
}

function Money({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">{label}</p>
      <p
        className={cn(
          'mt-1 font-display text-2xl font-semibold tabular-nums',
          tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-gold-600' : 'text-ink',
        )}
      >
        {formatCompactCurrency(value)}
      </p>
    </div>
  )
}
