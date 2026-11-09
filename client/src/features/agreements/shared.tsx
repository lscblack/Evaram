import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Search, X } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementOut, Page, TenantOut, UnitOut } from '@/shared/api/types'
import { formatDate, formatMoney, UNIT_TYPE_LABEL } from '@/shared/lib/format'
import { Badge, StatusBadge } from '@/shared/ui/Badge'
import { cn } from '@/shared/ui/cn'
import { Spinner } from '@/shared/ui/Spinner'

export function ExpiryHint({ a }: { a: Pick<AgreementOut, 'days_to_expiry'> }) {
  const d = a.days_to_expiry
  if (d === null || d === undefined) return null
  if (d < 0) return <Badge tone="danger">Ended {-d} d ago</Badge>
  if (d <= 60) return <Badge tone={d <= 14 ? 'danger' : 'warning'}>Ends in {d} d</Badge>
  return null
}

export function period(a: { start_date: string; end_date: string | null }) {
  return `${formatDate(a.start_date)} – ${a.end_date ? formatDate(a.end_date) : 'open-ended'}`
}

/** Validates an amount string for the currency's precision; returns an error or null. */
export function moneyError(value: string, currency: string, { allowZero = false } = {}): string | null {
  const v = value.trim()
  if (!v) return 'Enter an amount'
  const re = currency === 'RWF' ? /^\d+$/ : /^\d+(\.\d{1,2})?$/
  if (!re.test(v)) return currency === 'RWF' ? 'RWF amounts must be whole francs' : 'USD amounts can have at most 2 decimals'
  if (!allowZero && Number(v) <= 0) return 'Amount must be greater than zero'
  return null
}

/** Strip trailing ".00" from API money strings for editing inputs. */
export function moneyInput(value: string | null | undefined, currency: string): string {
  if (!value) return ''
  const n = Number(value)
  return currency === 'RWF' ? String(Math.round(n)) : n % 1 === 0 ? String(n) : n.toFixed(2)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

export function lettable(u: UnitOut): { ok: boolean; reason?: string } {
  if (u.occupancy) return { ok: false, reason: `Occupied by ${u.occupancy.tenant_name}` }
  if (u.status !== 'available' && u.status !== 'reserved') return { ok: false, reason: `Status: ${u.status.replace('_', ' ')}` }
  if (u.blocked_reason && u.blocked_reason !== 'Not published') return { ok: false, reason: u.blocked_reason }
  return { ok: true }
}

/** Generic searchable picker: a search box with a results list. */
function Picker<T>({
  label,
  placeholder,
  selected,
  renderSelected,
  onClear,
  search,
  renderOption,
  onPick,
  getKey,
}: {
  label: string
  placeholder: string
  selected: T | null
  renderSelected: (v: T) => ReactNode
  onClear: () => void
  search: (term: string) => { data?: T[]; isFetching: boolean; term: string; setTerm: (t: string) => void }
  renderOption: (v: T) => ReactNode
  onPick: (v: T) => void
  getKey: (v: T) => number
}) {
  const { data, isFetching, term, setTerm } = search('')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (selected) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
        <div className="flex items-start justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
          <div className="min-w-0">{renderSelected(selected)}</div>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
          >
            <X className="size-4" /> Change
          </button>
        </div>
      </div>
    )
  }
  return (
    <div ref={box} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} <span className="text-red-600">*</span>
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label={label}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 sm:h-10 sm:text-sm"
        />
        {isFetching ? <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2" /> : null}
      </div>
      {open ? (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {data?.length ? (
            data.map((v) => (
              <li key={getKey(v)}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(v)
                    setOpen(false)
                  }}
                  className="block w-full px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  {renderOption(v)}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-4 text-center text-sm text-slate-500">{isFetching ? 'Searching…' : 'No matches'}</li>
          )}
        </ul>
      ) : null}
    </div>
  )
}

function useDebounced(value: string, ms = 250) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function useTenantSearch() {
  const [term, setTerm] = useState('')
  const q = useDebounced(term)
  const res = useQuery({
    queryKey: ['tenants', 'picker', q],
    queryFn: () => api.get<Page<TenantOut>>('/tenants', { search: q, page_size: 10 }),
  })
  return { data: res.data?.items, isFetching: res.isFetching, term, setTerm }
}

function useUnitSearch() {
  const [term, setTerm] = useState('')
  const q = useDebounced(term)
  const res = useQuery({
    queryKey: ['units', 'picker', q],
    queryFn: () => api.get<Page<UnitOut>>('/units', { search: q, page_size: 15 }),
  })
  return { data: res.data?.items, isFetching: res.isFetching, term, setTerm }
}

export function TenantPicker({ value, onChange }: { value: TenantOut | null; onChange: (t: TenantOut | null) => void }) {
  return (
    <Picker<TenantOut>
      label="Tenant"
      placeholder="Search by name or phone"
      selected={value}
      onClear={() => onChange(null)}
      search={useTenantSearch}
      getKey={(t) => t.id}
      onPick={onChange}
      renderSelected={(t) => (
        <>
          <p className="font-medium text-slate-900">{t.full_name}</p>
          <p className="text-sm text-slate-500">{t.phone}</p>
          {t.current_tenancies.length ? (
            <p className="mt-1 text-xs text-slate-500">Currently renting {t.current_tenancies.map((c) => c.unit_code).join(', ')}</p>
          ) : null}
        </>
      )}
      renderOption={(t) => (
        <>
          <span className="block text-sm font-medium text-slate-900">{t.full_name}</span>
          <span className="block text-sm text-slate-500">{t.phone}</span>
        </>
      )}
    />
  )
}

export function UnitPicker({ value, onChange }: { value: UnitOut | null; onChange: (u: UnitOut | null) => void }) {
  return (
    <Picker<UnitOut>
      label="Rental unit"
      placeholder="Search by unit code, name or property"
      selected={value}
      onClear={() => onChange(null)}
      search={useUnitSearch}
      getKey={(u) => u.id}
      onPick={onChange}
      renderSelected={(u) => <UnitSummary u={u} />}
      renderOption={(u) => {
        const l = lettable(u)
        return (
          <span className={cn('flex items-start justify-between gap-2', !l.ok && 'opacity-70')}>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">
                {u.code} · {u.name}
              </span>
              <span className="block truncate text-sm text-slate-500">
                {u.property.name} · {formatMoney(u.monthly_rent, u.currency)}
              </span>
              {!l.ok ? <span className="block text-xs text-amber-700">Not lettable — {l.reason}</span> : null}
            </span>
            <StatusBadge status={u.status} />
          </span>
        )
      }}
    />
  )
}

function UnitSummary({ u }: { u: UnitOut }) {
  const l = lettable(u)
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-slate-900">
          {u.code} · {u.name}
        </p>
        <StatusBadge status={u.status} />
      </div>
      <p className="text-sm text-slate-500">
        {UNIT_TYPE_LABEL[u.unit_type] ?? u.unit_type} · {u.property.name} · {formatMoney(u.monthly_rent, u.currency)} / month
      </p>
      {l.ok ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
          <Check className="size-3.5" /> Can be let now
        </p>
      ) : (
        <p className="mt-1 text-xs text-amber-700">
          Not lettable right now — {l.reason}. You can save a draft; activation will be refused until the unit is free.
        </p>
      )}
    </>
  )
}
