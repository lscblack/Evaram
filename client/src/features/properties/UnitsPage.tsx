import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DoorOpen } from 'lucide-react'
import { api } from '@/shared/api/client'
import { useAuth } from '@/shared/auth/AuthProvider'
import type { Page, UnitOut } from '@/shared/api/types'
import { useUrlState } from '@/shared/lib/useUrlState'
import { statusLabel } from '@/shared/ui/Badge'
import { Card } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Select } from '@/shared/ui/Form'
import { FilterBar, SearchInput, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { UNIT_STATUSES, usePropertyOptions } from './shared'
import { unitColumns, UnitMobileRow } from './unitList'

const PAGE_SIZE = 25

export default function UnitsPage() {
  const [state, set] = useUrlState({ tab: 'active', search: '', status: '', currency: '', property: '', published: '', listed: '' })
  const properties = usePropertyOptions()
  const query = useQuery({
    queryKey: ['units', 'list', state],
    queryFn: () =>
      api.get<Page<UnitOut>>('/units', {
        archived: state.tab === 'archived',
        search: state.search,
        status: state.status,
        currency: state.currency,
        property_id: state.property,
        published: state.published,
        listed: state.listed,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const { can } = useAuth()
  const base = unitColumns({ manage: can('properties.manage') && state.tab !== 'archived' })
  const columns: Column<UnitOut>[] = [
    base[0],
    {
      key: 'property',
      header: 'Property',
      cell: (u) => (
        <div>
          <p className="text-slate-800">{u.property.name}</p>
          <p className="text-xs text-slate-500">{[u.property.sector, u.property.district].filter(Boolean).join(', ')}</p>
        </div>
      ),
    },
    ...base.slice(1),
  ]

  return (
    <>
      <PageHeader title="Rental units" description="Every rentable house, apartment and room, with its status and current tenant." />
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
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Search code, name or property" className="sm:w-72" />
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Select value={state.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status" className="sm:w-40">
              <option value="">All statuses</option>
              {UNIT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </Select>
            <Select value={state.property} onChange={(e) => set({ property: e.target.value })} aria-label="Property" className="sm:w-48">
              <option value="">All properties</option>
              {properties.data?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
            <Select value={state.currency} onChange={(e) => set({ currency: e.target.value })} aria-label="Currency" className="sm:w-32">
              <option value="">Any currency</option>
              <option value="RWF">RWF</option>
              <option value="USD">USD</option>
            </Select>
            <Select value={state.published} onChange={(e) => set({ published: e.target.value })} aria-label="Published" className="sm:w-40">
              <option value="">Published or not</option>
              <option value="true">Published</option>
              <option value="false">Unpublished</option>
            </Select>
            <Select value={state.listed} onChange={(e) => set({ listed: e.target.value })} aria-label="On website" className="col-span-2 sm:w-44">
              <option value="">Website: any</option>
              <option value="true">On the website now</option>
              <option value="false">Not on the website</option>
            </Select>
          </div>
        </FilterBar>
        <DataView
          rows={query.data?.items}
          columns={columns}
          rowKey={(u) => u.id}
          rowHref={(u) => `/admin/units/${u.id}`}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={<EmptyState icon={DoorOpen} title="No units match" description="Adjust the filters, or add units from a property's page." />}
          mobile={(u) => (
            <div>
              <UnitMobileRow u={u} />
              <p className="mt-0.5 truncate text-xs text-slate-400">{u.property.name}</p>
            </div>
          )}
          footer={<Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />}
        />
      </Card>
    </>
  )
}
