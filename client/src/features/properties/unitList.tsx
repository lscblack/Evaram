import { Link } from 'react-router'
import type { UnitOut } from '@/shared/api/types'
import { UNIT_TYPE_LABEL } from '@/shared/lib/format'
import { StatusBadge } from '@/shared/ui/Badge'
import type { Column } from '@/shared/ui/DataView'
import { Money } from '@/shared/ui/Misc'
import { ListedIndicator } from './shared'
import { MarketButton } from './UnitActions'

/** Unit table columns; `manage` adds a one-click market action under the website status. */
export function unitColumns({ manage = false }: { manage?: boolean } = {}): Column<UnitOut>[] {
  return [
    {
      key: 'unit',
      header: 'Unit',
      cell: (u) => (
        <div>
          <p className="font-medium text-slate-900">
            <span className="font-mono">{u.code}</span> · {u.name}
          </p>
          <p className="text-xs text-slate-500">
            {UNIT_TYPE_LABEL[u.unit_type]}
            {u.bedrooms ? ` · ${u.bedrooms} bed` : ''}
            {u.parent_code ? ` · inside ${u.parent_code}` : ''}
          </p>
        </div>
      ),
    },
    { key: 'rent', header: 'Monthly rent', align: 'right', cell: (u) => <Money amount={u.monthly_rent} currency={u.currency} /> },
    { key: 'status', header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
    {
      key: 'web',
      header: 'Website',
      cell: (u) => (
        <div className="flex flex-col items-start gap-1.5">
          <ListedIndicator listed={!!u.is_publicly_listed} />
          {manage ? <MarketButton unit={u} size="sm" /> : null}
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Tenant',
      cell: (u) =>
        u.occupancy ? (
          <Link to={`/admin/tenants/${u.occupancy.tenant_id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-brand-700 hover:underline">
            {u.occupancy.tenant_name}
          </Link>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
  ]
}

export function UnitMobileRow({ u }: { u: UnitOut }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-medium text-slate-900">
          <span className="font-mono">{u.code}</span> · {u.name}
        </p>
        <StatusBadge status={u.status} />
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <span>
          {UNIT_TYPE_LABEL[u.unit_type]} · <Money amount={u.monthly_rent} currency={u.currency} className="text-slate-700" />
        </span>
        {u.occupancy ? <span className="truncate">{u.occupancy.tenant_name}</span> : u.is_publicly_listed ? <ListedIndicator listed /> : null}
      </div>
    </div>
  )
}
