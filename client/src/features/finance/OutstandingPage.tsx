import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Download, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { api, downloadFile, errorMessage } from '@/shared/api/client'
import type { OutstandingRow } from '@/shared/api/types'
import { formatDate, formatMoney } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { Button } from '@/shared/ui/Button'
import { Card, StatCard } from '@/shared/ui/Card'
import { DataView, type Column } from '@/shared/ui/DataView'
import { EmptyState } from '@/shared/ui/EmptyState'
import { FilterBar, Money } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { CurrencySelect, PropertySelect } from './components'

const BUCKETS: { key: keyof OutstandingRow; label: string }[] = [
  { key: 'current', label: 'Not yet due' },
  { key: 'd1_30', label: '1–30 days' },
  { key: 'd31_60', label: '31–60 days' },
  { key: 'd61_90', label: '61–90 days' },
  { key: 'd90_plus', label: '90+ days' },
]

/** Sum a field within ONE currency (string decimals → cents to avoid float drift). */
function sumField(rows: OutstandingRow[], field: keyof OutstandingRow) {
  return (rows.reduce((s, r) => s + Math.round(Number(r[field]) * 100), 0) / 100).toFixed(2)
}

export default function OutstandingPage() {
  const [state, set] = useUrlState({ property_id: '', currency: '' })
  const query = { property_id: state.property_id, currency: state.currency }
  const q = useQuery({
    queryKey: ['outstanding', query],
    queryFn: () => api.get<OutstandingRow[]>('/reports/outstanding', query),
  })
  const rows = q.data ?? []
  const currencies = [...new Set(rows.map((r) => r.currency))].sort()

  const columns: Column<OutstandingRow>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (r) => (
        <div>
          <Link to={`/admin/tenants/${r.tenant_id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-900 hover:underline">
            {r.tenant_name}
          </Link>
          <p className="text-slate-500">
            {r.units.join(', ')} · {r.phone}
          </p>
        </div>
      ),
    },
    { key: 'inv', header: 'Invoices', cell: (r) => <span className="tabular">{r.invoices}</span> },
    ...BUCKETS.map((b) => ({
      key: b.key,
      header: b.label,
      align: 'right' as const,
      cell: (r: OutstandingRow) =>
        Number(r[b.key]) ? (
          <Money amount={r[b.key] as string} currency={r.currency} className={b.key === 'current' ? '' : 'text-red-700'} />
        ) : (
          <span className="text-slate-300">—</span>
        ),
    })),
    { key: 'total', header: 'Total', align: 'right', cell: (r) => <Money amount={r.total} currency={r.currency} className="font-semibold text-slate-900" /> },
  ]

  return (
    <>
      <PageHeader
        title="Outstanding balances"
        description="What each tenant still owes, by currency, aged by days past the due date."
        actions={
          <Button
            variant="outline"
            icon={Download}
            onClick={() => downloadFile('/reports/outstanding.csv', query, 'outstanding-balances.csv').catch((e) => toast.error(errorMessage(e)))}
          >
            Export CSV
          </Button>
        }
      />
      {currencies.length ? (
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          {currencies.map((c) => {
            const cr = rows.filter((r) => r.currency === c)
            const overdue = (Number(sumField(cr, 'total')) - Number(sumField(cr, 'current'))).toFixed(2)
            return (
              <StatCard
                key={c}
                label={`Outstanding (${c})`}
                value={formatMoney(sumField(cr, 'total'), c)}
                sub={`${cr.length} tenant${cr.length === 1 ? '' : 's'} · ${formatMoney(overdue, c)} past due`}
                icon={WalletCards}
                tone={Number(overdue) > 0 ? 'danger' : 'brand'}
              />
            )
          })}
        </div>
      ) : null}
      <Card padded={false}>
        <FilterBar>
          <PropertySelect value={state.property_id} onChange={(v) => set({ property_id: v })} className="sm:w-60" />
          <CurrencySelect value={state.currency} onChange={(v) => set({ currency: v })} className="sm:w-40" />
        </FilterBar>
        <DataView
          rows={q.data}
          columns={columns}
          rowKey={(r) => `${r.tenant_id}-${r.currency}`}
          rowHref={(r) => `/admin/tenants/${r.tenant_id}`}
          loading={q.isFetching}
          error={q.error}
          onRetry={q.refetch}
          empty={<EmptyState icon={WalletCards} title="No outstanding balances" description="Every issued invoice is fully paid." />}
          mobile={(r) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{r.tenant_name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {r.units.join(', ')} · oldest due {formatDate(r.oldest_due)}
                  </p>
                </div>
                <Money amount={r.total} currency={r.currency} className="font-semibold text-slate-900" />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {BUCKETS.filter((b) => Number(r[b.key])).map((b) => (
                  <span key={b.key} className={b.key === 'current' ? 'text-slate-500' : 'text-red-700'}>
                    {b.label}: {formatMoney(r[b.key] as string, r.currency)}
                  </span>
                ))}
              </div>
            </div>
          )}
        />
      </Card>
    </>
  )
}
