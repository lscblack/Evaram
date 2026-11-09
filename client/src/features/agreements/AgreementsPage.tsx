import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { FilePlus2, FileText } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementOut, Page } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { formatMoney } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { Badge, StatusBadge } from '@/shared/ui/Badge'
import { ButtonLink } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { EmptyState } from '@/shared/ui/EmptyState'
import { FilterBar, SearchInput, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { ExpiryHint, period } from './shared'

const PAGE_SIZE = 25
type Tab = 'active' | 'draft' | 'expiring' | 'moveout' | 'expired' | 'terminated' | 'all'

const TAB_QUERY: Record<Tab, Record<string, string | number | boolean | undefined>> = {
  active: { status: 'active' },
  draft: { status: 'draft' },
  expiring: { expiring_within_days: 60 },
  moveout: { awaiting_move_out: true },
  expired: { status: 'expired' },
  terminated: { status: 'terminated' },
  all: {},
}

export default function AgreementsPage() {
  const [state, set] = useUrlState({ tab: 'active', search: '' })
  const tab = state.tab as Tab
  const query = useQuery({
    queryKey: ['agreements', state],
    queryFn: () =>
      api.get<Page<AgreementOut>>('/agreements', {
        ...TAB_QUERY[tab],
        search: state.search,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<AgreementOut>[] = [
    { key: 'num', header: 'Agreement', cell: (a) => <span className="font-medium text-slate-900">{a.agreement_number}</span> },
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (a) => (
        <div>
          <p className="font-medium text-slate-800">{a.tenant_name}</p>
          <p className="text-slate-500">{a.tenant_phone}</p>
        </div>
      ),
    },
    {
      key: 'unit',
      header: 'Unit',
      cell: (a) => (
        <div>
          <p className="font-medium text-slate-800">{a.unit_code}</p>
          <p className="text-slate-500">{a.property_name}</p>
        </div>
      ),
    },
    { key: 'period', header: 'Period', cell: (a) => <span className="whitespace-nowrap">{period(a)}</span> },
    { key: 'rent', header: 'Monthly rent', align: 'right', cell: (a) => formatMoney(a.monthly_rent, a.currency) },
    {
      key: 'status',
      header: 'Status',
      cell: (a) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={a.status} />
          <ExpiryHint a={a} />
          {a.awaiting_move_out ? <Badge tone="warning">Move-out pending</Badge> : null}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Rental agreements"
        description="Tenancies across all units. Activating an agreement marks its unit occupied."
        actions={
          <Can perm="agreements.manage">
            <ButtonLink to="/admin/agreements/new" icon={FilePlus2}>
              New agreement
            </ButtonLink>
          </Can>
        }
      />
      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs<Tab>
            value={tab}
            onChange={(v) => set({ tab: v })}
            tabs={[
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'expiring', label: 'Expiring soon' },
              { value: 'moveout', label: 'Awaiting move-out' },
              { value: 'expired', label: 'Expired' },
              { value: 'terminated', label: 'Terminated' },
              { value: 'all', label: 'All' },
            ]}
          />
        </div>
        <FilterBar>
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Search number, tenant, unit or property" className="sm:w-96" />
        </FilterBar>
        <DataView
          rows={query.data?.items}
          columns={columns}
          rowKey={(a) => a.id}
          rowHref={(a) => `/admin/agreements/${a.id}`}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={<EmptyState icon={FileText} title="No agreements here" description="Agreements matching this view will appear here." />}
          mobile={(a) => (
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{a.tenant_name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {a.unit_code} · {a.property_name}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-1 text-sm text-slate-600">{period(a)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium tabular text-slate-800">{formatMoney(a.monthly_rent, a.currency)} / month</span>
                <ExpiryHint a={a} />
                {a.awaiting_move_out ? <Badge tone="warning">Move-out pending</Badge> : null}
              </div>
            </div>
          )}
          footer={<Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />}
        />
      </Card>
    </>
  )
}
