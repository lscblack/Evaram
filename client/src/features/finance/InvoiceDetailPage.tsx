import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Ban, Printer, SlidersHorizontal, Wallet } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { InvoiceDetail } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { LOGO, settingText, usePublicSettings } from '@/shared/lib/brand'
import { formatDate, formatDateTime, formatMoney } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { StatusBadge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { ConfirmDialog, Dialog } from '@/shared/ui/Dialog'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Field, FormError, Input, Select, Textarea } from '@/shared/ui/Form'
import { Money } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { amountError, periodLabel } from './components'
import { InvoicePdfButton, WhatsAppInvoiceButton } from './InvoiceShare'
import { RecordPaymentDialog } from './RecordPaymentDialog'
import { DeleteRecordButton } from '@/shared/ui/DeleteRecord'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const [pay, setPay] = useState(false)
  const [adjust, setAdjust] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const settings = usePublicSettings()
  const q = useQuery({ queryKey: ['invoices', 'detail', id], queryFn: () => api.get<InvoiceDetail>(`/invoices/${id}`) })
  const voidMut = useApiMutation((reason: string) => api.post(`/invoices/${id}/void`, { reason }), {
    success: 'Invoice voided',
    invalidate: [['invoices'], ['dashboard']],
    onSuccess: () => setVoiding(false),
  })

  if (q.isLoading) return <FullPageSpinner />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />
  const inv = q.data
  const s = settings.data
  const isVoid = inv.status === 'void'
  const canPay = !isVoid && Number(inv.balance_due) > 0

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          back={{ to: '/admin/finance/invoices', label: 'Invoices' }}
          title={inv.invoice_number}
          meta={
            <>
              <StatusBadge status={inv.status} />
              {inv.days_overdue > 0 ? <span className="text-sm font-medium text-red-600">{inv.days_overdue} days overdue</span> : null}
            </>
          }
          actions={
            <>
              <InvoicePdfButton id={inv.id} number={inv.invoice_number} />
              {!isVoid ? <WhatsAppInvoiceButton id={inv.id} /> : null}
              <Button variant="ghost" icon={Printer} onClick={() => window.print()}>
                Print
              </Button>
              {canPay ? (
                <Can perm="payments.record">
                  <Button icon={Wallet} onClick={() => setPay(true)}>
                    Record payment
                  </Button>
                </Can>
              ) : null}
              {!isVoid ? (
                <Can perm="invoices.manage">
                  <Button variant="outline" icon={SlidersHorizontal} onClick={() => setAdjust(true)}>
                    Adjust
                  </Button>
                  <Button variant="ghost" icon={Ban} onClick={() => setVoiding(true)} className="text-red-700 hover:bg-red-50">
                    Void
                  </Button>
                </Can>
              ) : null}
              <DeleteRecordButton kind="invoice" id={inv.id} name={inv.invoice_number} redirectTo="/admin/finance/invoices" />
            </>
          }
        />
        {Number(inv.pending_amount) > 0 ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {formatMoney(inv.pending_amount, inv.currency)} recorded against this invoice is awaiting approval and is not yet counted as paid.
          </div>
        ) : null}
        {isVoid ? (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm text-slate-700">Voided: {inv.void_reason}</div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-3 print:block">
        {/* Printable invoice */}
        <Card className="lg:col-span-2 print:border-0 print:p-0">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <img src={LOGO.horizontal} alt="" className="h-10 w-auto" />
              <div className="mt-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{settingText(s, 'company.name', 'Evaramu Group Ltd')}</p>
                <p>{settingText(s, 'contact.address')}</p>
                <p>
                  {settingText(s, 'contact.phone')}
                  {settingText(s, 'contact.email') ? ` · ${settingText(s, 'contact.email')}` : ''}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Invoice</p>
              <p className="text-lg font-bold text-slate-900">{inv.invoice_number}</p>
              <p className="mt-1 text-sm text-slate-600">Issued {formatDate(inv.issue_date)}</p>
              <p className="text-sm text-slate-600">Due {formatDate(inv.due_date)}</p>
            </div>
          </div>
          <div className="grid gap-4 border-b border-slate-200 py-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Billed to</p>
              <Link to={`/admin/tenants/${inv.tenant_id}`} className="mt-1 block font-semibold text-slate-900 hover:underline print:no-underline">
                {inv.tenant_name}
              </Link>
              <p className="text-slate-600">Agreement {inv.agreement_number}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Property</p>
              <p className="mt-1 font-semibold text-slate-900">
                {inv.unit_code} · {inv.property_name}
              </p>
              <p className="text-slate-600">{inv.location}</p>
              {inv.kind === 'rent' ? <p className="text-slate-600">Rental period: {periodLabel(inv.period_start, inv.period_end)}</p> : null}
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2.5 font-semibold">Description</th>
                <th className="py-2.5 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inv.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2.5 pr-3 text-slate-800">{it.description}</td>
                  <td className="py-2.5 text-right">
                    <Money amount={it.amount} currency={inv.currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="ml-auto mt-4 max-w-sm space-y-1.5 border-t border-slate-200 pt-4 text-sm">
            <Row label="Amount charged" value={formatMoney(inv.amount_charged, inv.currency)} />
            {Number(inv.amount_credited) > 0 ? <Row label="Credits" value={`− ${formatMoney(inv.amount_credited, inv.currency)}`} /> : null}
            <Row label="Paid (approved)" value={`− ${formatMoney(inv.amount_paid, inv.currency)}`} />
            <Row label="Balance due" value={formatMoney(inv.balance_due, inv.currency)} strong />
            <Row label="Previous outstanding balance" value={formatMoney(inv.previous_balance, inv.currency)} />
            <Row label="Total amount due" value={formatMoney(inv.total_due, inv.currency)} strong />
            <p className="pt-1 text-xs text-slate-500">
              The previous outstanding balance was owed on earlier invoices at the time this invoice was issued; it is not charged twice.
            </p>
          </dl>
          {inv.notes ? <p className="mt-5 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{inv.notes}</p> : null}
        </Card>

        <div className="space-y-5 print:hidden">
          <Card>
            <CardHeader title="Payments applied" />
            {inv.allocations.length ? (
              <ul className="divide-y divide-slate-100">
                {inv.allocations.map((a) => (
                  <li key={`${a.payment_id}`} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <Link to={`/admin/finance/payments/${a.payment_id}`} className="font-medium text-brand-700 hover:underline">
                        {a.payment_number}
                      </Link>
                      <p className="text-slate-500">
                        {a.method} · {formatDate(a.payment_date)}
                      </p>
                      <StatusBadge status={a.payment_status} className="mt-1" />
                    </div>
                    <Money amount={a.amount} currency={inv.currency} className={a.payment_status === 'approved' ? 'font-semibold' : 'text-slate-400 line-through'} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
            )}
          </Card>
          <Card>
            <CardHeader title="Adjustments" />
            {inv.adjustments.length ? (
              <ul className="divide-y divide-slate-100">
                {inv.adjustments.map((a) => (
                  <li key={a.id} className="py-2.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium capitalize">{a.kind}</span>
                      <Money amount={a.amount} currency={a.currency} />
                    </div>
                    <p className="text-slate-600">{a.reason}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No adjustments.</p>
            )}
          </Card>
        </div>
      </div>

      <RecordPaymentDialog open={pay} onClose={() => setPay(false)} agreementId={inv.agreement_id} invoiceId={inv.id} />
      <AdjustmentDialog open={adjust} onClose={() => setAdjust(false)} invoice={inv} />
      <ConfirmDialog
        open={voiding}
        onClose={() => setVoiding(false)}
        onConfirm={(r) => voidMut.mutate(r)}
        title={`Void ${inv.invoice_number}?`}
        description="Voiding cancels the invoice. It is only possible when no payments or credits are attached; otherwise use a credit adjustment."
        confirmLabel="Void invoice"
        tone="danger"
        reason={{ label: 'Reason', required: true }}
        loading={voidMut.isPending}
        error={voidMut.errorText}
      />
    </>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between gap-4 font-semibold text-slate-900' : 'flex justify-between gap-4 text-slate-600'}>
      <dt>{label}</dt>
      <dd className="tabular whitespace-nowrap">{value}</dd>
    </div>
  )
}

function AdjustmentDialog({ open, onClose, invoice }: { open: boolean; onClose: () => void; invoice: InvoiceDetail }) {
  const [kind, setKind] = useState('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const err = amountError(amount, invoice.currency)
  const mut = useApiMutation(() => api.post(`/invoices/${invoice.id}/adjustments`, { kind, amount: amount.trim(), reason: reason.trim() }), {
    success: 'Adjustment recorded',
    invalidate: [['invoices'], ['dashboard']],
    onSuccess: () => {
      setAmount('')
      setReason('')
      setTouched(false)
      onClose()
    },
  })
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add adjustment"
      description="Adjustments are permanent and audited. A credit reduces what the tenant owes; a debit adds a charge."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button
            loading={mut.isPending}
            onClick={() => {
              setTouched(true)
              if (!err && reason.trim().length >= 3) mut.mutate(undefined)
            }}
            block
            className="sm:w-auto"
          >
            Save adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="credit">Credit (reduce balance)</option>
            <option value="debit">Debit (add charge)</option>
          </Select>
        </Field>
        <Field label={`Amount (${invoice.currency})`} required error={touched ? err ?? undefined : undefined}>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Reason" required error={touched && reason.trim().length < 3 ? 'A reason is required' : undefined}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
        </Field>
        <FormError message={mut.errorText} />
      </div>
    </Dialog>
  )
}
