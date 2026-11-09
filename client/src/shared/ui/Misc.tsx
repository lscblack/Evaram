import { useEffect, useState, type ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from './cn'
import { formatMoney } from '@/shared/lib/format'
import type { CurrencyAmount } from '@/shared/api/types'

/** Debounced search box (keeps its own text, reports after a pause). */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  useEffect(() => {
    if (text === value) return
    const t = setTimeout(() => onChange(text), 300)
    return () => clearTimeout(t)
  }, [text, value, onChange])
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 sm:h-10 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {text ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setText('')
            onChange('')
          }}
          className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

/** Horizontal filter row: wraps on small screens. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 border-b border-slate-200 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4', className)}>
      {children}
    </div>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: ReactNode; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('scrollbar-none -mb-px flex gap-1 overflow-x-auto border-b border-slate-200', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors',
            value === t.value ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined ? (
            <span
              className={cn(
                'rounded-full px-1.5 py-px text-xs tabular',
                value === t.value ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600',
              )}
            >
              {t.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function Money({ amount, currency, className }: { amount: string | number; currency: string; className?: string }) {
  return <span className={cn('tabular whitespace-nowrap', className)}>{formatMoney(amount, currency)}</span>
}

/**
 * Amounts in several currencies, one per line — never summed together.
 * Renders "—" (or `empty`) when there is nothing.
 */
export function CurrencyAmounts({
  items,
  empty = '—',
  className,
  lineClassName,
}: {
  items: CurrencyAmount[] | undefined
  empty?: ReactNode
  className?: string
  lineClassName?: string
}) {
  const list = (items ?? []).filter((i) => Number(i.amount) !== 0)
  if (!list.length) return <span className={className}>{empty}</span>
  return (
    <span className={cn('flex flex-col', className)}>
      {list.map((i) => (
        <span key={i.currency} className={cn('tabular whitespace-nowrap', lineClassName)}>
          {formatMoney(i.amount, i.currency)}
        </span>
      ))}
    </span>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
  return (
    <span
      className={cn(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800',
        className,
      )}
      aria-hidden="true"
    >
      {letters}
    </span>
  )
}
