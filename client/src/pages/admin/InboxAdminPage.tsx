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
import { useLiveQuery } from '@/lib/queries'
import { cn, formatDate } from '@/lib/utils'
import type { Page } from '@/types/api'

type Tab = 'enquiries' | 'contact' | 'bookings' | 'applications'

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: 'enquiries', label: 'Property enquiries', path: '/admin/enquiries' },
  { id: 'contact', label: 'Messages', path: '/admin/enquiries' },
  { id: 'bookings', label: 'Bookings', path: '/admin/bookings' },
  { id: 'applications', label: 'Applications', path: '/admin/applications' },
]

interface InboxRow {
  id: string
  name?: string
  full_name?: string
  email?: string | null
  phone?: string | null
  message?: string | null
  status?: string
  role_applied?: string | null
  scheduled_date?: string | null
  scheduled_time?: string | null
  created_at: string
}

/** Everything that came in from the public site, refreshed while you watch. */
export default function InboxAdminPage() {
  const [tab, setTab] = useState<Tab>('enquiries')
  const active = TABS.find((t) => t.id === tab) ?? TABS[0]

  const { data, loading } = useLiveQuery<Page<InboxRow>>(`${active.path}?per_page=48`, 20_000)
  const rows = data?.items ?? []

  return (
    <>
      <PageHeader
        title="Inbox"
        description="Enquiries, messages, bookings and applications, newest first."
      />

      <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.filter((t) => t.id !== 'contact').map((t) => (
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
                <tr key={row.id} className="transition-colors hover:bg-canvas-alt">
                  <Td>
                    <p className="font-semibold text-ink">{row.full_name ?? row.name ?? '—'}</p>
                    <p className="text-[0.75rem] text-ink-muted">
                      {row.email ?? row.phone ?? 'No contact given'}
                    </p>
                  </Td>
                  <Td className="max-w-md">
                    <p className="truncate text-ink-soft">
                      {row.message ??
                        row.role_applied ??
                        (row.scheduled_date
                          ? `${row.scheduled_date} at ${row.scheduled_time}`
                          : '—')}
                    </p>
                  </Td>
                  <Td>
                    <Badge tone={row.status === 'new' || row.status === 'pending' ? 'warn' : 'good'}>
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
    </>
  )
}
