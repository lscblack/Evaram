import { useState } from 'react'
import { Info } from 'lucide-react'
import { api, ApiError } from '@/shared/api/client'
import type { PaymentOut } from '@/shared/api/types'
import { todayISO } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { Field, FormError, FormGrid, Input, Select, Textarea } from '@/shared/ui/Form'
import { amountError, usePaymentMethods } from './components'

/** Correct a pending or approved payment (amount, date, method, reference, months, notes). */
export function EditPaymentDialog({ payment: p, onClose }: { payment: PaymentOut; onClose: () => void }) {
  const methods = usePaymentMethods()
  const [amount, setAmount] = useState(p.amount.replace(/\.00$/, ''))
  const [date, setDate] = useState(p.payment_date)
  const [method, setMethod] = useState(p.method_code)
  const [reference, setReference] = useState(p.transaction_reference)
  const [notes, setNotes] = useState(p.notes)
  const [months, setMonths] = useState(p.months_covered ?? 1)
  const [touched, setTouched] = useState(false)
  const approved = p.status === 'approved'

  const amountErr = amountError(amount, p.currency)
  const dateErr = !date ? 'Choose the payment date' : date > todayISO() ? 'Payment date cannot be in the future' : null

  const save = useApiMutation(
    () =>
      api.patch<PaymentOut>(`/payments/${p.id}`, {
        amount: amount.trim(),
        payment_date: date,
        method_code: method,
        transaction_reference: reference.trim(),
        notes,
        months_covered: months > 1 ? months : null,
      }),
    {
      success: `Payment ${p.payment_number} updated`,
      invalidate: [['payments'], ['invoices'], ['dashboard'], ['agreements'], ['tenants'], ['reports'], ['badge', 'approvals']],
      onSuccess: onClose,
    },
  )
  const dupRef = save.error instanceof ApiError && save.error.code === 'duplicate_reference'

  function submit() {
    setTouched(true)
    if (amountErr || dateErr || !method) return
    save.mutate(undefined)
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Edit ${p.payment_number}`}
      description={`${p.tenant_name} · ${p.unit_code}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button onClick={submit} loading={save.isPending} block className="sm:w-auto">
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {approved ? (
          <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>This payment is approved. Changing the amount or months takes it off its invoices and applies it again — chosen months first, then the oldest open invoices.</p>
          </div>
        ) : null}
        <FormGrid>
          <Field label={`Amount received (${p.currency})`} required error={touched ? amountErr ?? undefined : undefined}>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-invalid={touched && !!amountErr} />
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
          <Field label="Transaction reference" error={dupRef ? 'This reference is already recorded' : undefined}>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} aria-invalid={dupRef} />
          </Field>
          <Field label="Months this payment covers" hint="More than one month: the next unpaid months are paid oldest first.">
            <Select value={months} onChange={(e) => setMonths(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? '1 month / as applied' : `${n} months`}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <Field label="Internal notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
        <FormError message={dupRef ? null : save.errorText} />
      </div>
    </Dialog>
  )
}
