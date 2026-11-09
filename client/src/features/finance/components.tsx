import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementOut, Page, PaymentMethodOut, PropertyOut } from '@/shared/api/types'
import { formatDate, formatMoney, todayISO } from '@/shared/lib/format'
import { Input, Select } from '@/shared/ui/Form'
import { SearchInput } from '@/shared/ui/Misc'
import { StatusBadge } from '@/shared/ui/Badge'
import { cn } from '@/shared/ui/cn'

export function usePropertyOptions(enabled = true) {
  return useQuery({
    queryKey: ['properties', 'options'],
    queryFn: () => api.get<Page<PropertyOut>>('/properties', { page_size: 200 }),
    staleTime: 5 * 60_000,
    enabled,
  })
}

export function usePaymentMethods(includeInactive = false) {
  return useQuery({
    queryKey: ['payment-methods', includeInactive],
    queryFn: () => api.get<PaymentMethodOut[]>('/payment-methods', { include_inactive: includeInactive || undefined }),
    staleTime: 5 * 60_000,
  })
}

export function PropertySelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const props = usePropertyOptions()
  return (
    <div className={className}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Property">
        <option value="">All properties</option>
        {props.data?.items.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </Select>
    </div>
  )
}

export function CurrencySelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Currency">
        <option value="">All currencies</option>
        <option value="RWF">RWF</option>
        <option value="USD">USD</option>
      </Select>
    </div>
  )
}

export function DateRange({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (v: { date_from: string; date_to: string }) => void
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:flex sm:items-center">
      <Input type="date" value={from} max={to || undefined} aria-label="From date" onChange={(e) => onChange({ date_from: e.target.value, date_to: to })} />
      <Input type="date" value={to} min={from || undefined} aria-label="To date" onChange={(e) => onChange({ date_from: from, date_to: e.target.value })} />
    </div>
  )
}

export function periodLabel(start?: string | null, end?: string | null) {
  if (!start) return '—'
  return `${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(end ?? start)}`
}

/** Search-and-pick an agreement. Selected agreement is shown as a summary card. */
export function AgreementPicker({
  value,
  onChange,
  statuses = ['active', 'expired', 'terminated'],
  initialId,
}: {
  value: AgreementOut | null
  onChange: (a: AgreementOut | null) => void
  statuses?: string[]
  initialId?: number | null
}) {
  const [search, setSearch] = useState('')
  const initial = useQuery({
    queryKey: ['agreements', 'detail', initialId],
    queryFn: () => api.get<AgreementOut>(`/agreements/${initialId}`),
    enabled: !!initialId && !value,
  })
  useEffect(() => {
    if (initial.data && !value) onChange(initial.data)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.data])
  const results = useQuery({
    queryKey: ['agreements', 'picker', search],
    queryFn: () => api.get<Page<AgreementOut>>('/agreements', { search, page_size: 20 }),
    enabled: !value,
  })
  if (value) {
    return (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-slate-900">
            {value.tenant_name} · {value.unit_code}
          </p>
          <p className="text-slate-600">
            {value.agreement_number} · {value.property_name}
          </p>
          <p className="text-slate-600">
            Rent {formatMoney(value.monthly_rent, value.currency)} / month · billed in <strong>{value.currency}</strong>
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
          Change
        </button>
      </div>
    )
  }
  const rows = (results.data?.items ?? []).filter((a) => statuses.includes(a.status))
  return (
    <div className="space-y-2">
      <SearchInput value={search} onChange={setSearch} placeholder="Search tenant, unit or agreement number" />
      <ul className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
        {results.isLoading || initial.isLoading ? (
          <li className="px-3 py-4 text-sm text-slate-500">Loading…</li>
        ) : rows.length ? (
          rows.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onChange(a)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                <span className="min-w-0 text-sm">
                  <span className="block font-medium text-slate-900">
                    {a.tenant_name} · {a.unit_code}
                  </span>
                  <span className="block truncate text-slate-500">
                    {a.agreement_number} · {formatMoney(a.monthly_rent, a.currency)}
                  </span>
                </span>
                <StatusBadge status={a.status} />
              </button>
            </li>
          ))
        ) : (
          <li className="px-3 py-4 text-sm text-slate-500">No matching agreements.</li>
        )}
      </ul>
    </div>
  )
}

export function DuplicateWarning({ numbers, className }: { numbers: string[]; className?: string }) {
  if (!numbers.length) return null
  return (
    <div className={cn('flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900', className)}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p>
        Possible duplicate: an approved payment with the same tenant, amount, date and method exists ({numbers.join(', ')}). Check the evidence before approving.
      </p>
    </div>
  )
}

export const monthStart = () => todayISO().slice(0, 8) + '01'

/** Validate an amount string for a currency; returns an error message or null. */
export function amountError(value: string, currency: string, allowZero = false): string | null {
  if (!value.trim()) return 'Enter an amount'
  if (!/^\d+(\.\d+)?$/.test(value.trim())) return 'Enter a number'
  const n = Number(value)
  if (n < 0 || (!allowZero && n === 0)) return 'Amount must be greater than zero'
  const decimals = value.includes('.') ? value.split('.')[1].length : 0
  if (currency === 'RWF' && decimals > 0 && Number(value.split('.')[1]) !== 0) return 'RWF amounts must be whole francs'
  if (currency === 'USD' && decimals > 2) return 'USD amounts can have at most 2 decimal places'
  return null
}
