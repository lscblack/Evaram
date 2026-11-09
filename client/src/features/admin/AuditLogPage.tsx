import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ScrollText } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AuditOut, Page } from '@/shared/api/types'
import { formatDateTime, humanize } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { Badge } from '@/shared/ui/Badge'
import { Card, DescriptionList } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Input, Select } from '@/shared/ui/Form'
import { FilterBar, SearchInput } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'

const PAGE_SIZE = 50
const ENTITIES = ['property', 'unit', 'tenant', 'agreement', 'invoice', 'payment', 'payment_method', 'inquiry', 'user', 'role', 'settings']

export default function AuditLogPage() {
  const [state, set] = useUrlState({ search: '', entity_type: '', date_from: '', date_to: '' })
  const [open, setOpen] = useState<AuditOut | null>(null)
  const q = useQuery({
    queryKey: ['audit', state],
    queryFn: () => api.get<Page<AuditOut>>('/audit-logs', { ...state, page_size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<AuditOut>[] = [
    { key: 'at', header: 'Time', cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.at)}</span> },
    { key: 'actor', header: 'By', cell: (r) => r.actor ?? <span className="text-slate-400">System</span> },
    { key: 'action', header: 'Action', cell: (r) => <Badge tone="brand">{r.action}</Badge> },
    { key: 'summary', header: 'Summary', cell: (r) => <span className="line-clamp-2">{r.summary}</span> },
  ]

  return (
    <>
      <PageHeader title="Audit log" description="A permanent record of who changed what. Entries cannot be edited or deleted." />
      <Card padded={false}>
        <FilterBar>
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Search summaries or actions" className="sm:w-72" />
          <Select value={state.entity_type} onChange={(e) => set({ entity_type: e.target.value })} aria-label="Record type" className="sm:w-48">
            <option value="">All record types</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{humanize(e)}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Input type="date" value={state.date_from} onChange={(e) => set({ date_from: e.target.value })} aria-label="From date" />
            <Input type="date" value={state.date_to} onChange={(e) => set({ date_to: e.target.value })} aria-label="To date" />
          </div>
        </FilterBar>
        <DataView
          rows={q.data?.items}
          columns={columns}
          rowKey={(r) => r.id}
          onRowClick={setOpen}
          loading={q.isFetching}
          error={q.error}
          onRetry={q.refetch}
          empty={<EmptyState icon={ScrollText} title="No matching entries" />}
          mobile={(r) => (
            <div>
              <p className="text-sm text-slate-900">{r.summary}</p>
              <p className="mt-1 text-xs text-slate-500">
                {r.actor ?? 'System'} · {formatDateTime(r.at)}
              </p>
            </div>
          )}
          footer={<Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={q.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />}
        />
      </Card>
      <EntryDialog entry={open} onClose={() => setOpen(null)} />
    </>
  )
}

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function EntryDialog({ entry, onClose }: { entry: AuditOut | null; onClose: () => void }) {
  if (!entry) return null
  const changes = Object.entries(entry.changes ?? {})
  return (
    <Dialog open onClose={onClose} title={entry.action} description={formatDateTime(entry.at)} size="lg">
      <div className="space-y-5">
        <p className="text-sm text-slate-800">{entry.summary}</p>
        <DescriptionList
          items={[
            { label: 'By', value: entry.actor ?? 'System' },
            { label: 'Record', value: `${humanize(entry.entity_type)}${entry.entity_id ? ` #${entry.entity_id}` : ''}` },
            { label: 'IP address', value: entry.ip_address ?? '—' },
          ]}
          cols={3}
        />
        {changes.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Changes</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {changes.map(([field, val]) => {
                const fromTo = val && typeof val === 'object' && ('from' in (val as object) || 'to' in (val as object))
                const v = val as { from?: unknown; to?: unknown }
                return (
                  <li key={field} className="px-3 py-2.5 text-sm">
                    <p className="font-medium text-slate-800">{humanize(field)}</p>
                    {fromTo ? (
                      <p className="mt-0.5 break-words text-slate-600">
                        <span className="text-red-700 line-through decoration-red-300">{show(v.from)}</span>
                        <span className="mx-2 text-slate-400">→</span>
                        <span className="text-emerald-700">{show(v.to)}</span>
                      </p>
                    ) : (
                      <p className="mt-0.5 break-words font-mono text-xs text-slate-600">{show(val)}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </Dialog>
  )
}
