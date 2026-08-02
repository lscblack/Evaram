import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  Mail,
  MessageSquare,
  Radio,
} from 'lucide-react'
import { Empty, Loading, Panel, PageHeader, Stat } from '@/components/admin/ui'
import { useLiveQuery } from '@/lib/queries'
import { useAuth } from '@/lib/auth'
import { EASE } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/types/api'

const KIND_ICONS: Record<string, typeof Mail> = {
  enquiry: MessageSquare,
  contact: Mail,
  booking: CalendarClock,
  application: Briefcase,
}

/** Polls every 10s and pauses when the tab is hidden, so it is genuinely live. */
export default function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, error } = useLiveQuery<DashboardStats>('/admin/dashboard', 10_000)
  const [pulse, setPulse] = useState(0)

  // Flash the "live" dot whenever a fresh payload lands.
  useEffect(() => {
    if (data) setPulse((n) => n + 1)
  }, [data])

  if (loading && !data) return <Loading label="Reading the database…" />
  if (error && !data) return <Empty title="Could not reach the API" detail={error.message} />
  if (!data) return null

  const inboxTotal =
    data.inbox.contact_new +
    data.inbox.enquiries_new +
    data.inbox.applications_new +
    data.inbox.bookings_pending

  const peak = Math.max(1, ...(data.trend ?? []).map((d) => d.count))

  return (
    <>
      <PageHeader
        title={`Good to see you, ${user?.full_name.split(' ')[0] ?? 'there'}.`}
        description="Everything below is read straight from the database and refreshes on its own."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[0.8125rem] font-semibold text-ink-soft">
            <motion.span
              key={pulse}
              initial={{ scale: 0.6, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="grid size-4 place-items-center"
            >
              <Radio className="size-4 text-emerald-500" strokeWidth={2.4} />
            </motion.span>
            Live
          </span>
        }
      />

      {/* ---- headline counters ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Listings"
          value={data.properties.total}
          detail={`${data.properties.available} available now`}
        />
        <Stat
          label="Awaiting review"
          value={data.properties.pending_review}
          detail="Filed by sellers and agents"
          tone={data.properties.pending_review > 0 ? 'gold' : 'plain'}
        />
        <Stat label="People" value={data.users.total} detail={`${data.users.agents} agents`} />
        <Stat
          label="Unread inbox"
          value={inboxTotal}
          detail="Enquiries, messages, bookings, applications"
          tone={inboxTotal > 0 ? 'gold' : 'plain'}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-12">
        {/* ---- listings trend ---- */}
        <Panel title="Listings added" className="lg:col-span-7">
          <div className="px-5 pt-6 pb-5">
            <div className="flex h-40 items-end gap-1.5">
              {(data.trend ?? []).map((day) => (
                <div key={day.date} className="group relative flex-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.count / peak) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className={cn(
                      'w-full rounded-t-md',
                      day.count > 0 ? 'bg-gold-500' : 'bg-line',
                    )}
                    style={{ minHeight: day.count > 0 ? 6 : 3 }}
                  />
                  <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-[0.6875rem] font-semibold whitespace-nowrap text-canvas group-hover:block">
                    {day.count} on {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[0.75rem] text-ink-faint">
              <span>{(data.trend ?? [])[0]?.date}</span>
              <span>Today</span>
            </div>
          </div>
        </Panel>

        {/* ---- inbox split ---- */}
        <Panel title="Needs a reply" className="lg:col-span-5">
          <ul className="divide-y divide-line/70">
            {[
              { label: 'Property enquiries', value: data.inbox.enquiries_new, to: '/admin/inbox' },
              { label: 'Contact messages', value: data.inbox.contact_new, to: '/admin/inbox' },
              { label: 'Pending bookings', value: data.inbox.bookings_pending, to: '/admin/inbox' },
              { label: 'Job applications', value: data.inbox.applications_new, to: '/admin/inbox' },
              {
                label: 'Newsletter subscribers',
                value: data.newsletter_subscribers,
                to: '/admin/inbox',
              },
            ].map((row) => (
              <li key={row.label}>
                <Link
                  to={row.to}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-canvas-alt"
                >
                  <span className="text-[0.875rem] text-ink-soft">{row.label}</span>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'font-display text-[1.0625rem] font-semibold tabular-nums',
                        row.value > 0 ? 'text-gold-600' : 'text-ink-faint',
                      )}
                    >
                      {row.value}
                    </span>
                    <ArrowUpRight className="size-3.5 text-ink-faint" strokeWidth={2.2} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ---- activity feed ---- */}
        <Panel title="Latest activity" className="lg:col-span-12">
          {(data.recent ?? []).length === 0 ? (
            <Empty
              title="Nothing has come in yet"
              detail="Enquiries, messages, bookings and applications will appear here the moment they arrive."
            />
          ) : (
            <ul className="divide-y divide-line/70">
              {(data.recent ?? []).map((item, i) => {
                const Cmp = KIND_ICONS[item.kind] ?? MessageSquare
                return (
                  <motion.li
                    key={`${item.at}-${i}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3.5 px-5 py-3.5"
                  >
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-canvas-alt text-ink-soft">
                      <Cmp className="size-4" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.875rem] font-semibold text-ink">{item.title}</p>
                      {item.detail && (
                        <p className="mt-0.5 truncate text-[0.8125rem] text-ink-muted">
                          {item.detail}
                        </p>
                      )}
                    </div>
                    <time
                      dateTime={item.at}
                      className="shrink-0 text-[0.75rem] whitespace-nowrap text-ink-faint"
                    >
                      {relative(item.at)}
                    </time>
                  </motion.li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}

/** "3m ago" / "2h ago" / a date once it stops being recent. */
function relative(iso: string): string {
  const then = new Date(iso).getTime()
  const mins = Math.round((Date.now() - then) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`
  if (mins < 60 * 24 * 7) return `${Math.round(mins / (60 * 24))}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
