import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { BellOff, CheckCheck } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { NotificationOut, Page } from '@/shared/api/types'
import { formatDateTime, relativeTime } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { useUrlState } from '@/shared/lib/useUrlState'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Pagination } from '@/shared/ui/DataView'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'

const PAGE_SIZE = 25

export default function NotificationsPage() {
  const [state, set] = useUrlState({ filter: 'all' })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const q = useQuery({
    queryKey: ['notifications', 'page', state],
    queryFn: () =>
      api.get<Page<NotificationOut>>('/notifications', { unread_only: state.filter === 'unread' || undefined, page: state.page, page_size: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  })
  const readAll = useApiMutation(() => api.post('/notifications/read-all'), { success: 'All notifications marked as read', invalidate: [['notifications']] })

  async function open(n: NotificationOut) {
    if (!n.read_at) {
      await api.post(`/notifications/${n.id}/read`)
      qc.invalidateQueries({ queryKey: ['notifications'] })
    }
    if (n.link) navigate(n.link)
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alerts about pending payments, overdue rent, expiring agreements and viewing requests."
        actions={<Button variant="outline" icon={CheckCheck} loading={readAll.isPending} onClick={() => readAll.mutate(undefined)}>Mark all read</Button>}
      />
      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs value={state.filter} onChange={(v) => set({ filter: v })} tabs={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread' }]} />
        </div>
        {q.error ? (
          <ErrorState error={q.error} onRetry={q.refetch} />
        ) : !q.data ? (
          <SkeletonRows />
        ) : q.data.items.length === 0 ? (
          <EmptyState icon={BellOff} title={state.filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {q.data.items.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => open(n)} className={cn('flex w-full gap-3 px-4 py-3.5 text-left hover:bg-slate-50 sm:px-5', !n.read_at && 'bg-gold-50/40')}>
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-slate-200' : 'bg-gold-500')} />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm', n.read_at ? 'text-slate-700' : 'font-semibold text-slate-900')}>{n.title}</span>
                      {n.body ? <span className="block text-sm text-slate-500">{n.body}</span> : null}
                      <span className="mt-0.5 block text-xs text-slate-400" title={formatDateTime(n.created_at)}>{relativeTime(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={q.data.total} onPage={(p) => set({ page: String(p) })} />
          </>
        )}
      </Card>
    </>
  )
}
