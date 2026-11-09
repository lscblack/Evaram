import { useEffect, useState } from 'react'
import { ApiError, api } from '@/shared/api/client'
import type { PaymentOut } from '@/shared/api/types'
import { formatDate, formatMoney } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Button } from '@/shared/ui/Button'
import { ConfirmDialog, Dialog } from '@/shared/ui/Dialog'
import { Checkbox, Field, FormError, Textarea } from '@/shared/ui/Form'
import { DuplicateWarning } from './components'

export type ReviewMode = 'approve' | 'reject' | 'reverse' | null

const INVALIDATE = [['payments'], ['badge', 'approvals'], ['invoices'], ['dashboard'], ['tenants'], ['agreements']]

/** Approve / reject / reverse dialogs for one payment. */
export function PaymentReviewDialogs({
  payment,
  mode,
  onClose,
}: {
  payment: PaymentOut | null
  mode: ReviewMode
  onClose: () => void
}) {
  const [confirmDup, setConfirmDup] = useState(false)
  const [note, setNote] = useState('')
  const [serverDups, setServerDups] = useState<string[]>([])
  useEffect(() => {
    setConfirmDup(false)
    setNote('')
    setServerDups([])
  }, [payment?.id, mode])

  const approve = useApiMutation(
    () => api.post<PaymentOut>(`/payments/${payment!.id}/approve`, { confirm_duplicate: confirmDup, auto_allocate: true, note }),
    {
      success: (p) => `${p.payment_number} approved`,
      invalidate: INVALIDATE,
      onSuccess: onClose,
    },
  )
  useEffect(() => {
    const e = approve.error
    if (e instanceof ApiError && e.code === 'possible_duplicate') {
      setServerDups(((e.details?.payments as string[]) ?? []).slice())
    }
  }, [approve.error])
  const reject = useApiMutation((reason: string) => api.post(`/payments/${payment!.id}/reject`, { reason }), {
    success: 'Payment rejected',
    invalidate: INVALIDATE,
    onSuccess: onClose,
  })
  const reverse = useApiMutation((reason: string) => api.post(`/payments/${payment!.id}/reverse`, { reason }), {
    success: 'Payment reversed — balances recalculated',
    invalidate: INVALIDATE,
    onSuccess: onClose,
  })

  if (!payment) return null
  const dups = serverDups.length ? serverDups : payment.possible_duplicate_of ?? []
  const needsConfirm = dups.length > 0
  const summary = `${formatMoney(payment.amount, payment.currency)} from ${payment.tenant_name} (${payment.unit_code}) via ${payment.method_label} on ${formatDate(payment.payment_date)}`

  return (
    <>
      <Dialog
        open={mode === 'approve'}
        onClose={onClose}
        title={`Approve ${payment.payment_number}?`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={onClose} block className="sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="success"
              size="lg"
              loading={approve.isPending}
              disabled={needsConfirm && !confirmDup}
              onClick={() => approve.mutate(undefined)}
              block
              className="sm:w-auto"
            >
              Approve payment
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-700">{summary}.</p>
          <p className="text-slate-600">
            Only approve after confirming the money actually arrived{payment.transaction_reference ? ` (reference ${payment.transaction_reference})` : ''}. The amount is applied to
            {payment.allocations.length ? ' the selected invoices, any remainder to the oldest open invoices.' : ' the oldest open invoices; any excess is kept as tenant credit.'}
          </p>
          <DuplicateWarning numbers={dups} />
          {needsConfirm ? (
            <Checkbox checked={confirmDup} onChange={(e) => setConfirmDup(e.target.checked)} label="I confirm this is a separate payment, not a duplicate" />
          ) : null}
          <Field label="Approval note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Seen on MoMo statement" />
          </Field>
          <FormError message={approve.error instanceof ApiError && approve.error.code === 'possible_duplicate' ? null : approve.errorText} />
        </div>
      </Dialog>
      <ConfirmDialog
        open={mode === 'reject'}
        onClose={onClose}
        onConfirm={(r) => reject.mutate(r)}
        title={`Reject ${payment.payment_number}?`}
        description={`${summary}. Rejecting does not change any balance.`}
        confirmLabel="Reject payment"
        tone="danger"
        reason={{ label: 'Rejection reason', placeholder: 'e.g. No matching transaction on the MoMo statement', required: true }}
        loading={reject.isPending}
        error={reject.errorText}
      />
      <ConfirmDialog
        open={mode === 'reverse'}
        onClose={onClose}
        onConfirm={(r) => reverse.mutate(r)}
        title={`Reverse ${payment.payment_number}?`}
        description={`${summary}. The payment stays on record as reversed, and every invoice it paid is recalculated — the tenant will owe this amount again.`}
        confirmLabel="Reverse payment"
        tone="danger"
        reason={{ label: 'Reversal reason', placeholder: 'e.g. Bank reversed the transfer', required: true }}
        loading={reverse.isPending}
        error={reverse.errorText}
      />
    </>
  )
}
