import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Bath,
  BedDouble,
  Hash,
  Maximize,
  MapPin,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'
import type { Property } from '@/types/property'
import { getCategoryById, getSubCategoryById } from '@/data/properties'
import { cn, formatArea, formatCompactCurrency } from '@/lib/utils'
import { fadeUp } from '@/lib/motion'

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-emerald-500 text-white',
  reserved: 'bg-gold-500 text-white',
  under_offer: 'bg-gold-500 text-white',
  sold: 'bg-ink text-canvas',
  rented: 'bg-ink text-canvas',
}

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  under_offer: 'Under offer',
  sold: 'Sold',
  rented: 'Rented',
}

/** Horizontal variant used by the Properties page list view. */
export function PropertyRow({ property }: { property: Property }) {
  const cover = property.images.find((i) => i.is_cover) ?? property.images[0]
  const category = getCategoryById(property.category_id)
  const subCategory = getSubCategoryById(property.subcategory_id)

  const bedrooms = property.details?.bedrooms as number | undefined
  const bathrooms = property.details?.bathrooms as number | undefined

  const price =
    property.intent === 'rent' && property.rent_amount
      ? formatCompactCurrency(property.rent_amount, property.currency)
      : formatCompactCurrency(property.estimated_amount ?? 0, property.currency)

  return (
    <motion.article
      variants={fadeUp}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-line/70 bg-surface shadow-soft transition-all duration-500 ease-brand hover:-translate-y-1 hover:border-line-strong hover:shadow-lift sm:flex-row"
    >
      {/* media */}
      <div className="relative h-52 shrink-0 overflow-hidden sm:h-auto sm:w-64 lg:w-80">
        <img
          src={cover?.url}
          alt={property.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
        />
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-2">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase',
              STATUS_STYLES[property.status] ?? 'bg-navy-400 text-white',
            )}
          >
            {STATUS_LABELS[property.status] ?? property.status}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide text-ink uppercase">
            For {property.intent}
          </span>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-gold-600 uppercase">
            {category?.label} · {subCategory?.label}
          </p>
          {property.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-bold text-emerald-700">
              <ShieldCheck className="size-3" strokeWidth={2.6} />
              Verified
            </span>
          )}
        </div>

        <h3 className="mt-2 font-display text-xl leading-snug font-bold text-ink transition-colors duration-300 group-hover:text-gold-600 sm:text-2xl">
          <Link to={`/properties/${property.id}`} className="before:absolute before:inset-0">
            {property.title}
          </Link>
        </h3>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-muted">
          <MapPin className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
          {property.location}, {property.district}
        </p>

        <p className="mt-3 line-clamp-2 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">
          {property.summary}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
          <span className="flex items-center gap-1.5">
            <Maximize className="size-4 text-ink-faint" strokeWidth={2} />
            {formatArea(property.size)}
          </span>
          {Boolean(bedrooms) && (
            <span className="flex items-center gap-1.5">
              <BedDouble className="size-4 text-ink-faint" strokeWidth={2} />
              {bedrooms} bed
            </span>
          )}
          {Boolean(bathrooms) && (
            <span className="flex items-center gap-1.5">
              <Bath className="size-4 text-ink-faint" strokeWidth={2} />
              {bathrooms} bath
            </span>
          )}
          <span className="flex items-center gap-1.5 font-mono text-[0.8125rem] text-ink-muted">
            <Hash className="size-3.5" strokeWidth={2.2} />
            {property.upi}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-wide text-ink-muted uppercase">
              {property.intent === 'rent' ? 'Rent from' : 'Asking price'}
            </p>
            <p className="font-display text-2xl leading-none font-bold text-ink">
              {price}
              {property.intent === 'rent' && (
                <span className="ml-1 font-sans text-sm font-medium text-ink-muted">/mo</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {Boolean(property.appreciation) && (
              <span className="flex items-center gap-1 rounded-full bg-gold-50 px-3 py-1.5 text-[0.75rem] font-bold text-gold-700">
                <TrendingUp className="size-3.5" strokeWidth={2.6} />
                +{property.appreciation}%/yr
              </span>
            )}
            <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-ink-soft transition-colors duration-300 group-hover:bg-gold-500 group-hover:text-white">
              <ArrowUpRight
                className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.2}
              />
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
