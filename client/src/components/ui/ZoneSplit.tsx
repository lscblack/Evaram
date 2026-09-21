import { UNZONED_COLOR, zoneFor, zoneInk } from '@/data/masterPlan'
import type { MasterPlanShare } from '@/types/api'
import { cn } from '@/lib/utils'

/**
 * How the Master Plan divides a parcel — a proportioned bar and a legend.
 *
 * A plot that is two-thirds residential and one-third road reserve is a very
 * different purchase from one that is all residential, and a single zone name
 * hides that. Shares are drawn to scale against the largest total the data
 * offers, so a road reserve reads as the slice it actually is.
 */
export function ZoneSplit({
  zones,
  totalSqm,
  compact,
  className,
}: {
  zones: MasterPlanShare[]
  /** The plot size, when the shares are known to add up to it. */
  totalSqm?: number | null
  compact?: boolean
  className?: string
}) {
  const shares = zones.filter((z) => z.zone)
  if (!shares.length) return null

  const sum = shares.reduce((s, z) => s + (z.area_sqm ?? 0), 0)
  const total = Math.max(sum, totalSqm ?? 0)
  const measured = total > 0

  return (
    <div className={cn('min-w-0', className)}>
      {measured && (
        <div
          role="img"
          aria-label={shares
            .map((z) => `${zoneFor(z.zone)?.code ?? z.zone} ${Math.round(z.area_sqm ?? 0)} sqm`)
            .join(', ')}
          className={cn('flex w-full overflow-hidden rounded-md bg-canvas-alt', compact ? 'h-2' : 'h-3')}
        >
          {shares.map((z, i) => {
            const share = ((z.area_sqm ?? 0) / total) * 100
            if (!share) return null
            return (
              <span
                key={`${z.zone}-${i}`}
                style={{ width: `${share}%`, background: zoneFor(z.zone)?.color ?? UNZONED_COLOR }}
                className="h-full border-r border-white/60 last:border-r-0"
              />
            )
          })}
        </div>
      )}

      <ul className={cn('space-y-1.5', measured && 'mt-2.5')}>
        {shares.map((z, i) => {
          const zone = zoneFor(z.zone)
          const color = zone?.color ?? UNZONED_COLOR
          const pct = measured && z.area_sqm != null ? Math.round((z.area_sqm / total) * 100) : null
          return (
            <li
              key={`${z.zone}-${i}`}
              className={cn('flex items-center gap-2', compact ? 'text-[0.75rem]' : 'text-[0.875rem]')}
            >
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-md text-[0.5625rem] font-bold"
                style={{ background: color, color: zoneInk(color) }}
              >
                {zone?.code ?? '?'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{zone?.name ?? z.zone}</span>
              {zone?.buildable === 'no' && (
                <span className="shrink-0 text-[0.6875rem] font-semibold text-red-600">no building</span>
              )}
              {zone?.buildable === 'restricted' && (
                <span className="shrink-0 text-[0.6875rem] font-semibold text-amber-700">restricted</span>
              )}
              {z.area_sqm != null && (
                <span className="shrink-0 text-ink-muted tabular-nums">
                  {Math.round(z.area_sqm).toLocaleString('en-RW')} sqm
                  {pct != null && <span className="text-ink-faint"> · {pct}%</span>}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
