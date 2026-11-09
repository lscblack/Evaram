import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Building, DoorOpen, KeyRound, Plus } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { Page, PropertyOut } from '@/shared/api/types'
import { Can } from '@/shared/auth/AuthProvider'
import { ButtonLink } from '@/shared/ui/Button'
import { StatCard } from '@/shared/ui/Card'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { OccupancyBar, Thumb } from './shared'

/** Multi-unit buildings: property type "building" or any property with more than one unit. */
export default function BuildingsPage() {
  const buildings = useQuery({
    queryKey: ['properties', 'buildings'],
    queryFn: async () => {
      const [typed, multi] = await Promise.all([
        api.get<Page<PropertyOut>>('/properties', { property_type: 'building', page_size: 200 }),
        api.get<Page<PropertyOut>>('/properties', { multi_unit: true, page_size: 200 }),
      ])
      const map = new Map<number, PropertyOut>()
      for (const p of [...typed.items, ...multi.items]) map.set(p.id, p)
      return [...map.values()].sort((a, b) => a.code.localeCompare(b.code))
    },
  })

  const rows = buildings.data ?? []
  const totals = rows.reduce(
    (acc, p) => {
      const c = p.unit_counts
      acc.units += c?.total ?? 0
      acc.occupied += c?.occupied ?? 0
      acc.available += c?.available ?? 0
      return acc
    },
    { units: 0, occupied: 0, available: 0 },
  )

  return (
    <>
      <PageHeader
        title="Buildings"
        description="Apartment blocks and other properties with several rentable units."
        actions={
          <Can perm="properties.manage">
            <ButtonLink to="/admin/properties/new" icon={Plus}>
              Add property
            </ButtonLink>
          </Can>
        }
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Buildings" value={rows.length} icon={Building} />
        <StatCard label="Units" value={totals.units} icon={DoorOpen} />
        <StatCard label="Occupied" value={totals.occupied} icon={KeyRound} tone="gold" />
        <StatCard label="Available" value={totals.available} icon={DoorOpen} tone="success" />
      </div>
      {buildings.error ? (
        <ErrorState error={buildings.error} onRetry={buildings.refetch} />
      ) : buildings.isLoading ? (
        <SkeletonRows />
      ) : !rows.length ? (
        <EmptyState icon={Building} title="No buildings yet" description="Add a property of type “Building” and its units." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => {
            const c = p.unit_counts
            return (
              <li key={p.id}>
                <Link to={`/admin/properties/${p.id}`} className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300">
                  <div className="flex gap-3">
                    <Thumb url={p.cover_url} alt={p.name} className="size-14" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{p.name}</p>
                      <p className="truncate text-sm text-slate-500">
                        <span className="font-mono">{p.code}</span> · {[p.sector, p.district].filter(Boolean).join(', ') || p.city}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <OccupancyBar occupied={c?.occupied ?? 0} total={c?.total ?? 0} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    {[
                      ['Available', c?.available ?? 0, 'text-emerald-700'],
                      ['Turnover', c?.turnover ?? 0, 'text-amber-700'],
                      ['Maintenance', c?.maintenance ?? 0, 'text-slate-700'],
                    ].map(([label, n, cls]) => (
                      <div key={label as string} className="rounded-lg bg-slate-50 py-2">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className={`text-base font-semibold tabular ${cls}`}>{n}</dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
