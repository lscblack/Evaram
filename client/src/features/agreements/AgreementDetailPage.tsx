import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  CirclePlay,
  FileSignature,
  Printer,
  DoorOpen,
  FileX2,
  HandCoins,
  Pencil,
  ReceiptText,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementDetail, AgreementDocumentOut, AgreementDocumentSummary, AgreementTemplateOut, PaymentMethodOut } from '@/shared/api/types'
import { Can, useAuth } from '@/shared/auth/AuthProvider'
import { formatDate, formatDateTime, formatMoney, humanize, todayISO } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge, StatusBadge } from '@/shared/ui/Badge'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Card, CardHeader, DescriptionList } from '@/shared/ui/Card'
import { ConfirmDialog, Dialog } from '@/shared/ui/Dialog'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Checkbox, Field, FormError, FormGrid, Input, Select, Textarea } from '@/shared/ui/Form'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { addDays, ExpiryHint, moneyError, moneyInput, period } from './shared'
import { openPrint } from './documents/DocumentPage'
import { DeleteRecordButton } from '@/shared/ui/DeleteRecord'

type Modal = null | 'edit' | 'activate' | 'cancel' | 'renew' | 'terminate' | 'moveout' | 'deposit'

export default function AgreementDetailPage() {
  const { id } = useParams()
  const { can } = useAuth()
  const [modal, setModal] = useState<Modal>(null)
  const key = ['agreement', id]
  const q = useQuery({ queryKey: key, queryFn: () => api.get<AgreementDetail>(`/agreements/${id}`) })
  const invalidate = [key, ['agreements'], ['units'], ['tenant'], ['tenants']]
  const close = () => setModal(null)

  const activate = useApiMutation(() => api.post<AgreementDetail>(`/agreements/${id}/activate`), {
    success: 'Agreement activated — the unit is now occupied',
    invalidate,
    onSuccess: close,
  })
  const cancel = useApiMutation(
    (reason: string) => api.post<AgreementDetail>(`/agreements/${id}/terminate`, { terminated_on: todayISO(), reason, tenant_vacated: false }),
    { success: 'Draft cancelled', invalidate, onSuccess: close },
  )

  if (q.isLoading) return <FullPageSpinner />
  if (q.error || !q.data) return <ErrorState error={q.error} onRetry={q.refetch} />
  const a = q.data
  const manage = can('agreements.manage')
  const billable = a.status === 'active' || a.status === 'expired'

  return (
    <>
      <PageHeader
        back={{ to: '/admin/agreements', label: 'Rental agreements' }}
        title={`Agreement ${a.agreement_number}`}
        meta={
          <>
            <StatusBadge status={a.status} />
            <ExpiryHint a={a} />
            {a.awaiting_move_out ? <Badge tone="warning">Move-out not yet recorded</Badge> : null}
          </>
        }
        actions={
          <>
            {manage && a.status === 'draft' ? (
              <>
                <Button icon={CirclePlay} onClick={() => setModal('activate')}>
                  Activate
                </Button>
                <Button variant="outline" icon={Pencil} onClick={() => setModal('edit')}>
                  Edit
                </Button>
                <Button variant="ghost" icon={FileX2} onClick={() => setModal('cancel')}>
                  Cancel draft
                </Button>
              </>
            ) : null}
            {manage && a.status === 'active' ? (
              <>
                <Button variant="outline" icon={RefreshCw} onClick={() => setModal('renew')}>
                  Renew
                </Button>
                <Button variant="outline" icon={FileX2} onClick={() => setModal('terminate')}>
                  Terminate
                </Button>
              </>
            ) : null}
            {manage && a.status === 'expired' && !a.renewed_to_id && !a.move_out_date ? (
              <Button variant="outline" icon={RefreshCw} onClick={() => setModal('renew')}>
                Renew
              </Button>
            ) : null}
            {manage && a.awaiting_move_out ? (
              <Button icon={DoorOpen} onClick={() => setModal('moveout')}>
                Record move-out
              </Button>
            ) : null}
            {billable ? (
              <Can perm="payments.record">
                <ButtonLink to={`/admin/finance/payments?record=1&agreement=${a.id}`} variant={a.status === 'active' ? 'primary' : 'outline'} icon={Wallet}>
                  Record payment
                </ButtonLink>
              </Can>
            ) : null}
            <DeleteRecordButton kind="agreement" id={a.id} name={`agreement ${a.agreement_number}`} redirectTo="/admin/agreements" />
          </>
        }
      />

      {a.awaiting_move_out ? (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This tenancy has ended but the tenant has not been recorded as moved out, so unit{' '}
          <Link to={`/admin/units/${a.unit_id}`} className="font-semibold underline">
            {a.unit_code}
          </Link>{' '}
          stays occupied. Record the move-out once the keys are returned.
        </div>
      ) : null}
      {a.move_out_date && a.status !== 'active' ? (
        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          Tenant moved out on {formatDate(a.move_out_date)}. The unit returns to the website only after it is inspected and marked ready on the{' '}
          <Link to={`/admin/units/${a.unit_id}`} className="font-semibold text-brand-700 hover:underline">
            unit page
          </Link>
          .
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Tenancy" />
            <DescriptionList
              items={[
                {
                  label: 'Tenant',
                  value: (
                    <Link to={`/admin/tenants/${a.tenant_id}`} className="font-medium text-brand-700 hover:underline">
                      {a.tenant_name}
                    </Link>
                  ),
                },
                { label: 'Phone', value: <a href={`tel:${a.tenant_phone.replace(/\s/g, '')}`} className="text-brand-700 hover:underline">{a.tenant_phone}</a> },
                {
                  label: 'Unit',
                  value: (
                    <Link to={`/admin/units/${a.unit_id}`} className="font-medium text-brand-700 hover:underline">
                      {a.unit_code} · {a.unit_name}
                    </Link>
                  ),
                },
                {
                  label: 'Property',
                  value: (
                    <Link to={`/admin/properties/${a.property_id}`} className="text-brand-700 hover:underline">
                      {a.property_name}
                    </Link>
                  ),
                },
                { label: 'Location', value: a.location || '—' },
                { label: 'Period', value: period(a) },
                { label: 'Monthly rent', value: <span className="font-semibold tabular">{formatMoney(a.monthly_rent, a.currency)}</span> },
                { label: 'Rent due', value: `Day ${a.due_day} of each month` },
                { label: 'Activated', value: a.activated_at ? formatDate(a.activated_at) : 'Not yet' },
                { label: 'Created', value: formatDate(a.created_at) },
                ...(a.renewed_from_id
                  ? [{ label: 'Renewal of', value: <Link to={`/admin/agreements/${a.renewed_from_id}`} className="text-brand-700 hover:underline">Previous agreement</Link> }]
                  : []),
                ...(a.renewed_to_id
                  ? [{ label: 'Renewed as', value: <Link to={`/admin/agreements/${a.renewed_to_id}`} className="text-brand-700 hover:underline">Current agreement</Link> }]
                  : []),
                ...(a.terminated_on ? [{ label: 'Terminated on', value: formatDate(a.terminated_on) }] : []),
                ...(a.termination_reason ? [{ label: 'Reason', value: a.termination_reason, full: true }] : []),
                ...(a.move_out_date ? [{ label: 'Moved out', value: formatDate(a.move_out_date) }] : []),
                { label: 'Special conditions', value: a.special_conditions ? <span className="whitespace-pre-line">{a.special_conditions}</span> : '—', full: true },
              ]}
            />
          </Card>

          <DocumentsCard agreementId={a.id} canManage={manage} />

          <Card padded={false}>
            <div className="p-4 sm:p-5">
              <CardHeader
                className="mb-0"
                title="Security deposit"
                description={`Required ${formatMoney(a.deposit_required, a.currency)} · held ${formatMoney(a.deposit_held, a.currency)}`}
                action={
                  can('deposits.manage') && a.status !== 'terminated' ? (
                    <Button size="sm" variant="outline" icon={HandCoins} onClick={() => setModal('deposit')}>
                      Record deposit
                    </Button>
                  ) : null
                }
              />
            </div>
            {a.deposits.length ? (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">
                {a.deposits.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {humanize(d.kind)} · {formatDate(d.transaction_date)}
                      </p>
                      <p className="truncate text-sm text-slate-500">
                        {[d.method && humanize(d.method), d.reference, d.notes].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <span className={d.kind === 'received' ? 'text-sm font-semibold tabular text-emerald-700' : 'text-sm font-semibold tabular text-slate-700'}>
                      {d.kind === 'received' ? '+' : '−'}
                      {formatMoney(d.amount, d.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-5">No deposit transactions recorded.</p>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Balance" />
            <p className="text-sm text-slate-500">Outstanding on this agreement</p>
            <p className={Number(a.outstanding) > 0 ? 'mt-1 text-2xl font-bold tabular text-red-700' : 'mt-1 text-2xl font-bold tabular text-slate-900'}>
              {formatMoney(a.outstanding, a.currency)}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Can perm="invoices.view">
                <ButtonLink to={`/admin/finance/invoices?agreement_id=${a.id}`} variant="outline" icon={ReceiptText} block>
                  Invoices for this agreement
                </ButtonLink>
              </Can>
              <Can perm="payments.view">
                <ButtonLink to={`/admin/finance/payments?agreement_id=${a.id}`} variant="ghost" icon={Wallet} block>
                  Payment history
                </ButtonLink>
              </Can>
            </div>
          </Card>
          {a.end_date && a.status === 'active' ? (
            <Card>
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-5 text-brand-700" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Ends {formatDate(a.end_date)}</p>
                  <p className="text-sm text-slate-500">
                    {a.days_to_expiry !== undefined && a.days_to_expiry !== null && a.days_to_expiry >= 0
                      ? `${a.days_to_expiry} days left. Renew before it expires to keep billing.`
                      : 'Past its end date.'}
                  </p>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {modal === 'edit' ? <EditDraftDialog a={a} onClose={close} invalidate={invalidate} /> : null}
      {modal === 'renew' ? <RenewDialog a={a} onClose={close} invalidate={invalidate} /> : null}
      {modal === 'terminate' ? <TerminateDialog a={a} onClose={close} invalidate={invalidate} /> : null}
      {modal === 'moveout' ? <MoveOutDialog a={a} onClose={close} invalidate={invalidate} /> : null}
      {modal === 'deposit' ? <DepositDialog a={a} onClose={close} invalidate={invalidate} /> : null}
      <ConfirmDialog
        open={modal === 'activate'}
        onClose={close}
        onConfirm={() => activate.mutate(undefined)}
        title="Activate this agreement?"
        description={`Unit ${a.unit_code} will be marked occupied and removed from the public website. Rent invoices will be generated from ${formatDate(a.start_date)}.`}
        confirmLabel="Activate"
        tone="success"
        loading={activate.isPending}
        error={activate.errorText}
      />
      <ConfirmDialog
        open={modal === 'cancel'}
        onClose={close}
        onConfirm={(r) => cancel.mutate(r)}
        title="Cancel this draft?"
        description="The draft will be closed. The unit is not affected."
        confirmLabel="Cancel draft"
        tone="danger"
        reason={{ label: 'Reason', required: true }}
        loading={cancel.isPending}
        error={cancel.errorText}
      />
    </>
  )
}

type DialogProps = { a: AgreementDetail; onClose: () => void; invalidate: unknown[][] }

function Footer({ onClose, onSubmit, loading, label, tone = 'primary' }: { onClose: () => void; onSubmit: () => void; loading: boolean; label: string; tone?: 'primary' | 'danger' }) {
  return (
    <>
      <Button variant="outline" onClick={onClose} block className="sm:w-auto">
        Cancel
      </Button>
      <Button variant={tone} onClick={onSubmit} loading={loading} block className="sm:w-auto">
        {label}
      </Button>
    </>
  )
}

function EditDraftDialog({ a, onClose, invalidate }: DialogProps) {
  const [start, setStart] = useState(a.start_date)
  const [end, setEnd] = useState(a.end_date ?? '')
  const [rent, setRent] = useState(moneyInput(a.monthly_rent, a.currency))
  const [currency, setCurrency] = useState(a.currency)
  const [due, setDue] = useState(String(a.due_day))
  const [deposit, setDeposit] = useState(moneyInput(a.deposit_required, a.currency) || '0')
  const [conditions, setConditions] = useState(a.special_conditions)
  const [err, setErr] = useState<string | null>(null)
  const save = useApiMutation(
    () =>
      api.patch(`/agreements/${a.id}`, {
        start_date: start,
        end_date: end || null,
        monthly_rent: rent.trim(),
        currency,
        due_day: Number(due),
        deposit_required: deposit.trim() || '0',
        special_conditions: conditions,
      }),
    { success: 'Draft updated', invalidate, onSuccess: onClose },
  )
  function submit() {
    const e = (end && end < start && 'The end date must be on or after the start date') || moneyError(rent, currency) || moneyError(deposit || '0', currency, { allowZero: true })
    setErr(e || null)
    if (!e) save.mutate(undefined)
  }
  return (
    <Dialog open onClose={onClose} title="Edit draft agreement" size="lg" footer={<Footer onClose={onClose} onSubmit={submit} loading={save.isPending} label="Save" />}>
      <div className="space-y-4">
        <FormGrid>
          <Field label="Start date" required>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End date">
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label="Monthly rent" required>
            <div className="flex gap-2">
              <Input inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} className="flex-1" />
              <div className="w-24 shrink-0">
                <Select id="edit-agreement-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} aria-label="Currency">
                  <option value="RWF">RWF</option>
                  <option value="USD">USD</option>
                </Select>
              </div>
            </div>
          </Field>
          <Field label="Rent due on day">
            <Select value={due} onChange={(e) => setDue(e.target.value)}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Deposit required (${currency})`}>
            <Input inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </Field>
        </FormGrid>
        <Field label="Special conditions">
          <Textarea value={conditions} onChange={(e) => setConditions(e.target.value)} rows={3} />
        </Field>
        <FormError message={err || save.errorText} />
      </div>
    </Dialog>
  )
}

function RenewDialog({ a, onClose, invalidate }: DialogProps) {
  const defaultStart = a.end_date ? addDays(a.end_date, 1) : todayISO()
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(addDays(addDays(defaultStart, 365), -1))
  const [rent, setRent] = useState(moneyInput(a.monthly_rent, a.currency))
  const [due, setDue] = useState(String(a.due_day))
  const [err, setErr] = useState<string | null>(null)
  const renew = useApiMutation(
    () => api.post<AgreementDetail>(`/agreements/${a.id}/renew`, { start_date: start, end_date: end, monthly_rent: rent.trim(), due_day: Number(due) }),
    { success: (n) => `Renewed as ${n.agreement_number}`, invalidate, onSuccess: onClose },
  )
  function submit() {
    const e = (!end && 'Choose the new end date') || (end < start && 'The renewal cannot end before it starts') || moneyError(rent, a.currency)
    setErr(e || null)
    if (!e) renew.mutate(undefined)
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Renew agreement"
      description="A new active agreement is created for the same tenant and unit; this one is closed as expired. The unit stays occupied."
      footer={<Footer onClose={onClose} onSubmit={submit} loading={renew.isPending} label="Renew" />}
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="New start date" required>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="New end date" required>
            <Input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <Field label={`Monthly rent (${a.currency})`} required>
            <Input inputMode="decimal" value={rent} onChange={(e) => setRent(e.target.value)} />
          </Field>
          <Field label="Rent due on day">
            <Select value={due} onChange={(e) => setDue(e.target.value)}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>
        <FormError message={err || renew.errorText} />
      </div>
    </Dialog>
  )
}

function TerminateDialog({ a, onClose, invalidate }: DialogProps) {
  const [date, setDate] = useState(todayISO())
  const [reason, setReason] = useState('')
  const [vacated, setVacated] = useState(false)
  const [moveOut, setMoveOut] = useState(todayISO())
  const [err, setErr] = useState<string | null>(null)
  const term = useApiMutation(
    () =>
      api.post(`/agreements/${a.id}/terminate`, {
        terminated_on: date,
        reason: reason.trim(),
        tenant_vacated: vacated,
        move_out_date: vacated ? moveOut : null,
      }),
    { success: 'Agreement terminated', invalidate, onSuccess: onClose },
  )
  function submit() {
    const e = (reason.trim().length < 3 && 'Give a reason (at least 3 characters)') || (date < a.start_date && 'The termination date cannot be before the start date')
    setErr(e || null)
    if (!e) term.mutate(undefined)
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Terminate agreement"
      description="Billing stops at the termination date. Outstanding balances remain owed."
      footer={<Footer onClose={onClose} onSubmit={submit} loading={term.isPending} label="Terminate" tone="danger" />}
    >
      <div className="space-y-4">
        <Field label="Termination date" required>
          <Input type="date" value={date} min={a.start_date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Reason" required>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="e.g. Tenant relocating, notice given on …" />
        </Field>
        <Checkbox
          label="The tenant has already moved out"
          hint="The unit moves to turnover (inspection). Otherwise it stays occupied until you record the move-out."
          checked={vacated}
          onChange={(e) => setVacated(e.target.checked)}
        />
        {vacated ? (
          <Field label="Move-out date" required>
            <Input type="date" value={moveOut} min={a.start_date} onChange={(e) => setMoveOut(e.target.value)} />
          </Field>
        ) : null}
        <FormError message={err || term.errorText} />
      </div>
    </Dialog>
  )
}

function MoveOutDialog({ a, onClose, invalidate }: DialogProps) {
  const [date, setDate] = useState(todayISO())
  const save = useApiMutation(() => api.post(`/agreements/${a.id}/move-out`, { move_out_date: date }), {
    success: 'Move-out recorded — unit is in turnover',
    invalidate,
    onSuccess: onClose,
  })
  return (
    <Dialog
      open
      onClose={onClose}
      title="Record move-out"
      size="sm"
      footer={<Footer onClose={onClose} onSubmit={() => save.mutate(undefined)} loading={save.isPending} label="Record move-out" />}
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Unit {a.unit_code} will move to <strong>turnover</strong>. It returns to the website only after you inspect it and mark it ready on the{' '}
          <Link to={`/admin/units/${a.unit_id}`} className="font-medium text-brand-700 hover:underline">
            unit page
          </Link>
          .
        </p>
        <Field label="Move-out date" required>
          <Input type="date" value={date} min={a.start_date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <FormError message={save.errorText} />
      </div>
    </Dialog>
  )
}

function DepositDialog({ a, onClose, invalidate }: DialogProps) {
  const { can } = useAuth()
  const [kind, setKind] = useState(Number(a.deposit_held) > 0 && a.status !== 'active' && a.status !== 'draft' ? 'refunded' : 'received')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const methods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api.get<PaymentMethodOut[]>('/payment-methods'),
    enabled: can('payments.view'),
  })
  useEffect(() => {
    if (kind === 'received' && !amount && Number(a.deposit_required) > Number(a.deposit_held)) {
      setAmount(moneyInput(String(Number(a.deposit_required) - Number(a.deposit_held)), a.currency))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const save = useApiMutation(
    () => api.post(`/agreements/${a.id}/deposits`, { kind, amount: amount.trim(), transaction_date: date, method, reference: reference.trim(), notes: notes.trim() }),
    { success: 'Deposit recorded', invalidate, onSuccess: onClose },
  )
  function submit() {
    let e = moneyError(amount, a.currency)
    if (!e && kind !== 'received' && Number(amount) > Number(a.deposit_held)) e = `Only ${formatMoney(a.deposit_held, a.currency)} is held`
    setErr(e)
    if (!e) save.mutate(undefined)
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title="Record deposit transaction"
      description={`Held now: ${formatMoney(a.deposit_held, a.currency)} of ${formatMoney(a.deposit_required, a.currency)} required.`}
      footer={<Footer onClose={onClose} onSubmit={submit} loading={save.isPending} label="Record" />}
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Type" required>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="received">Received from tenant</option>
              {a.status !== 'draft' ? (
                <>
                  <option value="refunded">Refunded to tenant</option>
                  <option value="deducted">Deducted (damages / unpaid rent)</option>
                </>
              ) : null}
            </Select>
          </Field>
          <Field label={`Amount (${a.currency})`} required>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="">Not specified</option>
              {(methods.data ?? []).map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Reference" className="sm:col-span-2">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction reference, receipt no." />
          </Field>
        </FormGrid>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
        <FormError message={err || save.errorText} />
      </div>
    </Dialog>
  )
}

function DocumentsCard({ agreementId, canManage }: { agreementId: number; canManage: boolean }) {
  const navigate = useNavigate()
  const docs = useQuery({
    queryKey: ['agreement-documents', agreementId],
    queryFn: () => api.get<AgreementDocumentSummary[]>(`/agreements/${agreementId}/documents`),
  })
  const templates = useQuery({
    queryKey: ['agreement-templates'],
    queryFn: () => api.get<AgreementTemplateOut[]>('/agreement-templates'),
    enabled: canManage,
  })
  const [templateId, setTemplateId] = useState<string>('')
  const create = useApiMutation(
    () => api.post<AgreementDocumentOut>(`/agreements/${agreementId}/documents`, templateId ? { template_id: Number(templateId) } : {}),
    {
      success: (d) => `${d.document_number} drawn up — fill in the blanks, then sign`,
      invalidate: [['agreement-documents', agreementId]],
      onSuccess: (d) => navigate(`/admin/agreements/${agreementId}/documents/${d.id}`),
      toastError: true,
    },
  )
  const list = docs.data ?? []
  return (
    <Card padded={false}>
      <div className="p-4 sm:p-5">
        <CardHeader
          className="mb-0"
          title="Agreement documents"
          description="The written contract, signed digitally by both parties and printable."
          action={
            canManage ? (
              <div className="flex flex-wrap items-center gap-2">
                {templates.data && templates.data.length > 1 ? (
                  <Select aria-label="Template" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="h-9 w-auto max-w-[14rem] text-sm">
                    <option value="">Default template</option>
                    {templates.data.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </Select>
                ) : null}
                <Button size="sm" icon={FileSignature} loading={create.isPending} onClick={() => create.mutate(undefined)}>
                  Draw up document
                </Button>
              </div>
            ) : null
          }
        />
      </div>
      {list.length ? (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {list.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <Link to={`/admin/agreements/${agreementId}/documents/${d.id}`} className="min-w-0 flex-1 rounded-md focus-visible:outline-2 focus-visible:outline-brand-500">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{d.document_number}</span>
                  <StatusBadge status={d.status} />
                </span>
                <span className="block truncate text-sm text-slate-500">
                  {d.landlord_signed_at && d.tenant_signed_at
                    ? `Signed ${formatDateTime(d.landlord_signed_at > d.tenant_signed_at ? d.landlord_signed_at : d.tenant_signed_at)}`
                    : d.tenant_signed_at || d.landlord_signed_at
                      ? 'One signature recorded'
                      : `Drawn up ${formatDateTime(d.created_at)}`}
                  {d.template_name ? ` · ${d.template_name}` : ''}
                </span>
              </Link>
              <Button size="sm" variant="ghost" icon={Printer} onClick={() => openPrint(d.id)} aria-label={`Print ${d.document_number}`}>
                <span className="hidden sm:inline">Print</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-slate-100 px-4 py-4 text-sm text-slate-500 sm:px-5">
          {docs.isLoading ? 'Loading…' : 'No document yet. Draw one up from the agreement template.'}
        </p>
      )}
    </Card>
  )
}
