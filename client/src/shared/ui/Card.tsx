import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from './cn'

export function Card({ children, className, padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn('rounded-xl border border-slate-200 bg-white', padded && 'p-4 sm:p-5', className)}>
      {children}
    </section>
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

type StatTone = 'brand' | 'gold' | 'success' | 'danger' | 'warning'

const STAT_TONES: Record<StatTone, { chip: string; accent: string; wash: string; hover: string }> = {
  brand: {
    chip: 'bg-brand-50 text-brand-800 ring-brand-100',
    accent: 'from-brand-800 to-brand-400',
    wash: 'to-brand-50/60',
    hover: 'hover:border-brand-200',
  },
  gold: {
    chip: 'bg-gold-50 text-gold-700 ring-gold-100',
    accent: 'from-gold-600 to-gold-300',
    wash: 'to-gold-50/70',
    hover: 'hover:border-gold-200',
  },
  success: {
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    accent: 'from-emerald-600 to-emerald-300',
    wash: 'to-emerald-50/60',
    hover: 'hover:border-emerald-200',
  },
  danger: {
    chip: 'bg-red-50 text-red-700 ring-red-100',
    accent: 'from-red-600 to-red-300',
    wash: 'to-red-50/60',
    hover: 'hover:border-red-200',
  },
  warning: {
    chip: 'bg-amber-50 text-amber-700 ring-amber-100',
    accent: 'from-amber-500 to-amber-300',
    wash: 'to-amber-50/60',
    hover: 'hover:border-amber-200',
  },
}

/** A string that reads as a money amount ("1,380,000 RWF", "$1,200.00"). */
function looksLikeMoney(v: ReactNode): boolean {
  return typeof v === 'string' && /\d/.test(v) && /[A-Za-z$€£]/.test(v)
}

/**
 * KPI tile. `size="compact"` (or auto-detected money strings) renders the value
 * smaller so long currency amounts stay readable; pass it for multi-line
 * currency values passed as nodes. `index` staggers the entrance animation.
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'brand',
  to,
  size = 'auto',
  index = 0,
  animate = true,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon?: ComponentType<{ className?: string }>
  tone?: StatTone
  to?: string
  /** `auto` = compact for money strings, default otherwise. */
  size?: 'auto' | 'default' | 'compact'
  /** Position in the grid, used to stagger the entrance animation. */
  index?: number
  /** Entrance animation and count-up for numeric values. */
  animate?: boolean
}) {
  const t = STAT_TONES[tone]
  const compact = size === 'compact' || (size === 'auto' && looksLikeMoney(value))
  const shown =
    animate && (typeof value === 'number' || typeof value === 'string') ? <CountUp value={String(value)} /> : value
  const body = (
    <>
      <span aria-hidden className={cn('pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-linear-to-r opacity-80', t.accent)} />
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 pt-0.5 text-xs font-medium leading-snug text-slate-500 sm:text-sm">{label}</p>
        {Icon ? (
          <span className={cn('hidden size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset sm:flex', t.chip)}>
            <Icon className="size-[18px]" />
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'mt-2 min-w-0 break-words font-semibold text-slate-900 tabular',
          compact
            ? 'text-sm leading-snug sm:text-base xl:text-lg [&_.whitespace-nowrap]:whitespace-normal'
            : 'text-xl leading-tight tracking-tight sm:text-2xl',
        )}
      >
        {shown}
      </div>
      {sub ? <div className="mt-1.5 min-w-0 break-words text-xs leading-snug text-slate-500 sm:text-sm">{sub}</div> : null}
    </>
  )
  const cls = cn(
    'relative block min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-white from-55% p-4 shadow-[0_1px_2px_rgba(2,27,51,0.04)] sm:p-5',
    t.wash,
    animate && 'animate-stat-in',
  )
  const style = animate ? ({ '--stat-i': index } as CSSProperties) : undefined
  return to ? (
    <Link
      to={to}
      style={style}
      className={cn(
        cls,
        t.hover,
        'transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(2,27,51,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  )
}

const COUNT_MS = 700

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** "1,380,000 RWF" -> { prefix: '', n: 1380000, decimals: 0, grouped: true, suffix: ' RWF' } */
function parseNumeric(text: string) {
  const m = /^(\D*?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(\D*)$/.exec(text)
  if (!m) return null
  const n = Number(`${m[2]!.replace(/,/g, '')}${m[3] ? `.${m[3]}` : ''}`)
  if (!Number.isFinite(n) || n === 0) return null
  const decimals = m[3]?.length ?? 0
  const fmt = new Intl.NumberFormat('en-US', {
    useGrouping: m[2]!.includes(','),
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return { n, render: (x: number) => `${m[1]}${fmt.format(x)}${m[4]}` }
}

/**
 * Counts a numeric string up from zero once, on mount (~700ms). Prefix/suffix
 * (currency, %) and formatting are preserved, and the last frame is the exact
 * input text. Skipped under prefers-reduced-motion. While counting, the visual
 * text is aria-hidden and the final value is exposed to assistive tech.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const [parsed] = useState(() => (prefersReducedMotion() ? null : parseNumeric(value)))
  const [frame, setFrame] = useState<string | null>(() => (parsed ? parsed.render(0) : null))
  const raf = useRef(0)

  useEffect(() => {
    if (!parsed) return
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS)
      if (p >= 1) {
        setFrame(null)
        return
      }
      const eased = 1 - (1 - p) ** 3
      const x = parsed.n * eased
      setFrame(parsed.render(Number.isInteger(parsed.n) ? Math.round(x) : x))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [parsed])

  if (frame === null) return <span className={className}>{value}</span>
  return (
    <span className={className}>
      <span aria-hidden>{frame}</span>
      <span className="sr-only">{value}</span>
    </span>
  )
}

/** Key/value list used on detail pages. */
export function DescriptionList({ items, cols = 2 }: { items: { label: ReactNode; value: ReactNode; full?: boolean }[]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', cols >= 2 && 'sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3')}>
      {items.map((it, i) => (
        <div key={i} className={cn('min-w-0', it.full && 'sm:col-span-full')}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{it.label}</dt>
          <dd className="mt-1 break-words text-sm text-slate-900">{it.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
