import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Crown, Scale, Trophy, X } from 'lucide-react'
import { api } from '@/lib/api'
import { formatArea, formatCompactCurrency, cn } from '@/lib/utils'
import { formatDistance } from '@/lib/geoMeasure'
import type { ParcelComparison, ParcelProperties } from '@/types/api'

/** How each comparison row's raw number should be read back to a person. */
function present(key: string, value: number | null, currency: string): string {
  if (value == null) return '—'
  if (key === 'price') return formatCompactCurrency(value, currency)
  if (key === 'price_per_sqm') return `${formatCompactCurrency(value, currency)}/sqm`
  if (key === 'size') return formatArea(value)
  if (key === 'compactness') return `${Math.round(value * 100)}%`
  if (key === 'issue_count') return value === 0 ? 'none' : String(value)
  return formatDistance(value)
}

/**
 * Parcels side by side, judged on measured facts.
 *
 * The verdict is arithmetic, not opinion: every row is something the database
 * checked, and the winner is whoever takes the most weighted rows. Showing the
 * rows matters as much as showing the total — a buyer who disagrees with the
 * weighting can still read the figures and decide for themselves.
 */
export function CompareTray({
  parcels,
  onRemove,
  onClear,
}: {
  parcels: ParcelProperties[]
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<ParcelComparison | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slugs = parcels.map((p) => p.slug).join(',')

  useEffect(() => {
    if (!open || parcels.length < 2) return
    let cancelled = false
    setBusy(true)
    setError(null)
    api
      .get<ParcelComparison>(`/public/map/compare?slugs=${encodeURIComponent(slugs)}`)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Comparison failed'))
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
  }, [open, slugs, parcels.length])

  // Closing the tray when the last-but-one parcel is removed avoids a panel
  // that is open but has nothing left to compare.
  useEffect(() => {
    if (parcels.length < 2) setOpen(false)
  }, [parcels.length])

  if (parcels.length === 0) return null

  const bySlug = new Map(parcels.map((p) => [p.slug, p]))

  return (
    <>
      <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 shadow-lift backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 text-[0.8125rem] font-bold text-ink">
            <Scale className="size-4 text-gold-600" strokeWidth={2.2} />
            Comparing {parcels.length}
          </span>

          <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
            {parcels.map((parcel) => (
              <li key={parcel.id}>
                <span className="inline-flex max-w-[15rem] items-center gap-1.5 rounded-full border border-line bg-canvas py-1 pr-1 pl-3 text-[0.75rem] font-semibold text-ink-soft">
                  <span className="truncate">{parcel.reference_number}</span>
                  <button
                    type="button"
                    onClick={() => onRemove(parcel.id)}
                    aria-label={`Remove ${parcel.reference_number}`}
                    className="grid size-5 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-canvas-alt hover:text-ink"
                  >
                    <X className="size-3" strokeWidth={2.6} />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onClear}
            className="text-[0.75rem] font-semibold text-ink-muted hover:text-ink"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={parcels.length < 2}
            onClick={() => setOpen(true)}
            className="rounded-full bg-gold-500 px-4 py-2 text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {parcels.length < 2 ? 'Add one more' : 'See what wins'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/55 p-0 sm:items-center sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-heading"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-line bg-surface sm:rounded-3xl"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4 sm:px-7">
                <h2 id="compare-heading" className="font-display text-[1.125rem] font-semibold text-ink">
                  Side by side, on the facts
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close comparison"
                  className="grid size-9 place-items-center rounded-full text-ink-muted transition-colors hover:bg-canvas-alt hover:text-ink"
                >
                  <X className="size-5" strokeWidth={2.2} />
                </button>
              </div>

              {busy && <p className="px-5 py-10 text-center text-ink-muted sm:px-7">Measuring…</p>}
              {error && <p className="px-5 py-10 text-center text-red-600 sm:px-7">{error}</p>}

              {result && !busy && (
                <div className="px-5 pb-7 sm:px-7">
                  {result.winner && !result.tied && (
                    <p className="mt-5 flex items-start gap-2.5 rounded-2xl border border-emerald-600/25 bg-emerald-500/8 px-4 py-3 text-[0.875rem] text-ink">
                      <Trophy className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.2} />
                      <span>
                        <strong className="font-semibold">
                          {bySlug.get(result.winner)?.reference_number ?? result.winner}
                        </strong>{' '}
                        comes out ahead on {result.rows.filter((r) => r.winners.includes(result.winner!)).length} of{' '}
                        {result.rows.length} measures. Every row below is checked, not claimed.
                      </span>
                    </p>
                  )}
                  {result.tied && (
                    <p className="mt-5 rounded-2xl border border-line bg-canvas-alt px-4 py-3 text-[0.875rem] text-ink-soft">
                      These are too close to separate — they tie on the weighted score. The rows
                      below show where each one is stronger.
                    </p>
                  )}

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[34rem] border-collapse text-left">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-surface pb-3 text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                            Measure
                          </th>
                          {result.parcels.map((parcel) => (
                            <th key={parcel.slug} className="pb-3 pl-4 align-bottom">
                              <Link
                                to={`/properties/${parcel.slug}`}
                                className="block max-w-[11rem] text-[0.8125rem] font-semibold text-ink hover:text-gold-600"
                              >
                                {parcel.reference_number}
                                <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-ink-muted">
                                  {parcel.title}
                                </span>
                              </Link>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row) => (
                          <tr key={row.key} className="border-t border-line">
                            <th
                              scope="row"
                              className="sticky left-0 bg-surface py-2.5 pr-4 text-[0.8125rem] font-medium text-ink-soft"
                            >
                              {row.label}
                            </th>
                            {result.parcels.map((parcel) => {
                              const won = row.winners.includes(parcel.slug)
                              return (
                                <td
                                  key={parcel.slug}
                                  className={cn(
                                    'py-2.5 pl-4 text-[0.875rem] tabular-nums',
                                    won ? 'font-bold text-emerald-700' : 'text-ink',
                                  )}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    {present(row.key, row.values[parcel.slug], parcel.currency)}
                                    {won && <Crown className="size-3.5" strokeWidth={2.4} />}
                                  </span>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                        <tr className="border-t-2 border-line-strong">
                          <th
                            scope="row"
                            className="sticky left-0 bg-surface py-3 pr-4 text-[0.8125rem] font-bold text-ink"
                          >
                            Weighted score
                          </th>
                          {result.parcels.map((parcel) => (
                            <td
                              key={parcel.slug}
                              className="py-3 pl-4 text-[1rem] font-bold text-ink tabular-nums"
                            >
                              {result.scores[parcel.slug]?.toFixed(1) ?? '—'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-muted">
                    Distances are measured from the parcel boundary to the nearest example of each
                    kind, using OpenStreetMap data. Rows where the figures are within 2% of each
                    other are treated as a tie, and a measure nobody has a figure for is skipped
                    rather than counted against anyone.
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
