import { useState } from 'react'
import { useNavigate } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { UserPlus, UsersRound } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { Page, TenantOut } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { formatDate } from '@/shared/lib/format'
import { useUrlState } from '@/shared/lib/useUrlState'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DataView, Pagination, type Column } from '@/shared/ui/DataView'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Checkbox } from '@/shared/ui/Form'
import { Avatar, CurrencyAmounts, FilterBar, SearchInput, Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { TenantFormDialog } from './TenantFormDialog'

const PAGE_SIZE = 25
type Tab = 'all' | 'active' | 'former' | 'balance'

function Tenancies({ t }: { t: TenantOut }) {
  if (!t.current_tenancies.length) return <span className="text-slate-400">No current tenancy</span>
  return (
    <span className="flex flex-col">
      {t.current_tenancies.map((c) => (
        <span key={c.agreement_id} className="truncate">
          <span className="font-medium text-slate-800">{c.unit_code}</span>
          <span className="text-slate-500"> · {c.property_name}</span>
        </span>
      ))}
    </span>
  )
}

export default function TenantsPage() {
  const [state, set] = useUrlState({ tab: 'all', search: '', archived: '' })
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const tab = state.tab as Tab

  const query = useQuery({
    queryKey: ['tenants', state],
    queryFn: () =>
      api.get<Page<TenantOut>>('/tenants', {
        search: state.search,
        status: tab === 'active' || tab === 'former' ? tab : undefined,
        with_balance: tab === 'balance' ? true : undefined,
        archived: state.archived === '1' ? true : undefined,
        page: state.page,
        page_size: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  })

  const columns: Column<TenantOut>[] = [
    {
      key: 'name',
      header: 'Tenant',
      cell: (t) => (
        <div className="flex items-center gap-3">
          <Avatar name={t.full_name} />
          <div className="min-w-0">
            <p className="font-medium text-slate-900">{t.full_name}</p>
            <p className="text-slate-500">{t.phone}</p>
          </div>
        </div>
      ),
    },
    { key: 'unit', header: 'Current unit', cell: (t) => <Tenancies t={t} /> },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      cell: (t) => <CurrencyAmounts items={t.outstanding} empty={<span className="text-slate-400">—</span>} lineClassName="font-medium text-red-700" />,
    },
    { key: 'registered', header: 'Registered', cell: (t) => formatDate(t.registered_on) },
  ]

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Everyone who rents or has rented an Evaramu unit."
        actions={
          <Can perm="tenants.manage">
            <Button icon={UserPlus} onClick={() => setCreating(true)}>
              Register tenant
            </Button>
          </Can>
        }
      />
      <Card padded={false}>
        <div className="px-3 sm:px-4">
          <Tabs<Tab>
            value={tab}
            onChange={(v) => set({ tab: v })}
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Current tenants' },
              { value: 'former', label: 'Former' },
              { value: 'balance', label: 'With balance' },
            ]}
          />
        </div>
        <FilterBar>
          <SearchInput value={state.search} onChange={(v) => set({ search: v })} placeholder="Search name, phone or email" className="sm:w-80" />
          <Checkbox
            label="Show archived"
            checked={state.archived === '1'}
            onChange={(e) => set({ archived: e.target.checked ? '1' : '' })}
            className="sm:ml-auto"
          />
        </FilterBar>
        <DataView
          rows={query.data?.items}
          columns={columns}
          rowKey={(t) => t.id}
          rowHref={(t) => `/admin/tenants/${t.id}`}
          loading={query.isFetching}
          error={query.error}
          onRetry={query.refetch}
          empty={
            <EmptyState
              icon={UsersRound}
              title={state.search ? 'No tenants match your search' : 'No tenants yet'}
              description={state.search ? 'Try a different name or phone number.' : 'Register a tenant to start a rental agreement.'}
            />
          }
          mobile={(t) => (
            <div className="flex items-start gap-3">
              <Avatar name={t.full_name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-slate-900">{t.full_name}</p>
                  {t.is_archived ? <Badge>Archived</Badge> : null}
                </div>
                <p className="text-sm text-slate-500">{t.phone}</p>
                <div className="mt-1 text-sm">
                  <Tenancies t={t} />
                </div>
                {t.outstanding.length ? (
                  <div className="mt-1 text-sm">
                    <span className="text-slate-500">Owes </span>
                    <CurrencyAmounts items={t.outstanding} className="inline-flex" lineClassName="font-medium text-red-700" />
                  </div>
                ) : null}
              </div>
            </div>
          )}
          footer={<Pagination page={Number(state.page)} pageSize={PAGE_SIZE} total={query.data?.total ?? 0} onPage={(p) => set({ page: String(p) })} />}
        />
      </Card>
      <TenantFormDialog open={creating} onClose={() => setCreating(false)} onSaved={(t) => navigate(`/admin/tenants/${t.id}`)} />
    </>
  )
}
