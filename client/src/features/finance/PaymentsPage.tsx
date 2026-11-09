import { useSearchParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Wallet } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { Page, PaymentOut } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { formatDate } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { StatusBadge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Select } from '@/shared/ui/Form'
import { FilterBar, Money, SearchInput, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { CurrencySelect, DateRange, usePaymentMethods } from './components'
import { RecordPaymentDialog } from './RecordPaymentDialog'

const PAGE_SIZE = 25

export default function PaymentsPage() {
  const [state, set] = useUrlState({ status: 'all', search: '', method_code: '', currency: '', date_from: '', date_to: '', tenant_id: '', agreement_id: '' })
  const [params, setParams] = useSearchParams()
  const recordOpen = params.get('record') === '1'
  const prefillAgreement = params.get('agreement')
  const methods = usePaymentMethods(true)

  const q = useQuery({
    queryKey: ['payments', 'list', state],
    queryFn: () =>
      api.get<Page<PaymentOut>>('/payments', {
        status: state.status === 'all' ? undefined : state.status,
        search: state.search,
        method_code: state.method_code,
        currency: state.currency,
        date_from: state.date_from,
        date_to: state.date_to,
        tenant_id: state.tenant_id,
        agreement_id: state.agreement_id,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  function openRecord(open: boolean) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (open) next.set('record', '1')
        else {
          next.delete('record')
          next.delete('agreement')
        }
        return next
      },
      { replace: true },
    )
  }

  const columns: Column<PaymentOut>[] = [
    { key: 'num', header: 'Payment', cell: (r) => <span className="font-medium text-slate-900">{r.payment_number}</span> },
    { key: 'date', header: 'Date', cell: (r) => formatDate(r.payment_date) },
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (r) => (
        <div>
          <p className="text-slate-900">{r.tenant_name}</p>
          <p className="text-slate-500">{r.unit_code}</p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      cell: (r) => (
        <div>
          <p>{r.method_label}</p>
          {r.transaction_reference ? <p className="max-w-40 truncate font-mono text-xs text-slate-500">{r.transaction_reference}</p> : null}
        </div>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <Money amount={r.amount} currency={r.currency} className="font-semibold text-slate-900" /> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'by', header: 'Recorded by', cell: (r) => <span className="text-slate-500">{r.recorded_by ?? '—'}</span> },
  ]

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment received, with its approval status. Pending payments do not affect balances."
        actions={
          <Can perm="payments.record">
            <Button icon={Plus} onClick={() => openRecord(true)}>
              Record payment
            </Button>
          </Can>
        }
      />
      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs
            value={state.status}
            onChange={(v) => set({ status: v })}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'reversed', label: 'Reversed' },
            ]}
          />
        </div>
        <FilterBar>
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Payment, tenant, reference" className="sm:w-64" />
          <div className="sm:w-48">
            <Select value={state.method_code} onChange={(e) => set({ method_code: e.target.value })} aria-label="Method">
              <option value="">All methods</option>
              {methods.data?.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <CurrencySelect value={state.currency} onChange={(v) => set({ currency: v })} className="sm:w-40" />
          <DateRange from={state.date_from} to={state.date_to} onChange={(v) => set(v)} />
        </FilterBar>
        <DataView
          rows={q.data?.items}
          columns={columns}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/finance/payments/${r.id}`}
          loading={q.isFetching}
          error={q.error}
          onRetry={q.refetch}
          empty={<EmptyState icon={Wallet} title="No payments found" description="Record a payment when money is received from a tenant." />}
          mobile={(r) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{r.tenant_name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {r.method_label} · {formatDate(r.payment_date)} · {r.unit_code}
                  </p>
                </div>
                <Money amount={r.amount} currency={r.currency} className="font-semibold text-slate-900" />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">{r.payment_number}</span>
                <StatusBadge status={r.status} />
              </div>
            </div>
          )}
          footer={<Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={q.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />}
        />
      </Card>
      <RecordPaymentDialog
        open={recordOpen}
        onClose={() => openRecord(false)}
        agreementId={prefillAgreement ? Number(prefillAgreement) : null}
      />
    </>
  )
}
