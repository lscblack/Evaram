import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle, BadgeCheck, Bed, Loader2, MapPin, Maximize2, Scale, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatArea, formatCurrency, cn } from '@/lib/utils'
import { formatDistance } from '@/lib/geoMeasure'
import type { ParcelContext, ParcelProperties } from '@/types/api'

/**
 * The card that opens when a parcel is clicked.
 *
 * Everything a buyer needs to decide whether to open the full listing, and
 * nothing more: the price, the shape, what is within walking distance, and
 * whether the boundary has anything wrong with it. Anchored to the map rather
 * than floated over its centre, so the parcel it describes stays visible.
 */
export function ParcelPopup({
  parcel,
  selected,
  onClose,
  onCompare,
}: {
  parcel: ParcelProperties
  selected: boolean
  onClose: () => void
  onCompare: (parcel: ParcelProperties) => void
}) {
  const [context, setContext] = useState<ParcelContext | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setContext(null)
    api
      .get<ParcelContext>(`/public/map/context/${parcel.slug}`)
      .then((d) => !cancelled && setContext(d))
      .catch(() => !cancelled && setContext(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [parcel.slug])

  const price = parcel.intent === 'rent' ? parcel.rent_amount : parcel.price
  const perSqm = price && parcel.size ? price / parcel.size : null
  const issues = context?.boundary.issues ?? []

  // The three a buyer asks about first, in the order they ask.
  const highlights = ['road', 'school', 'hospital', 'market', 'bus_station']
    .map((kind) => ({ kind, entry: context?.summary?.[kind] }))
    .filter((h) => h.entry)
    .slice(0, 4)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.18 }}
      // Above the map, its controls and the results rail — a card that opens
      // behind something is worse than no card.
      className="absolute bottom-4 left-1/2 z-40 w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift sm:left-4 sm:translate-x-0"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-2 right-2 z-10 grid size-7 place-items-center rounded-full bg-surface/85 text-ink-muted backdrop-blur transition-colors hover:text-ink"
      >
        <X className="size-4" strokeWidth={2.4} />
      </button>

      <div className="flex gap-3 p-3">
        {parcel.cover_url ? (
          <img src={parcel.cover_url} alt="" className="size-24 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-canvas-alt text-ink-faint">
            <MapPin className="size-6" strokeWidth={1.8} />
          </span>
        )}

        <div className="min-w-0 flex-1 pr-6">
          <p className="text-[1.0625rem] font-bold text-ink tabular-nums">
            {price ? formatCurrency(price, parcel.currency) : 'Price on request'}
          </p>
          {perSqm && (
            <p className="text-[0.75rem] text-ink-muted tabular-nums">
              {formatCurrency(perSqm, parcel.currency)} per sqm
            </p>
          )}
          <p className="mt-1 line-clamp-2 text-[0.875rem] font-medium text-ink">{parcel.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[0.75rem] text-ink-muted">
            {parcel.is_verified && (
              <BadgeCheck className="size-3.5 shrink-0 text-emerald-600" strokeWidth={2.4} />
            )}
            {[parcel.sector, parcel.district].filter(Boolean).join(', ') || parcel.reference_number}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2 text-[0.75rem] text-ink-soft">
        {parcel.size && (
          <span className="inline-flex items-center gap-1">
            <Maximize2 className="size-3" strokeWidth={2.2} />
            {formatArea(parcel.size)}
          </span>
        )}
        {parcel.bedrooms != null && parcel.bedrooms > 0 && (
          <span className="inline-flex items-center gap-1">
            <Bed className="size-3" strokeWidth={2.2} />
            {parcel.bedrooms} bed
          </span>
        )}
        {!parcel.has_outline && <span className="text-ink-faint">no surveyed outline</span>}
      </div>

      {/* what is nearby, measured */}
      <div className="border-t border-line px-3 py-2">
        {loading ? (
          <p className="flex items-center gap-2 py-1 text-[0.75rem] text-ink-muted">
            <Loader2 className="size-3 animate-spin" strokeWidth={2.4} />
            Measuring what is nearby…
          </p>
        ) : highlights.length ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {highlights.map(({ kind, entry }) => (
              <li key={kind} className="text-[0.75rem] text-ink-soft">
                <span className="capitalize">{kind.replace('_', ' ')}</span>{' '}
                <strong className="font-semibold text-ink tabular-nums">
                  {formatDistance(entry!.distance_m)}
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-1 text-[0.75rem] text-ink-muted">
            Nothing mapped nearby yet.
          </p>
        )}
      </div>

      {issues.length > 0 && (
        <p className="flex items-start gap-2 border-t border-line bg-amber-500/8 px-3 py-2 text-[0.75rem] leading-relaxed text-amber-800">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} />
          {issues[0].message}
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-line p-2.5">
        <Link
          to={`/properties/${parcel.slug}`}
          className="flex-1 rounded-lg bg-gold-500 px-3 py-2 text-center text-[0.8125rem] font-semibold text-white transition-opacity hover:opacity-90"
        >
          Full details
        </Link>
        <button
          type="button"
          onClick={() => onCompare(parcel)}
          aria-pressed={selected}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[0.8125rem] font-semibold transition-colors',
            selected
              ? 'border-ink bg-ink text-canvas'
              : 'border-line text-ink-soft hover:border-ink-faint hover:text-ink',
          )}
        >
          <Scale className="size-3.5" strokeWidth={2.2} />
          {selected ? 'Comparing' : 'Compare'}
        </button>
      </div>
    </motion.div>
  )
}
