import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, Paperclip, Undo2, WalletCards, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, errorMessage, openFile } from '@/shared/api/client'
import type { PaymentOut } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { formatDate, formatDateTime } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { StatusBadge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader, DescriptionList } from '@/shared/ui/Card'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Money } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { DuplicateWarning } from './components'
import { PaymentReviewDialogs, type ReviewMode } from './PaymentReview'
import { DeleteRecordButton } from '@/shared/ui/DeleteRecord'

export default function PaymentDetailPage() {
  const { id } = useParams()
  const [mode, setMode] = useState<ReviewMode>(null)
  const q = useQuery({ queryKey: ['payments', 'detail', id], queryFn: () => api.get<PaymentOut>(`/payments/${id}`) })
  const credit = useApiMutation(() => api.post<PaymentOut>(`/payments/${id}/apply-credit`), {
    success: 'Credit applied to open invoices',
    invalidate: [['payments'], ['invoices'], ['dashboard'], ['tenants']],
    toastError: true,
  })
  if (q.isLoading) return <FullPageSpinner />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />
  const p = q.data
  const approved = p.status === 'approved'

  return (
    <>
      <PageHeader
        back={{ to: '/admin/finance/payments', label: 'Payments' }}
        title={p.payment_number}
        meta={<StatusBadge status={p.status} />}
        actions={
          <Can perm="payments.approve">
            {p.status === 'pending' ? (
              <>
                <Button variant="danger" icon={X} onClick={() => setMode('reject')}>
                  Reject
                </Button>
                <Button variant="success" icon={Check} onClick={() => setMode('approve')}>
                  Approve
                </Button>
              </>
            ) : null}
            {approved && Number(p.unapplied_amount) > 0 ? (
              <Button variant="outline" icon={WalletCards} loading={credit.isPending} onClick={() => credit.mutate(undefined)}>
                Apply credit
              </Button>
            ) : null}
            {approved ? (
              <Button variant="outline" icon={Undo2} onClick={() => setMode('reverse')} className="text-red-700">
                Reverse
              </Button>
            ) : null}
            <DeleteRecordButton kind="payment" id={p.id} name={p.payment_number} redirectTo="/admin/finance/payments" />
          </Can>
        }
      />
      <DuplicateWarning numbers={p.possible_duplicate_of ?? []} className="mb-4" />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <Money amount={p.amount} currency={p.currency} className="block text-3xl font-bold tracking-tight text-slate-900" />
            <p className="mt-1 text-sm text-slate-500">
              {p.method_label} · paid {formatDate(p.payment_date)}
            </p>
            <div className="mt-5">
              <DescriptionList
                items={[
                  { label: 'Tenant', value: <Link className="text-brand-700 hover:underline" to={`/admin/tenants/${p.tenant_id}`}>{p.tenant_name}</Link> },
                  { label: 'Agreement', value: <Link className="text-brand-700 hover:underline" to={`/admin/agreements/${p.agreement_id}`}>{p.agreement_number}</Link> },
                  { label: 'Unit', value: `${p.unit_code} · ${p.property_name}` },
                  { label: 'Currency', value: p.currency },
                  ...(p.months_covered ? [{ label: 'Covers', value: `${p.months_covered} months of rent` }] : []),
                  { label: 'Transaction reference', value: p.transaction_reference ? <span className="break-all font-mono">{p.transaction_reference}</span> : '—' },
                  {
                    label: 'Evidence',
                    value: p.has_evidence ? (
                      <Button size="sm" variant="outline" icon={Paperclip} onClick={() => openFile(`/payments/${p.id}/evidence`).catch((e) => toast.error(errorMessage(e)))}>
                        Open evidence
                      </Button>
                    ) : (
                      'None attached'
                    ),
                  },
                  { label: 'Internal notes', value: p.notes ? <span className="whitespace-pre-line">{p.notes}</span> : '—', full: true },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeader
              title={approved ? 'Applied to invoices' : 'Requested allocation'}
              description={
                approved
                  ? `Allocated ${p.allocated_amount}, unapplied credit ${p.unapplied_amount} ${p.currency}`
                  : p.status === 'pending'
                    ? 'Takes effect only when approved. Without an allocation, the oldest open invoices are paid first.'
                    : 'This payment does not count toward any balance.'
              }
            />
            {p.allocations.length ? (
              <ul className="divide-y divide-slate-100">
                {p.allocations.map((a) => (
                  <li key={a.invoice_id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link to={`/admin/finance/invoices/${a.invoice_id}`} className="font-medium text-brand-700 hover:underline">
                      {a.invoice_number}
                    </Link>
                    <Money amount={a.amount} currency={p.currency} className={approved ? 'font-semibold' : 'text-slate-500'} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No invoice allocation.</p>
            )}
          </Card>
        </div>
        <Card>
          <CardHeader title="Review trail" />
          <ol className="space-y-4 text-sm">
            <TrailItem title="Recorded" who={p.recorded_by} at={p.created_at} />
            {p.reviewed_at ? (
              <TrailItem
                title={p.status === 'rejected' ? 'Rejected' : 'Approved'}
                who={p.reviewed_by}
                at={p.reviewed_at}
                detail={p.status === 'rejected' ? p.rejection_reason : undefined}
                tone={p.status === 'rejected' ? 'danger' : 'success'}
              />
            ) : (
              <li className="text-slate-500">Awaiting review</li>
            )}
            {p.reversed_at ? <TrailItem title="Reversed" who={p.reversed_by} at={p.reversed_at} detail={p.reversal_reason} tone="danger" /> : null}
          </ol>
        </Card>
      </div>
      <PaymentReviewDialogs payment={p} mode={mode} onClose={() => setMode(null)} />
    </>
  )
}

function TrailItem({ title, who, at, detail, tone }: { title: string; who: string | null; at: string; detail?: string; tone?: 'success' | 'danger' }) {
  const dot = tone === 'success' ? 'bg-emerald-500' : tone === 'danger' ? 'bg-red-500' : 'bg-brand-500'
  return (
    <li className="flex gap-3">
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot}`} />
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-slate-500">
          {who ?? 'System'} · {formatDateTime(at)}
        </p>
        {detail ? <p className="mt-1 text-slate-700">{detail}</p> : null}
      </div>
    </li>
  )
}
