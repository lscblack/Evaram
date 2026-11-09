import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, CalendarRange, Info, Paperclip } from 'lucide-react'
import { api, ApiError } from '@/shared/api/client'
import type { AgreementOut, CoverageOut, InvoiceOut, Page, PaymentOut } from '@/shared/api/types'
import { formatDate, formatMoney, todayISO } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { useAuth } from '@/shared/auth/AuthProvider'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Checkbox, Field, FormError, FormGrid, Input, Select, Textarea } from '@/shared/ui/Form'
import { AgreementPicker, amountError, usePaymentMethods } from './components'

export function RecordPaymentDialog({
  open,
  onClose,
  agreementId,
  invoiceId,
  onRecorded,
}: {
  open: boolean
  onClose: () => void
  agreementId?: number | null
  invoiceId?: number | null
  onRecorded?: (p: PaymentOut) => void
}) {
  const [agreement, setAgreement] = useState<AgreementOut | null>(null)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [alloc, setAlloc] = useState<Record<number, string>>({})
  const [touched, setTouched] = useState(false)
  const [months, setMonths] = useState(1)
  const [autoAmount, setAutoAmount] = useState<string | null>(null)
  const methods = usePaymentMethods()

  // Reset when the dialog closes (not on open: the agreement picker may
  // prefill the agreement in its own mount effect, which runs first).
  useEffect(() => {
    if (!open) {
      setAgreement(null)
      setAmount('')
      setDate(todayISO())
      setReference('')
      setNotes('')
      setFile(null)
      setAlloc({})
      setTouched(false)
      setMonths(1)
      setAutoAmount(null)
    }
  }, [open])
  useEffect(() => {
    if (!method && methods.data?.length) setMethod(methods.data[0].code)
  }, [methods.data, method])

  const invoices = useQuery({
    queryKey: ['invoices', 'open-for', agreement?.id],
    queryFn: () => api.get<Page<InvoiceOut>>('/invoices', { agreement_id: agreement!.id, open_only: true, page_size: 50 }),
    enabled: !!agreement,
  })

  // Several months at once: the server lists the next unpaid months and their rent.
  const coverage = useQuery({
    queryKey: ['payments', 'coverage', agreement?.id, months],
    queryFn: () => api.get<CoverageOut>('/payments/coverage', { agreement_id: agreement!.id, months }),
    enabled: !!agreement && months > 1,
  })
  const coverageTotal = months > 1 ? coverage.data?.total.replace(/\.00$/, '') : undefined
  useEffect(() => {
    // Fill the amount with the months' total unless the user typed their own.
    if (!coverageTotal) return
    setAmount((a) => (a === '' || a === autoAmount ? coverageTotal : a))
    setAutoAmount(coverageTotal)
  }, [coverageTotal])
  const monthsShort = months > 1 && coverage.data ? coverage.data.available < months : false

  // Prefill allocation for the invoice the dialog was opened from.
  useEffect(() => {
    if (!invoiceId || !invoices.data) return
    const inv = invoices.data.items.find((i) => i.id === invoiceId)
    if (inv) {
      setAlloc({ [inv.id]: inv.balance_due })
      setAmount((a) => a || inv.balance_due.replace(/\.00$/, ''))
    }
  }, [invoiceId, invoices.data])

  const currency = agreement?.currency ?? 'RWF'
  const amountErr = amountError(amount, currency)
  const allocEntries = months > 1 ? [] : Object.entries(alloc).filter(([, v]) => v.trim() !== '')
  const allocErrs = useMemo(() => {
    const errs: Record<string, string> = {}
    for (const [id, v] of allocEntries) {
      const e = amountError(v, currency)
      const inv = invoices.data?.items.find((i) => String(i.id) === id)
      if (e) errs[id] = e
      else if (inv && Number(v) > Number(inv.balance_due)) errs[id] = 'More than the balance due'
    }
    return errs
  }, [allocEntries, currency, invoices.data])
  const allocTotal = allocEntries.reduce((s, [, v]) => s + (Number(v) || 0), 0)
  const allocOver = !amountErr && allocTotal > Number(amount)
  const dateErr = !date ? 'Choose the payment date' : date > todayISO() ? 'Payment date cannot be in the future' : null

  // Approvers can approve as they record (on by default); others record as pending.
  const { can } = useAuth()
  const canApprove = can('payments.approve')
  const [autoApprove, setAutoApprove] = useState(true)
  const approveNow = canApprove && autoApprove

  const record = useApiMutation(
    () => {
      const fd = new FormData()
      fd.set('agreement_id', String(agreement!.id))
      fd.set('amount', amount.trim())
      fd.set('currency', currency)
      fd.set('payment_date', date)
      fd.set('method_code', method)
      fd.set('transaction_reference', reference.trim())
      fd.set('notes', notes.trim())
      fd.set('allocations', JSON.stringify(allocEntries.map(([id, v]) => ({ invoice_id: Number(id), amount: v.trim() }))))
      if (file) fd.set('evidence', file)
      if (approveNow) fd.set('auto_approve', 'true')
      if (months > 1) fd.set('months_covered', String(months))
      return api.upload<PaymentOut>('/payments', fd)
    },
    {
      success: (p) =>
        p.status === 'approved'
          ? `Payment ${p.payment_number} recorded and approved`
          : approveNow && p.possible_duplicate_of?.length
            ? `Payment ${p.payment_number} kept pending — it looks like ${p.possible_duplicate_of.join(', ')}. Check it in Pending Approvals.`
            : `Payment ${p.payment_number} recorded — awaiting approval`,
      invalidate: [['payments'], ['badge', 'approvals'], ['invoices'], ['dashboard'], ['agreements'], ['tenants'], ['reports']],
      onSuccess: (p) => {
        onRecorded?.(p)
        onClose()
      },
    },
  )
  const dupRef = record.error instanceof ApiError && record.error.code === 'duplicate_reference'

  function submit() {
    setTouched(true)
    if (!agreement || amountErr || dateErr || allocOver || Object.keys(allocErrs).length || !method || monthsShort) return
    record.mutate(undefined)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record payment received"
      description="MTN MoMo, Airtel Money, bank transfer, cash or another configured method."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button onClick={submit} loading={record.isPending} disabled={!agreement} block className="sm:w-auto">
            {approveNow ? 'Record and approve' : 'Record as pending'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {approveNow ? (
          <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <BadgeCheck className="mt-0.5 size-4 shrink-0" />
            <p>Approved as you record it — invoices and the tenant&rsquo;s balance update straight away. A possible duplicate is still held for review.</p>
          </div>
        ) : (
          <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>Recorded as pending — invoice and tenant balances change only after an approver confirms the money was received.</p>
          </div>
        )}
        {canApprove ? (
          <Checkbox
            label="Approve automatically"
            hint="I have confirmed the money was received. Untick to leave it for someone else to approve."
            checked={autoApprove}
            onChange={(e) => setAutoApprove(e.target.checked)}
          />
        ) : null}
        <Field label="Rental agreement" required>
          <AgreementPicker value={agreement} onChange={setAgreement} initialId={agreementId} />
        </Field>
        {agreement ? (
          <>
            <FormGrid>
              <Field label={`Amount received (${currency})`} required error={touched ? amountErr ?? undefined : undefined} hint={currency === 'RWF' ? 'Whole francs' : 'Up to 2 decimals'}>
                <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={touched && !!amountErr} placeholder={currency === 'RWF' ? '150000' : '650.00'} />
              </Field>
              <Field label="Payment date" required error={touched ? dateErr ?? undefined : undefined}>
                <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Method" required>
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {methods.data?.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Transaction reference" hint="MoMo / bank reference, if any" error={dupRef ? 'This reference is already recorded' : undefined}>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} aria-invalid={dupRef} />
              </Field>
            </FormGrid>
            <Field label="Months this payment covers" hint="Paying ahead? Pick the number of months — their invoices are created and paid oldest first.">
              <Select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '1 month (or choose invoices below)' : `${n} months`}
                  </option>
                ))}
              </Select>
            </Field>
            {months > 1 ? (
              <div className="rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                  <CalendarRange className="size-4 text-brand-600" /> Months paid by this payment
                </div>
                {coverage.isLoading ? (
                  <p className="p-3 text-sm text-slate-500">Working out the months…</p>
                ) : coverage.data ? (
                  <>
                    <ul className="divide-y divide-slate-100 text-sm" aria-label="Months covered">
                      {coverage.data.months.map((m) => (
                        <li key={m.period} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span className="text-slate-800">
                            {m.label}
                            <span className="ml-2 text-xs text-slate-500">{m.invoice_number ?? 'invoice created on approval'}</span>
                          </span>
                          <span className="font-medium tabular-nums text-slate-900">{formatMoney(m.amount_due, coverage.data!.currency)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">Total for {coverage.data.available} month(s)</span>
                      <span className="font-semibold tabular-nums text-slate-900">{formatMoney(coverage.data.total, coverage.data.currency)}</span>
                    </div>
                    {monthsShort ? (
                      <p className="border-t border-slate-200 px-3 py-2 text-sm text-red-600">
                        Only {coverage.data.available} unpaid month(s) remain before this agreement ends.
                      </p>
                    ) : amount && Number(amount) < Number(coverage.data.total) ? (
                      <p className="border-t border-slate-200 px-3 py-2 text-sm text-amber-700">
                        The amount is less than the total: the oldest months are paid first, the last one partly.
                      </p>
                    ) : amount && Number(amount) > Number(coverage.data.total) ? (
                      <p className="border-t border-slate-200 px-3 py-2 text-sm text-slate-600">
                        The extra goes to other open invoices, or is kept as credit.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <div className="p-3">
                    <FormError message={coverage.error ? 'Could not work out the months.' : null} />
                  </div>
                )}
              </div>
            ) : (
            <div>
              <p className="text-sm font-medium text-slate-700">Apply to invoices (optional)</p>
              <p className="mb-2 text-sm text-slate-500">Leave empty to apply automatically to the oldest open invoices{approveNow ? '' : ' when approved'}.</p>
              {invoices.isLoading ? (
                <p className="text-sm text-slate-500">Loading invoices…</p>
              ) : invoices.data?.items.length ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {invoices.data.items.map((inv) => (
                    <li key={inv.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm">
                        <p className="font-medium text-slate-900">{inv.invoice_number}</p>
                        <p className="text-slate-500">
                          Due {formatDate(inv.due_date)} · balance {formatMoney(inv.balance_due, inv.currency)}
                        </p>
                      </div>
                      <div className="sm:w-40">
                        <Input
                          inputMode="decimal"
                          placeholder="0"
                          aria-label={`Amount for ${inv.invoice_number}`}
                          value={alloc[inv.id] ?? ''}
                          onChange={(e) => setAlloc((a) => ({ ...a, [inv.id]: e.target.value }))}
                          aria-invalid={!!allocErrs[inv.id]}
                        />
                        {allocErrs[inv.id] ? <p className="mt-1 text-xs text-red-600">{allocErrs[inv.id]}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No open invoices — the payment will be held as credit.</p>
              )}
              {allocOver ? <p className="mt-2 text-sm text-red-600">Allocations add up to more than the amount received.</p> : null}
            </div>
            )}
            <Field label="Internal notes">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </Field>
            <Field label="Evidence (optional)" hint="Receipt or screenshot — JPEG, PNG, WebP or PDF. Approvers check it before approving.">
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50">
                <Paperclip className="size-4" />
                <span className="truncate">{file ? file.name : 'Attach a file'}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </Field>
          </>
        ) : null}
        <FormError message={record.errorText} />
      </div>
    </Dialog>
  )
}
