import { zoneFor, zoneInk, UNZONED_COLOR } from '@/data/masterPlan'
import { cn } from '@/lib/utils'

/**
 * A Master Plan zone as a swatch and a name.
 *
 * The swatch is the legend colour — the same one the outline is drawn in on
 * the map — so a reader can connect the two without a key. Falls back to the
 * raw text for a value the table does not recognise rather than hiding it.
 */
export function ZoneChip({ value, compact }: { value: string; compact?: boolean }) {
  const zone = zoneFor(value)
  const color = zone?.color ?? UNZONED_COLOR

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-canvas py-1 pr-2 pl-1.5',
        compact ? 'text-[0.75rem]' : 'text-[0.875rem]',
      )}
      title={zone ? `${zone.code} — ${zone.name}` : value}
    >
      <span
        aria-hidden
        className="grid size-5 shrink-0 place-items-center rounded-md text-[0.5625rem] font-bold"
        style={{ background: color, color: zoneInk(color) }}
      >
        {zone?.code ?? '?'}
      </span>
      <span className="truncate font-medium text-ink">{zone?.name ?? value}</span>
      {zone?.buildable === 'no' && (
        <span className="shrink-0 text-[0.6875rem] font-semibold text-red-600">no building</span>
      )}
      {zone?.buildable === 'restricted' && (
        <span className="shrink-0 text-[0.6875rem] font-semibold text-amber-700">restricted</span>
      )}
    </span>
  )
}
