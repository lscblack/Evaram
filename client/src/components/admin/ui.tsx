import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ page */

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <h1 className="font-display text-[1.625rem] leading-tight font-semibold text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[0.9375rem] text-ink-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-2xl border border-line bg-surface', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-display text-[1rem] font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/* ----------------------------------------------------------------- table */

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] border-collapse text-left">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        'border-b border-line px-5 py-3 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-faint uppercase',
        className,
      )}
    >
      {children}
    </th>
  )
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn('border-b border-line/70 px-5 py-3.5 text-[0.875rem] text-ink', className)}>
      {children}
    </td>
  )
}

/* ---------------------------------------------------------------- states */

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-5 py-16 text-[0.875rem] text-ink-muted">
      <Loader2 className="size-4 animate-spin" strokeWidth={2.2} />
      {label}
    </div>
  )
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="px-5 py-16 text-center">
      <p className="font-display text-[1.0625rem] font-semibold text-ink">{title}</p>
      {detail && <p className="mx-auto mt-2 max-w-sm text-[0.875rem] text-ink-muted">{detail}</p>}
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
    >
      {message}
    </p>
  )
}

/* ---------------------------------------------------------------- badges */

const TONES: Record<string, string> = {
  neutral: 'bg-canvas-alt text-ink-soft',
  good: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-gold-50 text-gold-700',
  bad: 'bg-red-50 text-red-700',
  info: 'bg-accent-soft text-ink-soft',
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: keyof typeof TONES
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase',
        TONES[tone],
      )}
    >
      {children}
    </span>
  )
}

/** Maps a property status to the badge tone that reads correctly at a glance. */
export const STATUS_TONE: Record<string, keyof typeof TONES> = {
  available: 'good',
  reserved: 'warn',
  under_offer: 'warn',
  pending_review: 'warn',
  draft: 'neutral',
  sold: 'info',
  rented: 'info',
  withdrawn: 'bad',
}

/* ----------------------------------------------------------------- input */

export const FIELD =
  'h-11 w-full rounded-xl border border-line bg-canvas px-3.5 text-[0.875rem] text-ink ' +
  'transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[0.75rem] text-ink-faint">{hint}</span>}
    </label>
  )
}

/* ------------------------------------------------------------------ misc */

/** A number that counts to its value — used on the dashboard tiles. */
export function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: number | string
  detail?: string
  tone?: 'gold' | 'plain'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">{label}</p>
      <p
        className={cn(
          'mt-2 font-display text-[1.875rem] leading-none font-semibold tabular-nums',
          tone === 'gold' ? 'text-gold-600' : 'text-ink',
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-2 text-[0.8125rem] text-ink-muted">{detail}</p>}
    </motion.div>
  )
}
