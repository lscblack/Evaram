import { useState } from 'react'
import { useNavigate } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CalendarPlus, FilePlus2, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementOut, GenerateOut, InvoiceDetail, InvoiceOut, Page } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { currentPeriod, formatDate, todayISO } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { useUrlState } from '@/shared/lib/useUrlState'
import { StatusBadge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Field, FormError, FormGrid, Input, Textarea } from '@/shared/ui/Form'
import { FilterBar, Money, SearchInput, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { AgreementPicker, amountError, CurrencySelect, DateRange, periodLabel, PropertySelect } from './components'

const PAGE_SIZE = 25
const TABS = [
  { value: 'open', label: 'Open' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
  { value: 'all', label: 'All' },
] as const

export default function InvoicesPage() {
  const [state, set] = useUrlState({
    tab: 'open',
    search: '',
    currency: '',
    property_id: '',
    date_from: '',
    date_to: '',
    agreement_id: '',
    tenant_id: '',
  })
  const [generate, setGenerate] = useState(false)
  const [create, setCreate] = useState(false)
  const query = useQuery({
    queryKey: ['invoices', 'list', state],
    queryFn: () =>
      api.get<Page<InvoiceOut>>('/invoices', {
        open_only: state.tab === 'open' || undefined,
        status: ['overdue', 'paid', 'void'].includes(state.tab) ? state.tab : undefined,
        search: state.search,
        currency: state.currency,
        property_id: state.property_id,
        date_from: state.date_from,
        date_to: state.date_to,
        agreement_id: state.agreement_id,
        tenant_id: state.tenant_id,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<InvoiceOut>[] = [
    { key: 'num', header: 'Invoice', cell: (r) => <span className="font-medium text-slate-900">{r.invoice_number}</span> },
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (r) => (
        <div>
          <p className="text-slate-900">{r.tenant_name}</p>
          <p className="text-slate-500">
            {r.unit_code} · {r.property_name}
          </p>
        </div>
      ),
    },
    { key: 'period', header: 'Period', cell: (r) => (r.kind === 'rent' ? periodLabel(r.period_start, r.period_end) : <span className="text-slate-500">Other charges</span>) },
    {
      key: 'due',
      header: 'Due',
      cell: (r) => (
        <div>
          <p>{formatDate(r.due_date)}</p>
          {r.days_overdue > 0 ? <p className="text-xs font-medium text-red-600">{r.days_overdue} days overdue</p> : null}
        </div>
      ),
    },
    { key: 'amt', header: 'Amount', align: 'right', cell: (r) => <Money amount={r.amount_charged} currency={r.currency} /> },
    { key: 'paid', header: 'Paid', align: 'right', cell: (r) => <Money amount={r.amount_paid} currency={r.currency} /> },
    { key: 'bal', header: 'Balance', align: 'right', cell: (r) => <Money amount={r.balance_due} currency={r.currency} className="font-semibold text-slate-900" /> },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ]

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Monthly rent invoices and other charges. Balances count approved payments only."
        actions={
          <Can perm="invoices.manage">
            <Button variant="outline" icon={FilePlus2} onClick={() => setCreate(true)}>
              New invoice
            </Button>
            <Button icon={CalendarPlus} onClick={() => setGenerate(true)}>
              Generate monthly invoices
            </Button>
          </Can>
        }
      />
      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs value={state.tab} onChange={(v) => set({ tab: v })} tabs={TABS.map((t) => ({ ...t }))} />
        </div>
        <FilterBar>
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Invoice, tenant or unit" className="sm:w-64" />
          <PropertySelect value={state.property_id} onChange={(v) => set({ property_id: v })} className="sm:w-56" />
          <CurrencySelect value={state.currency} onChange={(v) => set({ currency: v })} className="sm:w-40" />
          <DateRange from={state.date_from} to={state.date_to} onChange={(v) => set(v)} />
          {state.agreement_id ? (
            <button type="button" onClick={() => set({ agreement_id: '' })} className="text-sm font-medium text-brand-700 hover:underline">
              Showing one agreement · clear
            </button>
          ) : null}
        </FilterBar>
        <DataView
          rows={query.data?.items}
          columns={columns}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/finance/invoices/${r.id}`}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={<EmptyState icon={ReceiptText} title="No invoices found" description="Generate the month's rent invoices or adjust the filters." />}
          mobile={(r) => (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{r.tenant_name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {r.invoice_number} · {r.unit_code}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="mt-2 flex items-end justify-between gap-3 text-sm">
                <span className="text-slate-500">
                  Due {formatDate(r.due_date)}
                  {r.days_overdue > 0 ? <span className="ml-1 font-medium text-red-600">· {r.days_overdue}d late</span> : null}
                </span>
                <span className="text-right">
                  <Money amount={r.balance_due} currency={r.currency} className="font-semibold text-slate-900" />
                  <span className="block text-xs text-slate-500">
                    of <Money amount={r.amount_charged} currency={r.currency} />
                  </span>
                </span>
              </div>
            </div>
          )}
          footer={<Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />}
        />
      </Card>
      <GenerateDialog open={generate} onClose={() => setGenerate(false)} />
      <NewInvoiceDialog open={create} onClose={() => setCreate(false)} />
    </>
  )
}

function GenerateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [period, setPeriod] = useState(currentPeriod())
  const [result, setResult] = useState<GenerateOut | null>(null)
  const gen = useApiMutation((p: string) => api.post<GenerateOut>('/invoices/generate', { period: p }), {
    invalidate: [['invoices'], ['dashboard']],
    onSuccess: setResult,
  })
  const close = () => {
    setResult(null)
    gen.reset()
    onClose()
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      title="Generate monthly rent invoices"
      description="Creates one invoice per active agreement for the month. Agreements already invoiced are skipped, so running it again is safe."
      size="sm"
      footer={
        result ? (
          <Button onClick={close} block className="sm:w-auto">
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={close} block className="sm:w-auto">
              Cancel
            </Button>
            <Button loading={gen.isPending} disabled={!period} onClick={() => gen.mutate(period)} block className="sm:w-auto">
              Generate
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-3 text-sm">
          <p>
            <strong>{result.created}</strong> invoice{result.created === 1 ? '' : 's'} created for {result.period}; {result.skipped} skipped (already invoiced or not active in that month).
          </p>
          {result.invoice_numbers.length ? (
            <ul className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 p-3 font-mono text-xs">
              {result.invoice_numbers.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Billing month" required hint="Partial months are prorated by day.">
            <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
          <FormError message={gen.errorText} />
        </div>
      )}
    </Dialog>
  )
}

function NewInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [agreement, setAgreement] = useState<AgreementOut | null>(null)
  const [issue, setIssue] = useState(todayISO())
  const [due, setDue] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ description: '', amount: '' }])
  const [touched, setTouched] = useState(false)
  const currency = agreement?.currency ?? 'RWF'
  const itemErrors = items.map((i) => (i.description.trim().length < 2 ? 'Describe the charge' : amountError(i.amount, currency)))
  const create = useApiMutation(
    () =>
      api.post<InvoiceDetail>('/invoices', {
        agreement_id: agreement!.id,
        issue_date: issue,
        due_date: due,
        notes,
        items: items.map((i) => ({ description: i.description.trim(), amount: i.amount.trim() })),
      }),
    {
      success: (r) => `Invoice ${r.invoice_number} created`,
      invalidate: [['invoices'], ['dashboard']],
      onSuccess: (r) => {
        onClose()
        navigate(`/admin/finance/invoices/${r.id}`)
      },
    },
  )
  function submit() {
    setTouched(true)
    if (!agreement || itemErrors.some(Boolean) || !issue || !due || due < issue) return
    create.mutate(undefined)
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New invoice for other charges"
      description="For utilities, repairs or other charges outside the monthly rent."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} block className="sm:w-auto">
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!agreement} block className="sm:w-auto">
            Create invoice
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Rental agreement" required>
          <AgreementPicker value={agreement} onChange={setAgreement} statuses={['active', 'expired', 'terminated']} />
        </Field>
        <FormGrid>
          <Field label="Issue date" required>
            <Input type="date" value={issue} onChange={(e) => setIssue(e.target.value)} />
          </Field>
          <Field label="Due date" required error={touched && due < issue ? 'Due date cannot be before the issue date' : undefined}>
            <Input type="date" value={due} min={issue} onChange={(e) => setDue(e.target.value)} />
          </Field>
        </FormGrid>
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-700">Line items ({currency})</p>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_10rem_auto]">
              <Input
                className="col-span-2 sm:col-span-1"
                placeholder="Description"
                value={it.description}
                aria-label="Description"
                onChange={(e) => setItems((l) => l.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
              />
              <Input
                inputMode="decimal"
                placeholder="Amount"
                aria-label="Amount"
                value={it.amount}
                onChange={(e) => setItems((l) => l.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)))}
              />
              <button
                type="button"
                aria-label="Remove line"
                disabled={items.length === 1}
                onClick={() => setItems((l) => l.filter((_, i) => i !== idx))}
                className="inline-flex size-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 sm:size-10"
              >
                <Trash2 className="size-4" />
              </button>
              {touched && itemErrors[idx] ? <p className="col-span-full text-xs text-red-600">{itemErrors[idx]}</p> : null}
            </div>
          ))}
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => setItems((l) => [...l, { description: '', amount: '' }])} disabled={items.length >= 20}>
            Add line
          </Button>
        </div>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
        <FormError message={create.errorText} />
      </div>
    </Dialog>
  )
}
