import { useMemo, useState } from 'react'
import { ChevronDown, Palette } from 'lucide-react'
import { MASTER_PLAN_ZONES, UNZONED_COLOR, zoneCode } from '@/data/masterPlan'
import { cn } from '@/lib/utils'
import type { ParcelProperties } from '@/types/api'

/**
 * A key to the colours on the map — only the zones actually in view.
 *
 * The full legend is forty-five entries; a buyer looking at six parcels needs
 * the three or four that apply. Built from the loaded collection, so it always
 * matches what is drawn.
 */
export function ZoneLegend({ parcels }: { parcels: ParcelProperties[] }) {
  const [open, setOpen] = useState(false)

  const entries = useMemo(() => {
    const codes = new Set<string>()
    let unzoned = 0
    for (const p of parcels) {
      const code = zoneCode(p.master_plan_zone)
      if (code) codes.add(code)
      else unzoned += 1
    }
    const rows = MASTER_PLAN_ZONES.filter((z) => codes.has(z.code))
    return { rows, unzoned }
  }, [parcels])

  if (entries.rows.length === 0 && entries.unzoned === 0) return null

  return (
    <div className="absolute top-16 right-3 z-20 max-w-[16rem] rounded-2xl border border-line bg-surface/95 shadow-soft backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-[0.75rem] font-semibold text-ink"
      >
        <Palette className="size-3.5 text-gold-600" strokeWidth={2.2} />
        Zone colours
        <ChevronDown
          className={cn('ml-auto size-3.5 text-ink-faint transition-transform', open && 'rotate-180')}
          strokeWidth={2.4}
        />
      </button>

      {open && (
        <ul className="max-h-56 space-y-1 overflow-y-auto border-t border-line px-3 py-2">
          {entries.rows.map((z) => (
            <li key={z.code} className="flex items-center gap-2 text-[0.75rem] text-ink-soft">
              <span aria-hidden className="size-3.5 shrink-0 rounded-sm" style={{ background: z.color }} />
              <span className="font-semibold text-ink">{z.code}</span>
              <span className="truncate">{z.name}</span>
            </li>
          ))}
          {entries.unzoned > 0 && (
            <li className="flex items-center gap-2 text-[0.75rem] text-ink-soft">
              <span aria-hidden className="size-3.5 shrink-0 rounded-sm" style={{ background: UNZONED_COLOR }} />
              <span>Zone not recorded</span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
