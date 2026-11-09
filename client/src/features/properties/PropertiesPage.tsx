import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { Page, PropertyOut } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { PROPERTY_TYPE_LABEL } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { Badge } from '@/shared/ui/Badge'
import { ButtonLink } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Input, Select } from '@/shared/ui/Form'
import { FilterBar, SearchInput, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { PROPERTY_TYPES, Thumb } from './shared'

const PAGE_SIZE = 25

export function UnitCountsCell({ p }: { p: PropertyOut }) {
  const c = p.unit_counts ?? { total: 0, occupied: 0, available: 0 }
  return (
    <span className="text-sm text-slate-600 tabular">
      <span className="font-semibold text-slate-900">{c.total}</span> units · {c.occupied} occupied ·{' '}
      <span className={c.available ? 'font-medium text-emerald-700' : ''}>{c.available} available</span>
    </span>
  )
}

function location(p: PropertyOut) {
  return [p.sector, p.district, p.city].filter(Boolean).join(', ') || '—'
}

export default function PropertiesPage() {
  const [state, set] = useUrlState({ tab: 'active', search: '', type: '', district: '' })
  const query = useQuery({
    queryKey: ['properties', 'list', state],
    queryFn: () =>
      api.get<Page<PropertyOut>>('/properties', {
        archived: state.tab === 'archived',
        search: state.search,
        property_type: state.type,
        district: state.district,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<PropertyOut>[] = [
    {
      key: 'property',
      header: 'Property',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <Thumb url={p.cover_url} alt={p.name} className="size-11" />
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{p.name}</p>
            <p className="font-mono text-xs text-slate-500">{p.code}</p>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', cell: (p) => PROPERTY_TYPE_LABEL[p.property_type] ?? p.property_type },
    { key: 'location', header: 'Location', cell: (p) => location(p) },
    { key: 'units', header: 'Units', cell: (p) => <UnitCountsCell p={p} /> },
  ]

  return (
    <>
      <PageHeader
        title="Properties"
        description="Buildings, houses and compounds in the portfolio."
        actions={
          <Can perm="properties.manage">
            <ButtonLink to="/admin/properties/new" icon={Plus}>
              Add property
            </ButtonLink>
          </Can>
        }
      />
      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs
            value={state.tab}
            onChange={(v) => set({ tab: v })}
            tabs={[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
        <FilterBar>
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Search name, code or area" className="sm:w-72" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={state.type} onChange={(e) => set({ type: e.target.value })} aria-label="Property type" className="sm:w-48">
              <option value="">All types</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {PROPERTY_TYPE_LABEL[t.value]}
                </option>
              ))}
            </Select>
            <Input
              defaultValue={state.district}
              key={state.district}
              onBlur={(e) => set({ district: e.target.value.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && set({ district: (e.target as HTMLInputElement).value.trim() })}
              placeholder="District"
              aria-label="District"
              className="sm:w-40"
            />
          </div>
        </FilterBar>
        <DataView
          rows={query.data?.items}
          columns={columns}
          rowKey={(p) => p.id}
          rowHref={(p) => `/admin/properties/${p.id}`}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={
            <EmptyState
              icon={Building2}
              title={state.tab === 'archived' ? 'No archived properties' : 'No properties found'}
              description={state.tab === 'archived' ? undefined : 'Add your first building or house to start managing units.'}
            />
          }
          mobile={(p) => (
            <div className="flex gap-3">
              <Thumb url={p.cover_url} alt={p.name} className="size-14" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-slate-900">{p.name}</p>
                  <Badge tone="brand">{p.code}</Badge>
                </div>
                <p className="truncate text-sm text-slate-500">
                  {PROPERTY_TYPE_LABEL[p.property_type]} · {location(p)}
                </p>
                <div className="mt-1">
                  <UnitCountsCell p={p} />
                </div>
              </div>
            </div>
          )}
          footer={<Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />}
        />
      </Card>
    </>
  )
}
