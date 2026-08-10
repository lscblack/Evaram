import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, Minus, Search, X } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { EASE } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { DetailGroup } from '@/lib/propertyDetails'

/**
 * Picks an icon from the label's wording.
 *
 * The forms are admin-editable, so there is no fixed field list to map from —
 * matching on meaning keeps icons useful as new fields appear, and falls back
 * to a neutral mark rather than guessing wrongly.
 */
const ICON_RULES: [RegExp, string][] = [
  [/area|size|sqm|hectare|plot|land/i, 'Ruler'],
  [/price|cost|amount|rwf|value|rent|deposit/i, 'Wallet'],
  [/bed|room|bath|toilet|shower/i, 'Home'],
  [/water|irrigation|borehole|river/i, 'Waves'],
  [/power|electric|solar|energy|grid/i, 'Zap'],
  [/road|access|transport|distance/i, 'MapPinned'],
  [/soil|crop|farm|agri|yield|harvest|tree|forest|species/i, 'TreePine'],
  [/title|deed|tenure|right|lease|permit|licence|license/i, 'FileCheck2'],
  [/year|date|age|built|duration|period/i, 'Timer'],
  [/security|fence|wall|gate|guard/i, 'ShieldCheck'],
  [/floor|storey|building|structure|construction|finish/i, 'Building2'],
  [/parking|garage|car/i, 'Blocks'],
  [/zoning|use|purpose|category/i, 'Layers'],
  [/owner|contact|agent|manager/i, 'Users'],
  [/slope|terrain|topograph|elevation/i, 'Landmark'],
]

function iconFor(label: string): string {
  for (const [pattern, name] of ICON_RULES) {
    if (pattern.test(label)) return name
  }
  return 'Layers'
}

/** Yes/no answers read better as a mark than as the word. */
function BooleanValue({ value }: { value: string }) {
  const yes = /^(yes|true|available|included)$/i.test(value)
  const no = /^(no|false|none|not available|excluded)$/i.test(value)
  if (!yes && !no) return <>{value}</>
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold',
        yes ? 'bg-emerald-50 text-emerald-700' : 'bg-canvas-alt text-ink-muted',
      )}
    >
      {yes ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
      {yes ? 'Yes' : 'No'}
    </span>
  )
}

/**
 * The full specification.
 *
 * A property form can run to sixty fields, which as one long table is unusable
 * on a phone. This groups them into collapsible cards, gives each row an icon
 * so the eye can scan by category, and offers a filter for the cases where
 * someone is hunting one specific number.
 */
export function SpecificationPanel({ groups }: { groups: DetailGroup[] }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(needle) ||
            String(item.value).toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0)
  }, [groups, query])

  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const shown = filtered.reduce((n, g) => n + g.items.length, 0)

  if (groups.length === 0) return null

  return (
    <div>
      {/* ---- filter ---- */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.875rem] text-ink-muted">
          {query ? (
            <>
              <span className="font-semibold text-ink">{shown}</span> of {total} details
            </>
          ) : (
            <>
              <span className="font-semibold text-ink">{total}</span> details, grouped
            </>
          )}
        </p>

        <div className="relative w-full sm:w-64">
          <label htmlFor="spec-filter" className="sr-only">
            Filter the specification
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
            strokeWidth={2}
          />
          <input
            id="spec-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ui.findDetail')}
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-[0.875rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <p className="font-display text-[1.0625rem] font-semibold text-ink">
            Nothing matches “{query}”
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-3 text-[0.875rem] font-semibold text-gold-600 hover:text-gold-700"
          >
            Clear the filter
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((group) => {
            const isOpen = !collapsed[group.title]
            return (
              <motion.section
                key={group.title}
                variants={undefined}
                className="h-fit overflow-hidden rounded-2xl border border-line bg-surface"
              >
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => ({ ...prev, [group.title]: !prev[group.title] }))
                  }
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 border-b border-line bg-canvas-alt px-5 py-3.5 text-left text-ink transition-colors hover:bg-canvas"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-gold-600">
                      <Icon name={iconFor(group.title)} className="size-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="font-display text-[0.9375rem] font-semibold text-ink">
                      {group.title}
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[0.6875rem] font-bold text-ink-muted">
                      {group.items.length}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-ink-muted transition-transform duration-300',
                      isOpen && 'rotate-180',
                    )}
                    strokeWidth={2.2}
                  />
                </button>

                {isOpen && (
                  <motion.dl
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="divide-y divide-line/60"
                  >
                    {group.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-canvas-alt"
                      >
                        <Icon
                          name={iconFor(item.label)}
                          className="mt-0.5 size-4 shrink-0 text-ink-faint"
                          strokeWidth={2}
                        />
                        <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                          <dt className="text-[0.875rem] text-ink-muted">{item.label}</dt>
                          <dd className="text-[0.875rem] font-semibold text-ink">
                            {item.value === '—' ? (
                              <Minus className="size-3.5 text-ink-faint" strokeWidth={2.4} />
                            ) : (
                              <BooleanValue value={item.value} />
                            )}
                          </dd>
                        </div>
                      </div>
                    ))}
                  </motion.dl>
                )}
              </motion.section>
            )
          })}
        </div>
      )}
    </div>
  )
}
