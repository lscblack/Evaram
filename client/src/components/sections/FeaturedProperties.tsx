import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ApiPropertyCard, CategorySummary, Page as ApiPage } from '@/types/api'
import { useBlock, useQuery } from '@/lib/queries'
import { qs } from '@/lib/api'
import { PropertyCard } from '@/components/ui/PropertyCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import type { TranslationKey } from '@/data/translations'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'

const FILTERS: { id: string; label: TranslationKey }[] = [
  { id: 'featured', label: 'filter.featured' },
  { id: 'residential', label: 'filter.residential' },
  { id: 'commercial', label: 'filter.commercial' },
  { id: 'agricultural', label: 'filter.agricultural' },
  { id: 'rent', label: 'filter.toRent' },
]

export function FeaturedProperties() {
  const t = useT()
  const block = useBlock('home', 'featured', {
    eyebrow: "Current listings",
    title: "Verified properties,",
    accent: "ready to move on.",
    body: "Every listing below has been checked against its UPI at the National Land Authority. You see the parcel size, the tenure and the coordinates before you ever pick up the phone.",
  })
  const [filter, setFilter] = useState('featured')

  const { data: categories } = useQuery<CategorySummary[]>('/public/categories')

  // Each tab is a different server query rather than a client-side slice, so
  // the grid always reflects what is actually published.
  const path = useMemo(() => {
    const base = '/public/properties'
    switch (filter) {
      case 'residential':
        return base + qs({ category: 'residential', per_page: 6 })
      case 'commercial':
        return base + qs({ category: 'commercial', per_page: 6 })
      case 'agricultural':
        return base + qs({ category: 'agricultural', per_page: 6 })
      case 'rent':
        return base + qs({ intent: 'rent', per_page: 6 })
      default:
        return '/public/properties/featured' + qs({ limit: 6 })
    }
  }, [filter])

  const { data, loading } = useQuery<ApiPage<ApiPropertyCard> | ApiPropertyCard[]>(path)
  const visible = Array.isArray(data) ? data : (data?.items ?? [])

  const availableFilters = FILTERS.filter((f) => {
    if (f.id === 'featured' || f.id === 'rent') return true
    return (categories ?? []).some((c) => c.slug === f.id && c.property_count > 0)
  })

  return (
    <section className="bg-canvas-alt py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
          description={block.body}
          action={
            <Button
              to="/properties"
              variant="primary"
              trailing={
                <ArrowRight
                  className="size-[1.05rem] transition-transform duration-300 group-hover/btn:translate-x-1"
                  strokeWidth={2.3}
                />
              }
            >
              View all properties
            </Button>
          }
        />

        {/* filter pills */}
        <motion.div
          {...revealProps}
          variants={fadeUp}
          className="mt-10 -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {availableFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'relative shrink-0 rounded-full px-5 py-2.5 text-[0.9375rem] font-semibold transition-colors duration-300',
                filter === f.id ? 'text-white' : 'text-ink-soft hover:text-ink',
              )}
            >
              {filter === f.id && (
                <motion.span
                  layoutId="featured-pill"
                  className="absolute inset-0 rounded-full bg-ink shadow-soft"
                  transition={{ duration: 0.4, ease: EASE }}
                />
              )}
              <span className="relative">{t(f.label)}</span>
            </button>
          ))}
        </motion.div>

        <motion.div
          key={filter}
          initial="hidden"
          animate="show"
          variants={stagger(0.08)}
          className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((property, i) => (
            <PropertyCard key={property.id} property={property} index={i} />
          ))}
        </motion.div>

        {!loading && visible.length === 0 && (
          <p className="mt-12 text-center text-ink-muted">
            Nothing in this category right now — {' '}
            <a href="/contact" className="font-semibold text-gold-600 hover:underline">
              tell us what you are looking for
            </a>{' '}
            and we will source it.
          </p>
        )}
      </div>
    </section>
  )
}
