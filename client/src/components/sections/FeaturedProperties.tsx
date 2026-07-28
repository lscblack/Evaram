import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CATEGORIES, PROPERTIES } from '@/data/properties'
import { PropertyCard } from '@/components/ui/PropertyCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { EASE } from '@/lib/motion'

const FILTERS = [
  { id: 'featured', label: 'Featured' },
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'land', label: 'Land & plots' },
  { id: 'rent', label: 'To rent' },
]

export function FeaturedProperties() {
  const [filter, setFilter] = useState('featured')

  const visible = useMemo(() => {
    const byCategoryName = (name: string) => CATEGORIES.find((c) => c.name === name)?.id

    switch (filter) {
      case 'residential':
        return PROPERTIES.filter((p) => p.category_id === byCategoryName('residential'))
      case 'commercial':
        return PROPERTIES.filter((p) => p.category_id === byCategoryName('commercial'))
      case 'land':
        // Every sub-category whose label starts with "Land" or is a plot
        return PROPERTIES.filter((p) => [301, 302, 401, 402, 501, 601, 101, 201].includes(p.subcategory_id))
      case 'rent':
        return PROPERTIES.filter((p) => p.intent === 'rent')
      default:
        return PROPERTIES.filter((p) => p.is_featured)
    }
  }, [filter])

  return (
    <section className="bg-canvas-alt py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Current listings"
          title="Verified properties,"
          accent="ready to move on."
          description="Every listing below has been checked against its UPI at the Rwanda Land Authority. You see the parcel size, the tenure and the coordinates before you ever pick up the phone."
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
          {FILTERS.map((f) => (
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
              <span className="relative">{f.label}</span>
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
          {visible.slice(0, 6).map((property, i) => (
            <PropertyCard key={property.id} property={property} index={i} />
          ))}
        </motion.div>

        {visible.length === 0 && (
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
