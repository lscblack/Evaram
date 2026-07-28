import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Heart } from 'lucide-react'
import type { Property } from '@/types/property'
import { getCategoryById, getSubCategoryById } from '@/data/properties'
import { cn, formatArea, formatCompactCurrency } from '@/lib/utils'
import { fadeUp } from '@/lib/motion'
import { useT } from '@/lib/i18n'

const STATUS: Record<string, { dot: string; key: string }> = {
  available: { dot: 'bg-emerald-500', key: 'prop.available' },
  reserved: { dot: 'bg-gold-500', key: 'prop.reserved' },
  under_offer: { dot: 'bg-gold-500', key: 'prop.underOffer' },
  sold: { dot: 'bg-ink-faint', key: 'prop.sold' },
  rented: { dot: 'bg-ink-faint', key: 'prop.rented' },
}

/**
 * Listing card. The whole card is one link surface; the save control sits above
 * it via z-index. Specs read as a small typographic table rather than a row of
 * icons, which keeps it legible at every width.
 */
export function PropertyCard({
  property,
  index = 0,
  compact = false,
}: {
  property: Property
  index?: number
  compact?: boolean
}) {
  const t = useT()
  const [saved, setSaved] = useState(false)

  const cover = property.images.find((i) => i.is_cover) ?? property.images[0]
  const second = property.images[1]
  const category = getCategoryById(property.category_id)
  const subCategory = getSubCategoryById(property.subcategory_id)
  const status = STATUS[property.status] ?? STATUS.available

  const bedrooms = property.details?.bedrooms as number | undefined
  const bathrooms = property.details?.bathrooms as number | undefined
  const builtArea = property.details?.built_area as number | undefined

  const isRent = property.intent === 'rent'
  const price = formatCompactCurrency(
    isRent ? (property.rent_amount ?? 0) : (property.estimated_amount ?? 0),
    property.currency,
  )

  /** Up to three specs, chosen by what this property actually has. */
  const specs = [
    { label: 'Plot', value: formatArea(property.size) },
    builtArea ? { label: 'Built', value: `${builtArea} m²` } : null,
    bedrooms ? { label: 'Beds', value: String(bedrooms) } : null,
    bathrooms ? { label: 'Baths', value: String(bathrooms) } : null,
  ].filter(Boolean).slice(0, 3) as { label: string; value: string }[]

  return (
    <motion.article
      variants={fadeUp}
      custom={index}
      className={cn(
        'group relative isolate flex flex-col overflow-hidden rounded-2xl border border-line bg-surface',
        'transition-[transform,box-shadow,border-color] duration-500 ease-brand',
        'hover:-translate-y-1 hover:border-line-strong hover:shadow-lift',
      )}
    >
      {/* ---- media ---- */}
      <div className={cn('relative overflow-hidden', compact ? 'aspect-16/11' : 'aspect-4/3')}>
        <img
          src={cover?.url}
          alt={property.title}
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-[opacity,transform] duration-700 ease-brand group-hover:scale-105 group-hover:opacity-0"
        />
        {/* second frame revealed on hover — a real peek, not a gimmick */}
        <img
          src={(second ?? cover)?.url}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 size-full scale-105 object-cover opacity-0 transition-[opacity,transform] duration-700 ease-brand group-hover:scale-100 group-hover:opacity-100"
        />

        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-navy-950/55 to-transparent" />

        {/* status + intent */}
        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-950/70 py-1 pr-2.5 pl-2 text-[0.6875rem] font-semibold text-white backdrop-blur-md">
              <span aria-hidden className={cn('size-1.5 rounded-full', status.dot)} />
              {t(status.key as 'prop.available')}
            </span>
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-semibold text-navy-900 backdrop-blur-md">
              {t(isRent ? 'prop.forRent' : 'prop.forSale')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSaved((v) => !v)}
            aria-label={saved ? t('prop.unsave') : t('prop.save')}
            aria-pressed={saved}
            className="relative z-20 grid size-8 place-items-center rounded-full bg-white/90 text-navy-800 backdrop-blur-md transition-transform duration-300 hover:scale-110"
          >
            <Heart
              className={cn('size-4 transition-colors', saved && 'fill-gold-500 text-gold-500')}
              strokeWidth={2.2}
            />
          </button>
        </div>

        {/* price plate — sits on the image, anchored bottom-left */}
        <div className="absolute bottom-0 left-0 rounded-tr-2xl bg-surface px-4 pt-3 pr-5 pb-0">
          <p className="text-[0.625rem] font-semibold tracking-[0.14em] text-ink-muted uppercase">
            {t(isRent ? 'prop.rentFrom' : 'prop.askingPrice')}
          </p>
          <p className="font-display text-[1.375rem] leading-tight font-semibold text-ink">
            {price}
            {isRent && (
              <span className="ml-1 font-sans text-[0.75rem] font-medium text-ink-muted">
                {t('prop.perMonth')}
              </span>
            )}
          </p>
        </div>

        {/* appreciation, bottom-right */}
        {Boolean(property.appreciation) && (
          <span className="absolute right-4 bottom-4 rounded-full bg-gold-500 px-2.5 py-1 text-[0.6875rem] font-bold text-white">
            +{property.appreciation}%{t('prop.perYear')}
          </span>
        )}
      </div>

      {/* ---- body ---- */}
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.12em] text-gold-600 uppercase">
          {category?.label}
          <span aria-hidden className="size-0.5 rounded-full bg-ink-faint" />
          <span className="truncate font-medium text-ink-muted normal-case tracking-normal">
            {subCategory?.label}
          </span>
        </p>

        <h3 className="mt-2 font-display text-[1.0625rem] leading-snug font-semibold text-ink transition-colors duration-300 group-hover:text-gold-600">
          <Link to={`/properties/${property.id}`} className="before:absolute before:inset-0">
            {property.title}
          </Link>
        </h3>

        <p className="mt-1.5 truncate text-[0.8125rem] text-ink-muted">
          {property.location}, {property.district}
        </p>

        {/* spec table */}
        <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-3.5">
          {specs.map((spec, i) => (
            <div key={spec.label} className={cn(i > 0 && 'pl-3', i < specs.length - 1 && 'pr-3')}>
              <dt className="text-[0.6875rem] text-ink-faint">{spec.label}</dt>
              <dd className="mt-0.5 text-[0.8125rem] font-semibold text-ink">{spec.value}</dd>
            </div>
          ))}
        </dl>

        {/* footer */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="truncate font-mono text-[0.6875rem] text-ink-faint">{property.upi}</p>
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-colors duration-300 group-hover:border-gold-500 group-hover:bg-gold-500 group-hover:text-white"
          >
            <ArrowUpRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2.2}
            />
          </span>
        </div>
      </div>
    </motion.article>
  )
}
