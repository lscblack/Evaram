import { useState } from 'react'
import {
  Bus, Church, Factory, Fuel, GraduationCap, Hospital, Landmark, Route,
  ShoppingBasket, Trees, Waves, Zap,
} from 'lucide-react'
import type { ProximityCriterion } from '@/types/api'
import { cn } from '@/lib/utils'

interface Choice {
  kind: string
  label: string
  icon: typeof Bus
  /** `near` — a convenience to be close to. `away` — a constraint to avoid. */
  sense: 'near' | 'away'
  /** Sensible default distance in metres. */
  metres: number
}

/**
 * What a buyer can search on.
 *
 * Split by sense rather than listed alphabetically, because "near a school" and
 * "away from a wetland" are opposite requests and mixing them in one list makes
 * the toggle ambiguous.
 */
const CHOICES: Choice[] = [
  { kind: 'road', label: 'A road', icon: Route, sense: 'near', metres: 300 },
  { kind: 'school', label: 'A school', icon: GraduationCap, sense: 'near', metres: 1500 },
  { kind: 'hospital', label: 'A hospital', icon: Hospital, sense: 'near', metres: 3000 },
  { kind: 'market', label: 'A market', icon: ShoppingBasket, sense: 'near', metres: 2000 },
  { kind: 'bus_station', label: 'Public transport', icon: Bus, sense: 'near', metres: 800 },
  { kind: 'fuel', label: 'A filling station', icon: Fuel, sense: 'near', metres: 2000 },
  { kind: 'place_of_worship', label: 'A place of worship', icon: Church, sense: 'near', metres: 1500 },
  { kind: 'bank', label: 'A bank', icon: Landmark, sense: 'near', metres: 2000 },
  { kind: 'wetland', label: 'Wetland', icon: Waves, sense: 'away', metres: 300 },
  { kind: 'river', label: 'A river', icon: Waves, sense: 'away', metres: 100 },
  { kind: 'industrial', label: 'Industry', icon: Factory, sense: 'away', metres: 500 },
  { kind: 'power_line', label: 'Power lines', icon: Zap, sense: 'away', metres: 200 },
  { kind: 'forest', label: 'Forest', icon: Trees, sense: 'near', metres: 2000 },
]

export function buildCriteria(active: Record<string, number>): string {
  return Object.entries(active)
    .map(([kind, metres]) => `${kind}:${metres}`)
    .join(',')
}

/**
 * Search by what surrounds a plot rather than by what the listing says it is.
 *
 * Each chip carries its own distance, editable in place, because "near a road"
 * means 100 m to one buyer and a kilometre to another.
 */
export function SurroundingsSearch({
  active,
  onChange,
  relaxed,
}: {
  active: Record<string, number>
  onChange: (next: Record<string, number>) => void
  relaxed?: ProximityCriterion[]
}) {
  const [editing, setEditing] = useState<string | null>(null)

  const toggle = (choice: Choice) => {
    const next = { ...active }
    if (choice.kind in next) {
      delete next[choice.kind]
    } else {
      // A constraint is stored as a negative distance — the API reads the sign
      // as "beyond this", which keeps one parameter doing both jobs.
      next[choice.kind] = choice.sense === 'away' ? -choice.metres : choice.metres
    }
    onChange(next)
  }

  const setDistance = (kind: string, metres: number) => {
    const choice = CHOICES.find((c) => c.kind === kind)
    if (!choice) return
    onChange({ ...active, [kind]: choice.sense === 'away' ? -Math.abs(metres) : Math.abs(metres) })
  }

  const dropped = new Set((relaxed ?? []).map((r) => r.kind))

  return (
    <div className="space-y-3">
      {(['near', 'away'] as const).map((sense) => (
        <div key={sense}>
          <p className="mb-1.5 text-[0.6875rem] font-bold tracking-[0.1em] text-ink-faint uppercase">
            {sense === 'near' ? 'Close to' : 'Away from'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CHOICES.filter((c) => c.sense === sense).map((choice) => {
              const on = choice.kind in active
              const metres = Math.abs(active[choice.kind] ?? choice.metres)
              const Icon = choice.icon
              return (
                <span key={choice.kind} className="inline-flex">
                  <button
                    type="button"
                    onClick={() => toggle(choice)}
                    aria-pressed={on}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 text-[0.75rem] font-semibold transition-colors',
                      on ? 'pr-1.5' : 'pr-3',
                      on
                        ? sense === 'away'
                          ? 'border-red-500/40 bg-red-500/10 text-red-700'
                          : 'border-emerald-600/35 bg-emerald-500/10 text-emerald-700'
                        : 'border-line bg-canvas text-ink-soft hover:border-ink-faint hover:text-ink',
                      dropped.has(choice.kind) && 'line-through opacity-55',
                    )}
                  >
                    <Icon className="size-3.5" strokeWidth={2.2} />
                    {choice.label}
                    {on && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditing(editing === choice.kind ? null : choice.kind)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            setEditing(editing === choice.kind ? null : choice.kind)
                          }
                        }}
                        className="rounded-full bg-surface/70 px-2 py-0.5 text-[0.6875rem] tabular-nums"
                      >
                        {metres >= 1000 ? `${metres / 1000} km` : `${metres} m`}
                      </span>
                    )}
                  </button>

                  {editing === choice.kind && (
                    <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1">
                      <input
                        type="range"
                        min={50}
                        max={5000}
                        step={50}
                        value={metres}
                        onChange={(e) => setDistance(choice.kind, Number(e.target.value))}
                        aria-label={`Distance for ${choice.label}`}
                        className="h-1 w-28 accent-gold-500"
                      />
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-[0.6875rem] font-semibold text-gold-600"
                      >
                        done
                      </button>
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        </div>
      ))}

      {relaxed && relaxed.length > 0 && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-[0.75rem] leading-relaxed text-amber-800">
          Nothing matched everything you asked for, so{' '}
          {relaxed.map((r) => r.kind.replace('_', ' ')).join(', ')}{' '}
          {relaxed.length === 1 ? 'was' : 'were'} set aside. What is shown matches the rest.
        </p>
      )}
    </div>
  )
}
