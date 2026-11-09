import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, DoorOpen, Globe, GlobeLock, KeyRound, Lock, RefreshCcw, Wrench } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AvailabilitySummary, Page, UnitOut } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader, StatCard } from '@/shared/ui/Card'
import { DataView, type Column } from '@/shared/ui/DataView'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Money } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { StatusDialog, usePublishToggle } from './UnitActions'

type Row = { property_id: number; code: string; name: string; total: number; available: number; occupied: number; reserved: number; turnover: number; maintenance: number; off_market: number }

function PublishButton({ unit }: { unit: UnitOut }) {
  const publish = usePublishToggle(unit)
  return (
    <Button size="sm" variant="outline" icon={Globe} loading={publish.isPending} onClick={() => publish.mutate(undefined)}>
      Publish
    </Button>
  )
}

export default function AvailabilityPage() {
  const { can } = useAuth()
  const manage = can('properties.manage')
  const [readyUnit, setReadyUnit] = useState<UnitOut | null>(null)

  const summary = useQuery({ queryKey: ['availability'], queryFn: () => api.get<AvailabilitySummary>('/availability') })
  const turnover = useQuery({
    queryKey: ['units', 'list', 'turnover'],
    queryFn: () => api.get<Page<UnitOut>>('/units', { status: 'turnover', page_size: 100 }),
  })
  const unpublished = useQuery({
    queryKey: ['units', 'list', 'available-unpublished'],
    queryFn: () => api.get<Page<UnitOut>>('/units', { status: 'available', published: false, page_size: 100 }),
  })

  if (summary.error) return <ErrorState error={summary.error} onRetry={summary.refetch} />
  const c = summary.data?.counts
  const rows = (summary.data?.by_property ?? []) as Row[]

  const columns: Column<Row>[] = [
    {
      key: 'p',
      header: 'Property',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="font-mono text-xs text-slate-500">{r.code}</p>
        </div>
      ),
    },
    { key: 'total', header: 'Units', align: 'right', cell: (r) => r.total },
    { key: 'available', header: 'Available', align: 'right', cell: (r) => <span className={r.available ? 'font-semibold text-emerald-700' : ''}>{r.available}</span> },
    { key: 'occupied', header: 'Occupied', align: 'right', cell: (r) => r.occupied },
    { key: 'reserved', header: 'Reserved', align: 'right', cell: (r) => r.reserved },
    { key: 'turnover', header: 'Turnover', align: 'right', cell: (r) => <span className={r.turnover ? 'font-semibold text-amber-700' : ''}>{r.turnover}</span> },
    { key: 'maintenance', header: 'Maintenance', align: 'right', cell: (r) => r.maintenance },
    { key: 'off', header: 'Off market', align: 'right', cell: (r) => r.off_market },
  ]

  return (
    <>
      <PageHeader title="Availability" description="What can be let right now, and what needs attention before it can." />
      {summary.isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
          <StatCard label="Available" value={c?.available ?? 0} icon={DoorOpen} tone="success" to="/admin/units?status=available" />
          <StatCard label="On website" value={summary.data?.publicly_listed ?? 0} icon={Globe} to="/admin/units?listed=true" />
          <StatCard label="Occupied" value={c?.occupied ?? 0} icon={KeyRound} tone="gold" to="/admin/units?status=occupied" />
          <StatCard label="Reserved" value={c?.reserved ?? 0} icon={Lock} to="/admin/units?status=reserved" />
          <StatCard label="Turnover" value={c?.turnover ?? 0} icon={RefreshCcw} tone="warning" to="/admin/units?status=turnover" />
          <StatCard label="Maintenance" value={c?.maintenance ?? 0} icon={Wrench} tone="warning" to="/admin/units?status=maintenance" />
          <StatCard label="Off market" value={c?.off_market ?? 0} icon={GlobeLock} to="/admin/units?status=off_market" />
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card padded={false}>
          <div className="px-4 pt-4 sm:px-5">
            <CardHeader title="Awaiting inspection" description="Tenants have moved out. Inspect, then mark ready to let." />
          </div>
          <UnitActionList
            query={turnover}
            empty="No units are waiting for inspection."
            action={(u) =>
              manage ? (
                <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => setReadyUnit(u)}>
                  Mark ready
                </Button>
              ) : null
            }
          />
        </Card>
        <Card padded={false}>
          <div className="px-4 pt-4 sm:px-5">
            <CardHeader title="Available but not published" description="Ready to let, yet hidden from the website." />
          </div>
          <UnitActionList query={unpublished} empty="Every available unit is published." action={(u) => (manage ? <PublishButton unit={u} /> : null)} />
        </Card>
      </div>

      <Card padded={false}>
        <div className="px-4 pt-4 sm:px-5">
          <CardHeader title="By property" />
        </div>
        <DataView
          rows={rows}
          columns={columns}
          rowKey={(r) => r.property_id}
          rowHref={(r) => `/admin/properties/${r.property_id}`}
          loading={summary.isLoading}
          empty={<EmptyState icon={DoorOpen} title="No units yet" />}
          mobile={(r) => (
            <div>
              <p className="font-medium text-slate-900">
                {r.name} <span className="font-mono text-xs text-slate-500">{r.code}</span>
              </p>
              <p className="mt-0.5 text-sm text-slate-500 tabular">
                {r.total} units · <span className="text-emerald-700">{r.available} available</span> · {r.occupied} occupied
                {r.turnover ? <span className="text-amber-700"> · {r.turnover} turnover</span> : null}
              </p>
            </div>
          )}
        />
      </Card>
      {readyUnit ? <StatusDialog unit={readyUnit} open onClose={() => setReadyUnit(null)} /> : null}
    </>
  )
}

function UnitActionList({
  query,
  empty,
  action,
}: {
  query: { data?: Page<UnitOut>; isLoading: boolean; error: unknown; refetch: () => void }
  empty: string
  action: (u: UnitOut) => ReactNode
}) {
  if (query.error) return <ErrorState error={query.error} onRetry={query.refetch} />
  if (query.isLoading) return <SkeletonRows rows={2} />
  const items = query.data?.items ?? []
  if (!items.length) return <p className="px-4 pb-5 text-sm text-slate-500 sm:px-5">{empty}</p>
  return (
    <ul className="divide-y divide-slate-100 border-t border-slate-100">
      {items.map((u) => (
        <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link to={`/admin/units/${u.id}`} className="min-w-0">
            <p className="truncate font-medium text-slate-900">
              <span className="font-mono">{u.code}</span> · {u.name}
            </p>
            <p className="truncate text-sm text-slate-500">
              {u.property.name} · <Money amount={u.monthly_rent} currency={u.currency} />
            </p>
          </Link>
          <div className="shrink-0">{action(u)}</div>
        </li>
      ))}
    </ul>
  )
}
