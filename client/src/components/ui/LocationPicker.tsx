import { useMemo } from 'react'
import { useQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

export interface Localities {
  districts: { name: string; province: string | null; latitude: number | null; longitude: number | null }[]
  sectors: Record<string, string[]>
  attribution: string
}

/**
 * Rwanda's districts and sectors, loaded once and shared.
 *
 * The whole tree is a few kilobytes and never changes between page loads, so it
 * is fetched once and cached rather than re-queried each time a district is
 * chosen — a dropdown that pauses while it fetches its own options is a
 * dropdown people learn to avoid.
 */
export function useLocalities() {
  const { data } = useQuery<Localities>('/public/localities')
  return {
    districts: data?.districts ?? [],
    sectors: data?.sectors ?? {},
    attribution: data?.attribution ?? '',
  }
}

/** Sectors of one district, or an empty list when none is chosen yet. */
export function useSectors(district: string | undefined | null): string[] {
  const { sectors } = useLocalities()
  return useMemo(() => (district ? (sectors[district] ?? []) : []), [sectors, district])
}

interface Child {
  name: string
  latitude: number | null
  longitude: number | null
}

/**
 * Cells of a sector, or villages of a cell — fetched a parent at a time.
 *
 * There are 2,148 cells and some 15,000 villages. Shipping them with the page
 * so that someone can pick one would be several megabytes to save a request
 * that only happens once a district and sector are already chosen.
 *
 * `district` disambiguates: sector names repeat across the country, and a cell
 * list that merged two identically named sectors would be quietly wrong.
 */
export function useLocalityChildren(
  level: 'cell' | 'village',
  parent: string | undefined | null,
  district?: string | null,
): string[] {
  const path = parent
    ? `/public/localities/${level}?parent=${encodeURIComponent(parent)}` +
      (district ? `&district=${encodeURIComponent(district)}` : '')
    : null
  const { data } = useQuery<{ items: Child[] }>(path)
  return useMemo(() => (data?.items ?? []).map((c) => c.name), [data])
}

/** Cells of one sector. */
export const useCells = (sector?: string | null, district?: string | null) =>
  useLocalityChildren('cell', sector, district)

/** Villages of one cell. */
export const useVillages = (cell?: string | null, district?: string | null) =>
  useLocalityChildren('village', cell, district)

/**
 * A district and its sectors, as two dependent selects.
 *
 * Changing the district clears the sector: a sector belongs to exactly one
 * district, so keeping the old one would leave a listing filed somewhere that
 * does not exist.
 */
export function LocationPicker({
  district,
  sector,
  onDistrictChange,
  onSectorChange,
  className,
  districtLabel = 'District',
  sectorLabel = 'Sector',
  required,
  anyLabel = 'All districts',
}: {
  district: string
  sector: string
  onDistrictChange: (value: string) => void
  onSectorChange: (value: string) => void
  className?: string
  districtLabel?: string
  sectorLabel?: string
  required?: boolean
  anyLabel?: string
}) {
  const { districts } = useLocalities()
  const sectors = useSectors(district)

  // Grouped so a picker of thirty is scanned by province rather than read
  // start to finish.
  const grouped = useMemo(() => {
    const out = new Map<string, string[]>()
    for (const d of districts) out.set(d.province ?? 'Other', [...(out.get(d.province ?? 'Other') ?? []), d.name])
    return [...out.entries()]
  }, [districts])

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
          {districtLabel}
        </span>
        <select
          required={required}
          value={district}
          onChange={(e) => {
            onDistrictChange(e.target.value)
            onSectorChange('')
          }}
          className={FIELD}
        >
          <option value="">{anyLabel}</option>
          {grouped.map(([province, names]) => (
            <optgroup key={province} label={province}>
              {names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
          {sectorLabel}
        </span>
        <select
          value={sector}
          disabled={!district}
          onChange={(e) => onSectorChange(e.target.value)}
          className={cn(FIELD, !district && 'cursor-not-allowed opacity-55')}
        >
          <option value="">{district ? 'All sectors' : 'Choose a district first'}</option>
          {sectors.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

const FIELD =
  'h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink ' +
  'transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none'
