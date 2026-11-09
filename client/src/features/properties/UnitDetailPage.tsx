import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Archive, CircleAlert, ExternalLink, FilePlus2, Globe, GlobeLock, Pencil, RefreshCcw, Sparkles } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { HistoryEntry, PropertyDetail, UnitDetail } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { formatDate, TOILET_LABEL, UNIT_TYPE_LABEL } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge, StatusBadge } from '@/shared/ui/Badge'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Card, CardHeader, DescriptionList } from '@/shared/ui/Card'
import { DataView } from '@/shared/ui/DataView'
import { ConfirmDialog } from '@/shared/ui/Dialog'
import { ErrorState } from '@/shared/ui/EmptyState'
import { Money, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { PhotoManager } from './PhotoManager'
import { HistoryTimeline, ListedIndicator } from './shared'
import { StatusDialog, usePublishToggle } from './UnitActions'
import { UnitFormDialog } from './UnitFormDialog'
import { unitColumns, UnitMobileRow } from './unitList'

type Tab = 'details' | 'photos' | 'history'

export default function UnitDetailPage() {
  const id = Number(useParams().id)
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('details')
  const [editing, setEditing] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const query = useQuery({ queryKey: ['units', 'detail', id], queryFn: () => api.get<UnitDetail>(`/units/${id}`) })
  const unit = query.data
  // Property units are needed to offer "inside unit" parents when editing.
  const property = useQuery({
    queryKey: ['properties', 'detail', unit?.property.id],
    queryFn: () => api.get<PropertyDetail>(`/properties/${unit!.property.id}`),
    enabled: !!unit && (editing || tab === 'photos'),
  })
  const history = useQuery({
    queryKey: ['units', 'history', id],
    queryFn: () => api.get<HistoryEntry[]>(`/units/${id}/history`),
    enabled: tab === 'history',
  })
  const archive = useApiMutation(() => api.post<UnitDetail>(`/units/${id}/archive`), {
    success: 'Unit archived',
    invalidate: [['units'], ['properties'], ['availability']],
    onSuccess: () => setArchiving(false),
  })

  if (query.isLoading) return <FullPageSpinner />
  if (query.error || !unit) return <ErrorState error={query.error} onRetry={query.refetch} />

  return (
    <UnitView
      unit={unit}
      tab={tab}
      setTab={setTab}
      manage={can('properties.manage') && !unit.is_archived}
      canCreateAgreement={can('agreements.manage')}
      onEdit={() => setEditing(true)}
      onStatus={() => setStatusOpen(true)}
      onArchive={() => setArchiving(true)}
      history={history}
      dialogs={
        <>
          <UnitFormDialog
            open={editing}
            onClose={() => setEditing(false)}
            propertyId={unit.property.id}
            propertyUsage={unit.property.usage}
            parents={property.data?.units ?? []}
            unit={unit}
          />
          <StatusDialog unit={unit} open={statusOpen} onClose={() => setStatusOpen(false)} />
          <ConfirmDialog
            open={archiving}
            onClose={() => setArchiving(false)}
            onConfirm={() => archive.mutate(undefined)}
            title={`Archive unit ${unit.code}?`}
            description="The unit is removed from the website and from day-to-day lists. Its code stays reserved forever and its history is kept."
            confirmLabel="Archive unit"
            tone="danger"
            loading={archive.isPending}
            error={archive.errorText}
          />
        </>
      }
    />
  )
}

function UnitView({
  unit,
  tab,
  setTab,
  manage,
  canCreateAgreement,
  onEdit,
  onStatus,
  onArchive,
  history,
  dialogs,
}: {
  unit: UnitDetail
  tab: Tab
  setTab: (t: Tab) => void
  manage: boolean
  canCreateAgreement: boolean
  onEdit: () => void
  onStatus: () => void
  onArchive: () => void
  history: { data?: HistoryEntry[]; isLoading: boolean; error: unknown; refetch: () => void }
  dialogs: ReactNode
}) {
  const publish = usePublishToggle(unit)
  const p = unit.property
  const occupied = !!unit.occupancy
  const lettable = (unit.status === 'available' || unit.status === 'reserved') && !occupied && !unit.blocked_reason?.startsWith('Parent') && !unit.blocked_reason?.startsWith('Room')

  return (
    <>
      <PageHeader
        back={{ to: `/admin/properties/${p.id}`, label: p.name }}
        title={
          <>
            <span className="font-mono">{unit.code}</span> · {unit.name}
          </>
        }
        meta={
          <>
            <StatusBadge status={unit.status} />
            <ListedIndicator listed={!!unit.is_publicly_listed} />
            <Badge>{UNIT_TYPE_LABEL[unit.unit_type]}</Badge>
            {unit.is_featured ? (
              <Badge tone="gold">
                <Sparkles className="size-3" /> Featured
              </Badge>
            ) : null}
            {unit.is_archived ? <Badge tone="warning">Archived</Badge> : null}
          </>
        }
        actions={
          <>
            {unit.is_publicly_listed ? (
              <ButtonLink to={`/listings/${unit.code}`} target="_blank" variant="outline" icon={ExternalLink}>
                View on website
              </ButtonLink>
            ) : null}
            {manage ? (
              <>
                <Button variant="outline" icon={Pencil} onClick={onEdit}>
                  Edit
                </Button>
                <Button variant="outline" icon={unit.is_published ? GlobeLock : Globe} loading={publish.isPending} onClick={() => publish.mutate(undefined)}>
                  {unit.is_published ? 'Unpublish' : 'Publish'}
                </Button>
                {!occupied ? (
                  unit.status === 'turnover' ? (
                    <Button variant="success" icon={RefreshCcw} onClick={onStatus}>
                      Mark ready to let
                    </Button>
                  ) : (
                    <Button variant="outline" icon={RefreshCcw} onClick={onStatus}>
                      Change status
                    </Button>
                  )
                ) : null}
                {!occupied && unit.status !== 'turnover' ? (
                  <Button variant="ghost" icon={Archive} onClick={onArchive}>
                    Archive
                  </Button>
                ) : null}
              </>
            ) : null}
          </>
        }
      />

      {!unit.is_publicly_listed && unit.blocked_reason ? (
        <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Not shown on the website: <strong>{unit.blocked_reason}</strong>.
          </span>
        </div>
      ) : null}
      {unit.status === 'turnover' ? (
        <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>The previous tenant has moved out. Inspect the unit, then mark it ready to let to return it to the market.</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card padded={false}>
            <div className="px-3 sm:px-4">
              <Tabs<Tab>
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: 'details', label: 'Details' },
                  { value: 'photos', label: 'Photos', count: unit.images?.filter((i) => i.unit_id === unit.id).length ?? 0 },
                  { value: 'history', label: 'History' },
                ]}
              />
            </div>
            <div className="p-4 sm:p-5">
              {tab === 'details' ? (
                <DescriptionList
                  items={[
                    { label: 'Monthly rent', value: <Money amount={unit.monthly_rent} currency={unit.currency} className="font-semibold" /> },
                    { label: 'Currency', value: unit.currency },
                    ...(unit.unit_type === 'commercial'
                      ? []
                      : [
                          { label: 'Bedrooms', value: unit.bedrooms },
                          { label: 'Bathrooms', value: unit.bathrooms },
                        ]),
                    { label: 'Toilet', value: TOILET_LABEL[unit.toilet ?? 'private'] },
                    { label: 'Size', value: unit.size_sqm ? `${unit.size_sqm} m²` : '—' },
                    { label: 'Floor', value: unit.floor || '—' },
                    { label: 'Furnished', value: unit.furnished ? 'Yes' : 'No' },
                    {
                      label: 'Inside unit',
                      value: unit.parent_unit_id ? (
                        <Link to={`/admin/units/${unit.parent_unit_id}`} className="font-medium text-brand-700 hover:underline">
                          {unit.parent_code}
                        </Link>
                      ) : (
                        '—'
                      ),
                    },
                    {
                      label: 'Amenities',
                      full: true,
                      value: unit.amenities?.length ? (
                        <span className="flex flex-wrap gap-1.5">
                          {unit.amenities.map((a) => (
                            <Badge key={a}>{a}</Badge>
                          ))}
                        </span>
                      ) : (
                        '—'
                      ),
                    },
                    { label: 'Description', full: true, value: <span className="whitespace-pre-line">{unit.description || '—'}</span> },
                  ]}
                />
              ) : null}
              {tab === 'photos' ? (
                <>
                  <PhotoManager propertyId={p.id} images={unit.images ?? []} fixedUnitId={unit.id} readOnly={!manage} />
                  <p className="mt-4 text-sm text-slate-500">When a unit has no photos of its own, the property's photos are shown on the website.</p>
                </>
              ) : null}
              {tab === 'history' ? (
                history.error ? <ErrorState error={history.error} onRetry={history.refetch} /> : <HistoryTimeline entries={history.data} loading={history.isLoading} />
              ) : null}
            </div>
          </Card>

          {unit.children?.length ? (
            <Card padded={false}>
              <div className="px-4 pt-4 sm:px-5">
                <CardHeader title="Rooms inside this unit" description="Letting the whole unit blocks its rooms, and letting a room blocks the whole unit." />
              </div>
              <DataView rows={unit.children} columns={unitColumns()} rowKey={(u) => u.id} rowHref={(u) => `/admin/units/${u.id}`} mobile={(u) => <UnitMobileRow u={u} />} />
            </Card>
          ) : null}
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Occupancy" />
            {unit.occupancy ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Tenant</p>
                  <Link to={`/admin/tenants/${unit.occupancy.tenant_id}`} className="font-semibold text-brand-700 hover:underline">
                    {unit.occupancy.tenant_name}
                  </Link>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Agreement</p>
                  <Link to={`/admin/agreements/${unit.occupancy.agreement_id}`} className="font-medium text-brand-700 hover:underline">
                    {unit.occupancy.agreement_number}
                  </Link>
                  <p className="text-slate-500">
                    {formatDate(unit.occupancy.start_date)} – {unit.occupancy.end_date ? formatDate(unit.occupancy.end_date) : 'open-ended'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">
                  {unit.status === 'occupied'
                    ? 'The tenancy has ended but the move-out has not been recorded yet.'
                    : 'No active tenancy on this unit.'}
                </p>
                {lettable && canCreateAgreement && !unit.is_archived ? (
                  <ButtonLink to={`/admin/agreements/new?unit=${unit.id}`} icon={FilePlus2} block>
                    Create rental agreement
                  </ButtonLink>
                ) : null}
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Property" />
            <p className="font-medium text-slate-900">{p.name}</p>
            <p className="text-sm text-slate-500">
              <span className="font-mono">{p.code}</span> · {[p.sector, p.district, p.city].filter(Boolean).join(', ')}
            </p>
            <Link to={`/admin/properties/${p.id}`} className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline">
              Open property
            </Link>
          </Card>
          <Card>
            <CardHeader title="Website" />
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between gap-2">
                <span>Published</span>
                <span className="font-medium text-slate-900">{unit.is_published ? 'Yes' : 'No'}</span>
              </li>
              <li className="flex justify-between gap-2">
                <span>Status</span>
                <StatusBadge status={unit.status} />
              </li>
              <li className="flex justify-between gap-2">
                <span>Visible now</span>
                <ListedIndicator listed={!!unit.is_publicly_listed} />
              </li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">Only published units with status “Available” and no tenancy appear on the website.</p>
          </Card>
        </div>
      </div>
      {dialogs}
    </>
  )
}
