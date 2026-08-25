import { Link } from 'react-router-dom'
import { AlertTriangle, BadgeCheck, Maximize2, MapPin, Scale } from 'lucide-react'
import type { ParcelProperties } from '@/types/api'
import { formatArea, formatCompactCurrency, cn } from '@/lib/utils'
import { formatDistance } from '@/lib/geoMeasure'

/**
 * One parcel, as it appears in the map's results list and in its popup.
 *
 * Deliberately compact: on the map this sits beside the thing it describes, so
 * it only has to carry what the outline cannot — price, size, and whether the
 * boundary has anything wrong with it.
 */
export function ParcelCard({
  parcel,
  active,
  selected,
  onHover,
  onSelect,
  onCompare,
  compact,
}: {
  parcel: ParcelProperties
  active?: boolean
  selected?: boolean
  onHover?: (id: string | null) => void
  onSelect?: (parcel: ParcelProperties) => void
  onCompare?: (parcel: ParcelProperties) => void
  compact?: boolean
}) {
  const price = parcel.intent === 'rent' ? parcel.rent_amount : parcel.price

  return (
    <article
      onMouseEnter={() => onHover?.(parcel.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-surface transition-colors',
        active ? 'border-gold-500' : 'border-line hover:border-line-strong',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(parcel)}
        className="flex w-full gap-3 p-3 text-left"
      >
        {parcel.cover_url ? (
          <img
            src={parcel.cover_url}
            alt=""
            loading="lazy"
            className={cn('shrink-0 rounded-xl object-cover', compact ? 'size-16' : 'size-20')}
          />
        ) : (
          <span
            className={cn(
              'grid shrink-0 place-items-center rounded-xl bg-canvas-alt text-ink-faint',
              compact ? 'size-16' : 'size-20',
            )}
          >
            <MapPin className="size-5" strokeWidth={1.8} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[0.9375rem] font-semibold text-ink">{parcel.title}</p>
            {parcel.is_verified && (
              <BadgeCheck
                className="mt-0.5 size-4 shrink-0 text-emerald-600"
                strokeWidth={2.2}
                aria-label="Verified against its UPI"
              />
            )}
          </div>

          <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
            {[parcel.sector, parcel.district].filter(Boolean).join(', ') || parcel.reference_number}
            {parcel.distance_m != null && ` · ${formatDistance(parcel.distance_m)} away`}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[0.9375rem] font-bold text-ink tabular-nums">
              {price ? formatCompactCurrency(price, parcel.currency) : 'Price on request'}
            </span>
            {parcel.size && (
              <span className="inline-flex items-center gap-1 text-[0.75rem] text-ink-muted">
                <Maximize2 className="size-3" strokeWidth={2.2} />
                {formatArea(parcel.size)}
              </span>
            )}
            {!parcel.has_outline && (
              <span className="text-[0.6875rem] text-ink-faint">outline not surveyed</span>
            )}
          </div>

          {parcel.issue_count > 0 && (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-500/12 px-2 py-1 text-[0.6875rem] font-semibold text-amber-700">
              <AlertTriangle className="size-3" strokeWidth={2.4} />
              {parcel.issue_count} boundary note{parcel.issue_count === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </button>

      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        <Link
          to={`/properties/${parcel.slug}`}
          className="text-[0.75rem] font-semibold text-gold-600 hover:underline"
        >
          Full details
        </Link>
        {onCompare && (
          <button
            type="button"
            onClick={() => onCompare(parcel)}
            aria-pressed={selected}
            className={cn(
              'ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[0.75rem] font-semibold transition-colors',
              selected
                ? 'border-ink bg-ink text-canvas'
                : 'border-line text-ink-soft hover:border-ink-faint hover:text-ink',
            )}
          >
            <Scale className="size-3.5" strokeWidth={2.2} />
            {selected ? 'Comparing' : 'Compare'}
          </button>
        )}
      </div>
    </article>
  )
}
