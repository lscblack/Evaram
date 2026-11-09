import { useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Building2, Clock, Globe, GlobeLock, X } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { HistoryEntry, Page, PropertyOut } from '@/shared/api/types'
import { formatDateTime, humanize } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { EmptyState } from '@/shared/ui/EmptyState'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'

export const PROPERTY_TYPES = [
  { value: 'house', label: 'House', hint: 'One house — let whole or room by room.' },
  { value: 'building', label: 'Building', hint: 'Several units: apartments, rooms or shop rooms.' },
] as const

export const PROPERTY_USAGES = [
  { value: 'residential', label: 'Residential', hint: 'Homes: houses, apartments, rooms, studios.' },
  { value: 'commercial', label: 'Commercial', hint: 'Shop rooms (imiryango y’ubucuruzi) — no bedrooms or bathrooms.' },
  { value: 'mixed', label: 'Mixed', hint: 'Both, e.g. shops downstairs and homes upstairs.' },
] as const

export type PropertyUsage = (typeof PROPERTY_USAGES)[number]['value']

export const UNIT_TYPES = [
  { value: 'house', label: 'House', prefix: 'H' },
  { value: 'apartment', label: 'Apartment', prefix: 'A' },
  { value: 'room', label: 'Room', prefix: 'R' },
  { value: 'studio', label: 'Studio', prefix: 'S' },
  { value: 'commercial', label: 'Shop room', prefix: 'C' },
] as const

export const TOILET_OPTIONS = [
  { value: 'private', label: 'Own toilet' },
  { value: 'shared', label: 'Shared toilet' },
] as const

/** Unit types a property may contain, by what it is let for. */
export function unitTypesFor(usage: string | undefined) {
  if (usage === 'commercial') return UNIT_TYPES.filter((t) => t.value === 'commercial')
  if (usage === 'mixed') return [...UNIT_TYPES]
  return UNIT_TYPES.filter((t) => t.value !== 'commercial')
}

export const UNIT_STATUSES = ['available', 'reserved', 'occupied', 'turnover', 'maintenance', 'off_market'] as const
/** Statuses staff may set by hand; occupied/turnover come from the tenancy workflow. */
export const MANUAL_STATUSES = ['available', 'reserved', 'maintenance', 'off_market'] as const

export function unitPrefix(unitType: string): string {
  return UNIT_TYPES.find((t) => t.value === unitType)?.prefix ?? 'U'
}

/** Validates rent precision: RWF whole francs, USD at most 2 decimals. */
export function rentError(value: string, currency: string): string | null {
  if (value.trim() === '') return 'Enter the monthly rent'
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 'Enter a valid amount'
  if (currency === 'RWF' && !/^\d+$/.test(value.trim())) return 'RWF amounts must be whole francs'
  if (currency === 'USD' && !/^\d+(\.\d{1,2})?$/.test(value.trim())) return 'USD amounts can have at most 2 decimals'
  return null
}

export async function suggestCode(kind: 'unit' | 'property', prefix: string): Promise<string> {
  const r = await api.get<{ code: string }>('/codes/suggest', { kind, prefix })
  return r.code
}

/** All non-archived properties, for selects. */
export function usePropertyOptions() {
  return useQuery({
    queryKey: ['properties', 'options'],
    queryFn: () => api.get<Page<PropertyOut>>('/properties', { page_size: 200 }),
    staleTime: 60_000,
  })
}

export function ListedIndicator({ listed, className }: { listed: boolean; className?: string }) {
  return listed ? (
    <Badge tone="success" className={className}>
      <Globe className="size-3" /> On website
    </Badge>
  ) : (
    <Badge tone="neutral" className={className}>
      <GlobeLock className="size-3" /> Not listed
    </Badge>
  )
}

export function Thumb({ url, alt, className }: { url?: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return url && !failed ? (
    <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className={cn('shrink-0 rounded-lg bg-slate-100 object-cover', className)} />
  ) : (
    <div role="img" aria-label={`${alt}: no photo`} className={cn('flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400', className)}>
      <Building2 className="size-5" />
    </div>
  )
}

/** Occupied share of units as a slim bar. */
export function OccupancyBar({ occupied, total }: { occupied: number; total: number }) {
  const pct = total ? Math.round((occupied / total) * 100) : 0
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="tabular">
          {occupied}/{total} occupied
        </span>
        <span className="font-semibold text-slate-700 tabular">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function TagInput({ value, onChange, placeholder = 'Type and press Enter' }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  const add = () => {
    const t = text.trim()
    if (t && !value.includes(t) && value.length < 40) onChange([...value, t])
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1))
    }
  }
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15">
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-1 pl-2 pr-1 text-sm text-brand-800">
          {tag}
          <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))} className="rounded p-0.5 hover:bg-brand-100">
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onBlur={add}
        placeholder={value.length ? '' : placeholder}
        className="h-8 min-w-32 flex-1 bg-transparent px-1 text-base outline-none sm:text-sm"
      />
    </div>
  )
}

export function HistoryTimeline({ entries, loading }: { entries?: HistoryEntry[]; loading?: boolean }) {
  if (loading && !entries) return <SkeletonRows rows={4} />
  if (!entries?.length) return <EmptyState icon={Clock} title="No history yet" />
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {entries.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-white bg-brand-600 ring-1 ring-brand-200" />
          <p className="text-sm text-slate-900">{e.summary}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDateTime(e.at)}
            {e.actor ? ` · ${e.actor}` : ''}
            {e.unit_code ? ` · ${e.unit_code}` : ''}
            {' · '}
            {humanize(e.kind.split('.').pop())}
          </p>
        </li>
      ))}
    </ol>
  )
}
