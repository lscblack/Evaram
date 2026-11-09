import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, Check, Paperclip, X } from 'lucide-react'
import { api, errorMessage, openFile } from '@/shared/api/client'
import type { Page, PaymentOut } from '@/shared/api/types'
import { formatDate, relativeTime } from '@/shared/lib/format'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { CurrencyAmounts, Money } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { DuplicateWarning } from './components'
import { PaymentReviewDialogs, type ReviewMode } from './PaymentReview'

export default function ApprovalsPage() {
  const [active, setActive] = useState<{ p: PaymentOut; mode: ReviewMode } | null>(null)
  const q = useQuery({
    queryKey: ['payments', 'pending-queue'],
    queryFn: () => api.get<Page<PaymentOut>>('/payments', { status: 'pending', page_size: 100 }),
    refetchInterval: 60_000,
  })
  const items = q.data?.items ?? []
  const totals = Object.entries(
    items.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.currency]: (acc[p.currency] ?? 0) + Number(p.amount) }), {}),
  ).map(([currency, amount]) => ({ currency, amount: String(amount) }))

  return (
    <>
      <PageHeader
        title="Pending approvals"
        description="Check each payment against the actual MoMo, bank or cash evidence before approving. Only approved payments change balances."
        meta={items.length ? <span className="text-sm text-slate-600">{items.length} waiting · <CurrencyAmounts items={totals} className="inline-flex flex-row gap-2" /></span> : undefined}
      />
      {q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : q.isLoading ? (
        <SkeletonRows rows={3} />
      ) : !items.length ? (
        <Card>
          <EmptyState icon={BadgeCheck} title="All payments reviewed" description="Newly recorded payments will appear here for approval." />
        </Card>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {items.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={`/admin/tenants/${p.tenant_id}`} className="text-base font-semibold text-slate-900 hover:underline">
                      {p.tenant_name}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {p.unit_code} · {p.property_name}
                    </p>
                  </div>
                  <Link to={`/admin/finance/payments/${p.id}`} className="shrink-0 text-xs font-medium text-brand-700 hover:underline">
                    {p.payment_number}
                  </Link>
                </div>
                <Money amount={p.amount} currency={p.currency} className="mt-3 block text-3xl font-bold tracking-tight text-slate-900" />
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">Method</dt>
                    <dd className="font-medium text-slate-900">{p.method_label}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Paid on</dt>
                    <dd className="font-medium text-slate-900">{formatDate(p.payment_date)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Reference</dt>
                    <dd className="break-all font-mono text-sm text-slate-900">{p.transaction_reference || '—'}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Recorded</dt>
                    <dd className="text-slate-700">
                      {p.recorded_by ?? 'Unknown'} · {relativeTime(p.created_at)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">Apply to</dt>
                    <dd className="text-slate-700">
                      {p.allocations.length
                        ? p.allocations.map((a) => (
                            <span key={a.invoice_id} className="mr-2 inline-block">
                              {a.invoice_number} (<Money amount={a.amount} currency={p.currency} />)
                            </span>
                          ))
                        : 'Oldest open invoices automatically'}
                    </dd>
                  </div>
                  {p.notes ? (
                    <div className="col-span-2">
                      <dt className="text-slate-500">Notes</dt>
                      <dd className="whitespace-pre-line text-slate-700">{p.notes}</dd>
                    </div>
                  ) : null}
                </dl>
                <DuplicateWarning numbers={p.possible_duplicate_of ?? []} className="mt-3" />
                {p.has_evidence ? (
                  <Button
                    variant="outline"
                    icon={Paperclip}
                    block
                    className="mt-3"
                    onClick={() => openFile(`/payments/${p.id}/evidence`).catch((e) => toast.error(errorMessage(e)))}
                  >
                    View evidence
                  </Button>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No evidence attached — confirm receipt directly.</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="danger" size="lg" icon={X} className="h-12" onClick={() => setActive({ p, mode: 'reject' })}>
                    Reject
                  </Button>
                  <Button variant="success" size="lg" icon={Check} className="h-12" onClick={() => setActive({ p, mode: 'approve' })}>
                    Approve
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <PaymentReviewDialogs payment={active?.p ?? null} mode={active?.mode ?? null} onClose={() => setActive(null)} />
    </>
  )
}
