import type { ReactNode } from 'react'
import { cn } from './cn'

export type Tone = 'neutral' | 'brand' | 'gold' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-100',
  gold: 'bg-gold-50 text-gold-700 ring-gold-100',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  warning: 'bg-amber-50 text-amber-800 ring-amber-100',
  danger: 'bg-red-50 text-red-700 ring-red-100',
  info: 'bg-sky-50 text-sky-700 ring-sky-100',
}

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {dot ? <span className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

const STATUS: Record<string, [string, Tone]> = {
  // units
  available: ['Available', 'success'],
  reserved: ['Reserved', 'info'],
  occupied: ['Occupied', 'brand'],
  turnover: ['Turnover', 'warning'],
  maintenance: ['Maintenance', 'warning'],
  off_market: ['Off market', 'neutral'],
  // agreements
  draft: ['Draft', 'neutral'],
  active: ['Active', 'success'],
  expired: ['Expired', 'warning'],
  terminated: ['Terminated', 'neutral'],
  // invoices
  unpaid: ['Unpaid', 'warning'],
  partially_paid: ['Partially paid', 'info'],
  paid: ['Paid', 'success'],
  overdue: ['Overdue', 'danger'],
  void: ['Void', 'neutral'],
  // payments
  pending: ['Pending approval', 'warning'],
  approved: ['Approved', 'success'],
  rejected: ['Rejected', 'danger'],
  reversed: ['Reversed', 'neutral'],
  // agreement documents
  signing: ['Awaiting signatures', 'warning'],
  signed: ['Signed', 'success'],
  // inquiries
  new: ['New', 'gold'],
  contacted: ['Contacted', 'info'],
  scheduled: ['Viewing scheduled', 'brand'],
  closed: ['Closed', 'neutral'],
}

export function statusLabel(status: string): string {
  return STATUS[status]?.[0] ?? status.replace(/_/g, ' ')
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const [label, tone] = STATUS[status] ?? [status.replace(/_/g, ' '), 'neutral' as Tone]
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  )
}
