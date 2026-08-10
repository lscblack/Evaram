import { useState } from 'react'
import {
  Badge,
  Empty,
  Loading,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/admin/ui'
import { InboxDetail, type InboxRecord } from '@/components/admin/InboxDetail'
import { invalidate, useLiveQuery } from '@/lib/queries'
import { cn, formatCompactCurrency, formatDate } from '@/lib/utils'
import type { Page } from '@/types/api'

type Tab = 'enquiries' | 'sell' | 'wanted' | 'bookings' | 'applications'

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: 'enquiries', label: 'Property enquiries', path: '/admin/enquiries' },
  { id: 'sell', label: 'Sell requests', path: '/admin/seller-submissions' },
  { id: 'wanted', label: 'Buyer requests', path: '/admin/property-requests' },
  { id: 'bookings', label: 'Bookings', path: '/admin/bookings' },
  { id: 'applications', label: 'Applications', path: '/admin/applications' },
]

/** The drawer and the table read the same union. */
type InboxRow = InboxRecord

/** Statuses that still need somebody to act. */
const OPEN_STATUSES = new Set(['new', 'pending', 'open', 'reviewing'])

function budgetLabel(row: InboxRow): string {
  const { budget_min: min, budget_max: max } = row
  if (min && max) return `${formatCompactCurrency(min)} – ${formatCompactCurrency(max)}`
  if (max) return `up to ${formatCompactCurrency(max)}`
  if (min) return `from ${formatCompactCurrency(min)}`
  return 'Budget not stated'
}

/** The one line that identifies a row, whichever tab it came from. */
function whoLabel(row: InboxRow): string {
  return row.full_name ?? row.name ?? row.owners?.[0]?.full_name ?? '—'
}

function detailLabel(row: InboxRow, tab: Tab): string {
  if (tab === 'sell') {
    return [row.property_type, row.location ?? row.district, `UPI ${row.upi}`]
      .filter(Boolean)
      .join(' · ')
  }
  if (tab === 'wanted') {
    return [
      row.intent === 'rent' ? 'To rent' : 'To buy',
      row.preferred_areas ?? row.district,
      budgetLabel(row),
      row.bedrooms_min ? `${row.bedrooms_min}+ bed` : null,
      row.timeline,
    ]
      .filter(Boolean)
      .join(' · ')
  }
  if (row.scheduled_date) return `${row.scheduled_date} at ${row.scheduled_time}`
  return row.message ?? row.role_applied ?? '—'
}

/** Everything that came in from the public site, refreshed while you watch. */
export default function InboxAdminPage() {
  const [tab, setTab] = useState<Tab>('enquiries')
  const active = TABS.find((t) => t.id === tab) ?? TABS[0]

  const [selected, setSelected] = useState<InboxRecord | null>(null)

  const { data, loading, refetch } = useLiveQuery<Page<InboxRow>>(
    `${active.path}?per_page=48`, 20_000,
  )
  const rows = data?.items ?? []

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Enquiries, sell requests, buyer requests, bookings and applications — newest first."
      />

      <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors',
              t.id === tab
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Panel>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty
            title="Nothing waiting"
            detail="New submissions from the public site land here automatically."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>From</Th>
                <Th>Detail</Th>
                <Th>Status</Th>
                <Th className="text-right">Received</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className="cursor-pointer transition-colors hover:bg-canvas-alt"
                >
                  <Td>
                    <p className="font-semibold text-ink">{whoLabel(row)}</p>
                    <p className="text-[0.75rem] text-ink-muted">
                      {row.email ?? row.phone ?? row.owners?.[0]?.phone ?? 'No contact given'}
                    </p>
                    {row.reference && (
                      <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-faint">
                        {row.reference}
                      </p>
                    )}
                  </Td>
                  <Td className="max-w-md">
                    <p className="truncate text-ink-soft">{detailLabel(row, tab)}</p>
                    {tab === 'sell' && row.asking_price != null && (
                      <p className="text-[0.75rem] text-ink-muted">
                        Asking {formatCompactCurrency(row.asking_price)}
                      </p>
                    )}
                    {tab === 'wanted' && row.notes && (
                      <p className="truncate text-[0.75rem] text-ink-muted">{row.notes}</p>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={OPEN_STATUSES.has(row.status ?? 'new') ? 'warn' : 'good'}>
                      {row.status ?? 'new'}
                    </Badge>
                  </Td>
                  <Td className="text-right text-[0.8125rem] whitespace-nowrap text-ink-muted">
                    {formatDate(row.created_at)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>

      <InboxDetail
        record={selected}
        kind={tab}
        onClose={() => setSelected(null)}
        onSaved={() => {
          // The list is cached by path; drop it so the new status shows at once.
          invalidate(active.path)
          refetch()
        }}
      />
    </>
  )
}
