import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Archive, DoorOpen, MapPin, Pencil, Plus } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { HistoryEntry, PropertyDetail } from '@/shared/api/types'
import { useAuth } from '@/shared/auth/AuthProvider'
import { PROPERTY_TYPE_LABEL, USAGE_LABEL } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge } from '@/shared/ui/Badge'
import { Button, ButtonLink } from '@/shared/ui/Button'
import { Card, DescriptionList, StatCard } from '@/shared/ui/Card'
import { DataView } from '@/shared/ui/DataView'
import { ConfirmDialog } from '@/shared/ui/Dialog'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { FullPageSpinner } from '@/shared/ui/Spinner'
import { PhotoManager } from './PhotoManager'
import { HistoryTimeline } from './shared'
import { unitColumns, UnitMobileRow } from './unitList'
import { UnitFormDialog } from './UnitFormDialog'
import { DeleteRecordButton } from '@/shared/ui/DeleteRecord'

type Tab = 'units' | 'photos' | 'details' | 'history'

export default function PropertyDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { can } = useAuth()
  const [tab, setTab] = useState<Tab>('units')
  const [addUnit, setAddUnit] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const query = useQuery({ queryKey: ['properties', 'detail', id], queryFn: () => api.get<PropertyDetail>(`/properties/${id}`) })
  const history = useQuery({
    queryKey: ['properties', 'history', id],
    queryFn: () => api.get<HistoryEntry[]>(`/properties/${id}/history`),
    enabled: tab === 'history',
  })
  const archive = useApiMutation(() => api.post<PropertyDetail>(`/properties/${id}/archive`), {
    success: 'Property archived',
    invalidate: [['properties'], ['units'], ['availability']],
    onSuccess: () => setArchiving(false),
  })

  if (query.isLoading) return <FullPageSpinner />
  if (query.error || !query.data) return <ErrorState error={query.error} onRetry={query.refetch} />
  const p = query.data
  const manage = can('properties.manage') && !p.is_archived
  const c = p.unit_counts
  const location = [p.sector, p.district, p.city].filter(Boolean).join(', ')

  return (
    <>
      <PageHeader
        back={{ to: '/admin/properties', label: 'Properties' }}
        title={p.name}
        meta={
          <>
            <Badge tone="brand">{p.code}</Badge>
            <Badge>{PROPERTY_TYPE_LABEL[p.property_type] ?? p.property_type}</Badge>
            <Badge tone={p.usage === 'commercial' ? 'gold' : p.usage === 'mixed' ? 'info' : 'neutral'}>{USAGE_LABEL[p.usage ?? 'residential']}</Badge>
            {p.is_archived ? <Badge tone="warning">Archived</Badge> : null}
            {location ? (
              <span className="inline-flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="size-4" /> {location}
              </span>
            ) : null}
          </>
        }
        actions={
          manage ? (
            <>
              <ButtonLink to={`/admin/properties/${p.id}/edit`} variant="outline" icon={Pencil}>
                Edit
              </ButtonLink>
              <Button variant="outline" icon={Archive} onClick={() => setArchiving(true)}>
                Archive
              </Button>
              <Button icon={Plus} onClick={() => setAddUnit(true)}>
                Add unit
              </Button>
              <DeleteRecordButton kind="property" id={p.id} name={p.name} redirectTo="/admin/properties" />
            </>
          ) : (
            <DeleteRecordButton kind="property" id={p.id} name={p.name} redirectTo="/admin/properties" />
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Units" value={c?.total ?? 0} icon={DoorOpen} />
        <StatCard label="Occupied" value={c?.occupied ?? 0} tone="gold" />
        <StatCard label="Available" value={c?.available ?? 0} tone="success" />
        <StatCard label="Turnover / maintenance" value={(c?.turnover ?? 0) + (c?.maintenance ?? 0)} tone="warning" />
      </div>

      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'units', label: 'Units', count: p.units?.length ?? 0 },
              { value: 'photos', label: 'Photos', count: p.images?.length ?? 0 },
              { value: 'details', label: 'Details' },
              { value: 'history', label: 'History' },
            ]}
          />
        </div>
        {tab === 'units' ? (
          <DataView
            rows={p.units ?? []}
            columns={unitColumns()}
            rowKey={(u) => u.id}
            rowHref={(u) => `/admin/units/${u.id}`}
            mobile={(u) => <UnitMobileRow u={u} />}
            empty={
              <EmptyState
                icon={DoorOpen}
                title="No units yet"
                description="Add the rentable units — whole houses, apartments or individual rooms."
                action={manage ? <Button icon={Plus} onClick={() => setAddUnit(true)}>Add unit</Button> : undefined}
              />
            }
          />
        ) : null}
        {tab === 'photos' ? (
          <div className="p-4 sm:p-5">
            <PhotoManager propertyId={p.id} images={p.images ?? []} units={p.units ?? []} readOnly={p.is_archived} />
          </div>
        ) : null}
        {tab === 'details' ? (
          <div className="p-4 sm:p-5">
            <DescriptionList
              items={[
                { label: 'Code', value: <span className="font-mono">{p.code}</span> },
                { label: 'Type', value: PROPERTY_TYPE_LABEL[p.property_type] ?? p.property_type },
                { label: 'Let for', value: USAGE_LABEL[p.usage ?? 'residential'] },
                { label: 'City', value: p.city || '—' },
                { label: 'District', value: p.district || '—' },
                { label: 'Sector', value: p.sector || '—' },
                { label: 'Cell', value: p.cell || '—' },
                { label: 'Village', value: p.village || '—' },
                { label: 'Address', value: p.address || '—' },
                {
                  label: 'Amenities',
                  full: true,
                  value: p.amenities?.length ? (
                    <span className="flex flex-wrap gap-1.5">
                      {p.amenities.map((a) => (
                        <Badge key={a}>{a}</Badge>
                      ))}
                    </span>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Description', full: true, value: <span className="whitespace-pre-line">{p.description || '—'}</span> },
              ]}
            />
          </div>
        ) : null}
        {tab === 'history' ? (
          <div className="p-4 sm:p-5">
            {history.error ? <ErrorState error={history.error} onRetry={history.refetch} /> : <HistoryTimeline entries={history.data} loading={history.isLoading} />}
          </div>
        ) : null}
      </Card>

      <UnitFormDialog
        open={addUnit}
        onClose={() => setAddUnit(false)}
        propertyId={p.id}
        propertyUsage={p.usage}
        parents={p.units ?? []}
        onSaved={(u) => navigate(`/admin/units/${u.id}`)}
      />
      <ConfirmDialog
        open={archiving}
        onClose={() => setArchiving(false)}
        onConfirm={() => archive.mutate(undefined)}
        title={`Archive ${p.name}?`}
        description="All its units are archived and removed from the website. Codes stay reserved and history is kept. Units with active agreements or awaiting move-out must be cleared first."
        confirmLabel="Archive property"
        tone="danger"
        loading={archive.isPending}
        error={archive.errorText}
      />
    </>
  )
}
