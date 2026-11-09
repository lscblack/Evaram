import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlarmClock, Building2, Download, FileText, HandCoins, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api, downloadFile, errorMessage, type Query } from '@/shared/api/client'
import type { InvoiceReport, MonthlyRow, PaymentReport, Page, TenantOut } from '@/shared/api/types'
import { formatMoney, formatMoneyCompact, formatMonth, todayISO } from '@/shared/lib/format'
import { useAuth } from '@/shared/auth/AuthProvider'
import { useUrlState } from '@/shared/lib/useUrlState'
import { statusLabel } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Select } from '@/shared/ui/Form'
import { FilterBar, Money } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'
import { CurrencySelect, DateRange, PropertySelect, usePaymentMethods } from './components'

function iso(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function presetRange(preset: string): { date_from: string; date_to: string } | null {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (preset === 'this_month') return { date_from: iso(new Date(y, m, 1)), date_to: todayISO() }
  if (preset === 'last_month') return { date_from: iso(new Date(y, m - 1, 1)), date_to: iso(new Date(y, m, 0)) }
  if (preset === 'this_year') return { date_from: iso(new Date(y, 0, 1)), date_to: todayISO() }
  if (preset === 'all') return { date_from: '', date_to: '' }
  return null
}

const CURRENCY_COLOR: Record<string, { collected: string; billed: string }> = {
  RWF: { collected: '#032a4e', billed: '#93b2d1' },
  USD: { collected: '#bc7a26', billed: '#e2b474' },
}

export default function ReportsPage() {
  const [state, set] = useUrlState({
    preset: 'this_month',
    date_from: '',
    date_to: '',
    property_id: '',
    tenant_id: '',
    method_code: '',
    currency: '',
    status: '',
  })
  const methods = usePaymentMethods(true)
  const tenants = useQuery({
    queryKey: ['tenants', 'options'],
    queryFn: () => api.get<Page<TenantOut>>('/tenants', { page_size: 200 }),
    staleTime: 5 * 60_000,
  })
  const methodLabel = (code: string) => methods.data?.find((m) => m.code === code)?.label ?? code

  // Presets are resolved on each render; only a custom range lives in the URL.
  const range = state.preset === 'custom' ? { date_from: state.date_from, date_to: state.date_to } : presetRange(state.preset) ?? presetRange('this_month')!
  const paymentQuery: Query = {
    date_from: range.date_from,
    date_to: range.date_to,
    property_id: state.property_id,
    tenant_id: state.tenant_id,
    method_code: state.method_code,
    currency: state.currency,
    status: state.status,
  }
  const invoiceQuery: Query = {
    date_from: range.date_from,
    date_to: range.date_to,
    property_id: state.property_id,
    tenant_id: state.tenant_id,
    currency: state.currency,
  }
  const payments = useQuery({ queryKey: ['reports', 'payments', paymentQuery], queryFn: () => api.get<PaymentReport>('/reports/payments', paymentQuery) })
  const invoices = useQuery({ queryKey: ['reports', 'invoices', invoiceQuery], queryFn: () => api.get<InvoiceReport>('/reports/invoices', invoiceQuery) })
  // The trend always shows a window of months (default last 12) regardless of the short presets.
  const trendQuery: Query = state.preset === 'custom' || state.preset === 'this_year' ? { date_from: range.date_from, date_to: range.date_to } : {}
  const monthly = useQuery({ queryKey: ['reports', 'monthly', trendQuery], queryFn: () => api.get<MonthlyRow[]>('/reports/monthly', trendQuery) })

  const approvedByCurrency = (payments.data?.totals ?? []).filter((t) => t.status === 'approved')
  const otherStatuses = (payments.data?.totals ?? []).filter((t) => t.status !== 'approved')
  const trendCurrencies = useMemo(() => {
    const set = new Set<string>()
    for (const m of monthly.data ?? []) {
      Object.keys(m.collected).forEach((c) => set.add(c))
      Object.keys(m.billed).forEach((c) => set.add(c))
    }
    return [...set].filter((c) => !state.currency || c === state.currency).sort()
  }, [monthly.data, state.currency])

  return (
    <>
      <PageHeader
        title="Financial reports"
        description="Collections and invoicing from recorded transactions. Every figure is shown in its own currency."
        actions={
          <>
            <Button variant="outline" icon={Download} onClick={() => downloadFile('/reports/payments.csv', paymentQuery, 'payments.csv').catch((e) => toast.error(errorMessage(e)))}>
              Payments CSV
            </Button>
            <Button variant="outline" icon={Download} onClick={() => downloadFile('/reports/invoices.csv', invoiceQuery, 'invoices.csv').catch((e) => toast.error(errorMessage(e)))}>
              Invoices CSV
            </Button>
          </>
        }
      />
      <Card padded={false} className="mb-5">
        <FilterBar className="border-b-0">
          <div className="sm:w-44">
            <Select
              value={state.preset}
              aria-label="Date range"
              onChange={(e) =>
                set(e.target.value === 'custom' ? { preset: 'custom', ...range } : { preset: e.target.value, date_from: '', date_to: '' })
              }
            >
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_year">This year</option>
              <option value="all">All time</option>
              <option value="custom">Custom range</option>
            </Select>
          </div>
          {state.preset === 'custom' ? <DateRange from={state.date_from} to={state.date_to} onChange={(v) => set({ ...v, preset: 'custom' })} /> : null}
          <PropertySelect value={state.property_id} onChange={(v) => set({ property_id: v })} className="sm:w-52" />
          <div className="sm:w-52">
            <Select value={state.tenant_id} onChange={(e) => set({ tenant_id: e.target.value })} aria-label="Tenant">
              <option value="">All tenants</option>
              {tenants.data?.items.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-44">
            <Select value={state.method_code} onChange={(e) => set({ method_code: e.target.value })} aria-label="Payment method">
              <option value="">All methods</option>
              {methods.data?.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <CurrencySelect value={state.currency} onChange={(v) => set({ currency: v })} className="sm:w-36" />
          <div className="sm:w-44">
            <Select value={state.status} onChange={(e) => set({ status: e.target.value })} aria-label="Payment status">
              <option value="">All payment statuses</option>
              {['approved', 'pending', 'rejected', 'reversed'].map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
          </div>
        </FilterBar>
      </Card>

      <PdfReports range={range} propertyId={state.property_id} currency={state.currency} periodLabel={PERIOD_LABEL[state.preset] ?? 'Custom range'} />

      {payments.error ? <ErrorState error={payments.error} onRetry={payments.refetch} /> : null}

      <div className="grid gap-5 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader title="Collections" description="Approved payments in the period, per currency" />
          {payments.isLoading ? (
            <SkeletonRows rows={2} />
          ) : approvedByCurrency.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {approvedByCurrency.map((t) => (
                <div key={t.currency} className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{t.currency}</p>
                  <Money amount={t.amount} currency={t.currency} className="mt-1 block text-2xl font-bold text-slate-900" />
                  <p className="text-sm text-slate-500">{t.count} payments</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No approved payments match these filters.</p>
          )}
          {otherStatuses.length ? (
            <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm">
              {otherStatuses.map((t) => (
                <li key={`${t.currency}-${t.status}`} className="flex justify-between gap-3 text-slate-600">
                  <span>
                    {statusLabel(t.status)} ({t.count})
                  </span>
                  <Money amount={t.amount} currency={t.currency} />
                </li>
              ))}
            </ul>
          ) : null}
        </Card>

        <Card>
          <CardHeader title="Invoicing" description="Invoices issued in the period (void excluded)" />
          {invoices.isLoading ? (
            <SkeletonRows rows={2} />
          ) : invoices.data?.by_currency.length ? (
            <div className="space-y-4">
              {invoices.data.by_currency.map((c) => (
                <div key={c.currency} className="rounded-lg bg-slate-50 p-4 text-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-slate-900">
                      {c.currency} · {c.count} invoices
                    </p>
                    <p className="font-semibold text-brand-800">{c.collection_rate}% collected</p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-brand-900" style={{ width: `${Math.min(100, c.collection_rate)}%` }} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                    <dt className="text-slate-500">Charged</dt>
                    <dd className="text-right tabular">{formatMoney(c.charged, c.currency)}</dd>
                    <dt className="text-slate-500">Credited</dt>
                    <dd className="text-right tabular">{formatMoney(c.credited, c.currency)}</dd>
                    <dt className="text-slate-500">Paid</dt>
                    <dd className="text-right tabular">{formatMoney(c.paid, c.currency)}</dd>
                    <dt className="font-medium text-slate-700">Outstanding</dt>
                    <dd className="text-right font-semibold tabular">{formatMoney(c.outstanding, c.currency)}</dd>
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No invoices issued in this period.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="By payment method" description="Approved payments" />
          {payments.data?.by_method.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {payments.data.by_method.map((m) => (
                <li key={`${m.method_code}-${m.currency}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    {methodLabel(m.method_code)} <span className="text-slate-400">({m.count})</span>
                  </span>
                  <Money amount={m.amount} currency={m.currency} className="font-medium" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No data.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="By property" description="Approved payments" />
          {payments.data?.by_property.length ? (
            <ul className="divide-y divide-slate-100 text-sm">
              {payments.data.by_property.map((p) => (
                <li key={`${p.code}-${p.currency}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0 truncate">
                    {p.code} · {p.name} <span className="text-slate-400">({p.count})</span>
                  </span>
                  <Money amount={p.amount} currency={p.currency} className="font-medium" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No data.</p>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Monthly trend" description="Billed vs collected per month — a separate chart for each currency" />
        {monthly.error ? (
          <ErrorState error={monthly.error} onRetry={monthly.refetch} />
        ) : monthly.isLoading ? (
          <SkeletonRows rows={3} />
        ) : !trendCurrencies.length ? (
          <EmptyState title="No transactions in this range" />
        ) : (
          <div className={trendCurrencies.length > 1 ? 'grid gap-6 xl:grid-cols-2 [&>*]:min-w-0' : 'min-w-0'}>
            {trendCurrencies.map((cur) => (
              <TrendChart key={cur} currency={cur} rows={monthly.data ?? []} />
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

function TrendChart({ currency, rows }: { currency: string; rows: MonthlyRow[] }) {
  const data = rows.map((r) => ({
    month: formatMonth(r.month),
    Billed: Number(r.billed[currency] ?? 0),
    Collected: Number(r.collected[currency] ?? 0),
  }))
  const colors = CURRENCY_COLOR[currency] ?? CURRENCY_COLOR.RWF
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-700">{currency}</p>
      <div className="h-64 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatMoneyCompact(v, currency)} />
            <Tooltip formatter={(v) => formatMoney(Number(v), currency)} cursor={{ fill: '#f1f5f9' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Billed" fill={colors.billed} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Collected" fill={colors.collected} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const PERIOD_LABEL: Record<string, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  this_year: 'This year',
  all: 'All time',
}

type PdfKind = 'payments-received' | 'overdue' | 'occupancy'

const PDF_REPORTS: { kind: PdfKind; file: string; title: string; description: string; icon: LucideIcon; usesPeriod: boolean; needs?: string }[] = [
  {
    kind: 'payments-received',
    file: 'payments-received',
    title: 'Payments received',
    description: 'Total paid, tenants who paid, months paid and paid-through month, units taken.',
    icon: HandCoins,
    usesPeriod: true,
  },
  {
    kind: 'overdue',
    file: 'overdue-tenants',
    title: 'Overdue tenants',
    description: 'Who is late, how many months, days late and amount owed, with ageing.',
    icon: AlarmClock,
    usesPeriod: false,
    needs: 'invoices.view',
  },
  {
    kind: 'occupancy',
    file: 'occupancy',
    title: 'Occupancy',
    description: 'Every unit: taken or free, tenant, rent, paid through and balance.',
    icon: Building2,
    usesPeriod: false,
  },
]

/** Branded PDF reports, downloaded with the page's period, property and currency filters. */
function PdfReports({
  range,
  propertyId,
  currency,
  periodLabel,
}: {
  range: { date_from: string; date_to: string }
  propertyId: string
  currency: string
  periodLabel: string
}) {
  const { can } = useAuth()
  const [busy, setBusy] = useState<PdfKind | null>(null)
  const [picking, setPicking] = useState<(typeof PDF_REPORTS)[number] | null>(null)
  const options = useQuery({
    queryKey: ['reports', 'pdf-options'],
    queryFn: () => api.get<PdfOptions>('/reports/pdf/options'),
    staleTime: Infinity,
  })

  async function download(r: (typeof PDF_REPORTS)[number], choice: Choice) {
    const query: Query = {
      property_id: propertyId,
      ...(r.kind !== 'occupancy' ? { currency } : {}),
      ...(r.usesPeriod ? range : {}),
      cards: choice.cards.join(','),
      sections: choice.sections.join(','),
    }
    setBusy(r.kind)
    try {
      await downloadFile(`/reports/pdf/${r.kind}`, query, `evaramu-${r.file}-${todayISO()}.pdf`)
      setPicking(null)
      toast.success(`${r.title} report downloaded`)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="mb-5">
      <CardHeader
        title="PDF reports"
        description="Printable reports with your logo, company details and the date. They use the property and currency chosen above."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PDF_REPORTS.filter((r) => !r.needs || can(r.needs)).map((r) => (
          <div key={r.kind} className="flex min-w-0 flex-col rounded-xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                <r.icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{r.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{r.description}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <FileText className="size-3.5" />
                {r.usesPeriod ? periodLabel : 'As of today'}
              </span>
              <Button size="sm" icon={Download} disabled={busy !== null || !options.data} onClick={() => setPicking(r)}>
                Download PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
      {picking && options.data?.[picking.kind] ? (
        <ChooseContents
          title={picking.title}
          options={options.data[picking.kind]!}
          initial={allChoice(options.data[picking.kind]!)}
          busy={busy === picking.kind}
          onClose={() => setPicking(null)}
          onGenerate={(c) => download(picking, c)}
        />
      ) : null}
    </Card>
  )
}

type PdfOption = { key: string; label: string }
type PdfOptions = Record<string, { cards: PdfOption[]; sections: PdfOption[] }>
type Choice = { cards: string[]; sections: string[] }

/** Everything is ticked each time: a table left out once must not silently go missing from later reports. */
function allChoice(opts: { cards: PdfOption[]; sections: PdfOption[] }): Choice {
  return { cards: opts.cards.map((o) => o.key), sections: opts.sections.map((o) => o.key) }
}

function ChooseContents({
  title,
  options,
  initial,
  busy,
  onClose,
  onGenerate,
}: {
  title: string
  options: { cards: PdfOption[]; sections: PdfOption[] }
  initial: Choice
  busy: boolean
  onClose: () => void
  onGenerate: (c: Choice) => void
}) {
  const [cards, setCards] = useState<string[]>(initial.cards)
  const [sections, setSections] = useState<string[]>(initial.sections)
  const empty = !cards.length && !sections.length
  const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key])

  const group = (label: string, opts: PdfOption[], list: string[], set: (v: string[]) => void) => (
    <fieldset>
      <div className="mb-2 flex items-center justify-between gap-3">
        <legend className="text-sm font-semibold text-slate-900">{label}</legend>
        <span className="flex gap-3 text-xs font-medium">
          <button type="button" className="text-brand-700 hover:text-brand-900" onClick={() => set(opts.map((o) => o.key))}>All</button>
          <button type="button" className="text-slate-500 hover:text-slate-800" onClick={() => set([])}>None</button>
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o) => (
          <label
            key={o.key}
            className={cn(
              'flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
              list.includes(o.key) ? 'border-brand-300 bg-brand-50/60 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
          >
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 accent-brand-800"
              checked={list.includes(o.key)}
              onChange={() => toggle(list, set, o.key)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`${title} — choose what to include`}
      description="Untick anything you do not want in this PDF."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={Download} loading={busy} disabled={empty} onClick={() => onGenerate({ cards, sections })}>
            Generate PDF
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {group('Summary cards', options.cards, cards, setCards)}
        {group('Tables', options.sections, sections, setSections)}
        {empty ? <p className="text-sm text-red-700">Choose at least one card or table.</p> : null}
        <p className="text-xs text-slate-500">Unit-type cards (rooms, houses…) only appear when you have units of that type.</p>
      </div>
    </Dialog>
  )
}
