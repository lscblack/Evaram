import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutGrid, Rows3, SlidersHorizontal, X } from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { PropertyCard } from '@/components/ui/PropertyCard'
import { PropertyRow } from '@/components/ui/PropertyRow'
import { Button } from '@/components/ui/Button'
import {
  CATEGORIES,
  DISTRICTS,
  PRICE_BOUNDS,
  PROPERTIES,
  SUBCATEGORIES,
} from '@/data/properties'
import type { ListingIntent, Property } from '@/types/property'
import { SITE } from '@/data/site'
import { EASE, stagger } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { cn, formatCompactCurrency } from '@/lib/utils'

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'size-desc' | 'yield-desc'

const SORTS: { id: SortKey; tKey: string }[] = [
  { id: 'newest', tKey: 'market.sortNewest' },
  { id: 'price-asc', tKey: 'market.sortPriceAsc' },
  { id: 'price-desc', tKey: 'market.sortPriceDesc' },
  { id: 'size-desc', tKey: 'market.sortSize' },
  { id: 'yield-desc', tKey: 'market.sortYield' },
]

const PER_PAGE = 9

export default function PropertiesPage() {
  const t = useT()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visible, setVisible] = useState(PER_PAGE)

  /* ---- state lives in the URL so every search is shareable ---- */
  const q = params.get('q') ?? ''
  const intent = (params.get('intent') as ListingIntent | null) ?? 'all'
  const category = params.get('category') ?? ''
  const subcategory = params.get('subcategory') ?? ''
  const district = params.get('district') ?? ''
  const maxPrice = Number(params.get('maxPrice') ?? PRICE_BOUNDS.max)
  const verifiedOnly = params.get('verified') === '1'
  const sort = (params.get('sort') as SortKey | null) ?? 'newest'

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const resetAll = () => setParams(new URLSearchParams(), { replace: true })

  const activeCategory = CATEGORIES.find((c) => c.name === category)
  const availableSubs = useMemo(
    () => (activeCategory ? SUBCATEGORIES.filter((s) => s.category_id === activeCategory.id) : []),
    [activeCategory],
  )

  /* ---- filter + sort ---- */
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()

    const filtered = PROPERTIES.filter((p) => {
      if (intent !== 'all' && p.intent !== intent) return false
      if (activeCategory && p.category_id !== activeCategory.id) return false
      if (subcategory) {
        const sub = SUBCATEGORIES.find((s) => s.name === subcategory)
        if (sub && p.subcategory_id !== sub.id) return false
      }
      if (district && p.district !== district) return false
      if (verifiedOnly && !p.is_verified) return false

      // Rent figures live on a different scale, so only gate sale prices.
      if (p.intent === 'sale' && (p.estimated_amount ?? 0) > maxPrice) return false

      if (needle) {
        const haystack = [
          p.title,
          p.summary,
          p.location,
          p.district,
          p.sector,
          p.cell,
          p.village,
          p.upi,
          ...p.tags,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })

    const priceOf = (p: Property) =>
      p.intent === 'rent' ? (p.rent_amount ?? 0) : (p.estimated_amount ?? 0)

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return priceOf(a) - priceOf(b)
        case 'price-desc':
          return priceOf(b) - priceOf(a)
        case 'size-desc':
          return (b.size ?? 0) - (a.size ?? 0)
        case 'yield-desc':
          return (b.projected_yield ?? 0) - (a.projected_yield ?? 0)
        default:
          return +new Date(b.created_at) - +new Date(a.created_at)
      }
    })
  }, [q, intent, activeCategory, subcategory, district, maxPrice, verifiedOnly, sort])

  useEffect(() => setVisible(PER_PAGE), [results.length])

  const activeChips = (
    [
      q && { key: 'q', label: `“${q}”` },
      intent !== 'all' && {
        key: 'intent',
        label: t(intent === 'sale' ? 'prop.forSale' : 'prop.forRent'),
      },
      category && { key: 'category', label: activeCategory?.label ?? category },
      subcategory && {
        key: 'subcategory',
        label: SUBCATEGORIES.find((s) => s.name === subcategory)?.label ?? subcategory,
      },
      district && { key: 'district', label: district },
      verifiedOnly && { key: 'verified', label: t('market.verifiedOnly') },
      maxPrice < PRICE_BOUNDS.max && {
        key: 'maxPrice',
        label: `< ${formatCompactCurrency(maxPrice)}`,
      },
    ].filter(Boolean) as { key: string; label: string }[]
  )

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Properties for sale and rent in Rwanda',
    numberOfItems: results.length,
    itemListElement: results.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/properties/${p.id}`,
      name: p.title,
    })),
  }

  /* ------------------------------------------------------------------ *
   *  Filter panel — shared between the desktop rail and the mobile sheet
   * ------------------------------------------------------------------ */
  const filterPanel = (
    <div className="space-y-7">
      <Field label={t('market.keyword')}>
        <input
          type="search"
          value={q}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Location, UPI, feature…"
          className="h-10 w-full border-b border-line bg-transparent text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:outline-none"
        />
      </Field>

      <Field label={t('market.listingType')}>
        <div className="flex gap-1.5">
          {(['all', 'sale', 'rent'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setParam('intent', value)}
              className={cn(
                'flex-1 rounded-lg border py-2 text-[0.8125rem] font-medium transition-colors duration-300',
                intent === value
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-line text-ink-soft hover:border-line-strong',
              )}
            >
              {value === 'all'
                ? t('prop.all')
                : value === 'sale'
                  ? t('prop.buy')
                  : t('prop.rent')}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t('market.category')}>
        <ul className="-mx-2">
          <li>
            <FilterRow
              active={!category}
              label={t('market.allCategories')}
              count={PROPERTIES.length}
              onClick={() => {
                const next = new URLSearchParams(params)
                next.delete('category')
                next.delete('subcategory')
                setParams(next, { replace: true })
              }}
            />
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <FilterRow
                active={category === c.name}
                label={c.label}
                count={PROPERTIES.filter((p) => p.category_id === c.id).length}
                onClick={() => {
                  const next = new URLSearchParams(params)
                  if (category === c.name) next.delete('category')
                  else next.set('category', c.name)
                  next.delete('subcategory')
                  setParams(next, { replace: true })
                }}
              />
            </li>
          ))}
        </ul>
      </Field>

      <AnimatePresence initial={false}>
        {availableSubs.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <Field label={t('market.propertyType')}>
              <div className="flex flex-wrap gap-1.5">
                {availableSubs.map((s) => (
                  <Chip
                    key={s.id}
                    active={subcategory === s.name}
                    onClick={() => setParam('subcategory', subcategory === s.name ? null : s.name)}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <Field label={t('market.district')}>
        <div className="flex flex-wrap gap-1.5">
          {DISTRICTS.map((d) => (
            <Chip
              key={d}
              active={district === d}
              onClick={() => setParam('district', district === d ? null : d)}
            >
              {d}
            </Chip>
          ))}
        </div>
      </Field>

      <Field
        label={t('market.maxPrice')}
        aside={maxPrice >= PRICE_BOUNDS.max ? t('market.any') : formatCompactCurrency(maxPrice)}
      >
        <input
          type="range"
          aria-label={t('market.maxPrice')}
          min={10_000_000}
          max={PRICE_BOUNDS.max}
          step={5_000_000}
          value={maxPrice}
          onChange={(e) => setParam('maxPrice', e.target.value)}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-line accent-gold-500"
        />
        <div className="mt-2 flex justify-between text-[0.6875rem] text-ink-faint">
          <span>RWF 10M</span>
          <span>RWF 600M+</span>
        </div>
      </Field>

      <label className="flex cursor-pointer items-center gap-2.5 border-t border-line pt-5">
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => setParam('verified', e.target.checked ? '1' : null)}
          className="size-4 shrink-0 accent-gold-500"
        />
        <span className="text-[0.875rem] font-medium text-ink">{t('market.verifiedOnly')}</span>
      </label>

      {activeChips.length > 0 && (
        <button
          type="button"
          onClick={resetAll}
          className="w-full rounded-lg border border-line py-2.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-ink-muted hover:text-ink"
        >
          {t('market.clearFilters')}
        </button>
      )}
    </div>
  )

  return (
    <>
      <Seo
        title="Properties for Sale & Rent in Rwanda"
        description="Browse verified land, houses, apartments and commercial property across Kigali and Rwanda. Every listing is checked against its UPI at the Rwanda Land Authority before it goes live."
        path="/properties"
        keywords={[
          'land for sale Kigali',
          'houses for sale Rwanda',
          'apartments for rent Kigali',
          'commercial property Rwanda',
          'verified UPI land Rwanda',
        ]}
        jsonLd={[
          listJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Properties', path: '/properties' },
          ]),
        ]}
      />

      {/* ---------------- masthead ---------------- */}
      <section className="border-b border-line bg-canvas">
        <div className="container-page py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className="text-[0.75rem] text-ink-faint">
            <Link to="/" className="transition-colors hover:text-gold-600">
              {t('nav.home')}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink-soft">{t('nav.properties')}</span>
          </nav>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-[-0.02em] text-ink sm:text-[2.125rem]">
                {t('market.title')}
              </h1>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                Every parcel here is checked against its UPI at the Rwanda Land Authority before it
                reaches this page — tenure, size and coordinates published up front.
              </p>
            </div>

            <dl className="flex gap-8 border-t border-line pt-5 lg:border-0 lg:pt-0">
              {[
                { value: String(PROPERTIES.length), label: 'Live listings' },
                { value: '7', label: 'Districts' },
                { value: '100%', label: 'Verified' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="font-display text-xl leading-none font-semibold text-ink">
                    {stat.value}
                  </dd>
                  <dt className="mt-1.5 text-[0.75rem] text-ink-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------- sticky toolbar ---------------- */}
      <div className="sticky top-16 z-30 border-b border-line bg-canvas/95 backdrop-blur-xl">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-line-strong lg:hidden"
            >
              <SlidersHorizontal className="size-3.5" strokeWidth={2.2} />
              {t('market.filters')}
              {activeChips.length > 0 && (
                <span className="grid size-4 place-items-center rounded-full bg-gold-500 text-[0.625rem] font-bold text-white">
                  {activeChips.length}
                </span>
              )}
            </button>

            <p className="shrink-0 text-[0.875rem] text-ink-soft">
              <span className="font-display text-lg font-semibold text-ink">{results.length}</span>{' '}
              <span className="hidden sm:inline">
                {results.length === 1
                  ? t('market.oneResult').replace('1 ', '')
                  : t('market.resultsFound', { count: results.length }).replace(
                      `${results.length} `,
                      '',
                    )}
              </span>
            </p>

            {/* active chips — scroll horizontally rather than wrap the bar */}
            {activeChips.length > 0 && (
              <div className="hidden min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] md:flex [&::-webkit-scrollbar]:hidden">
                {activeChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setParam(chip.key, null)}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-canvas-alt py-1 pr-2 pl-3 text-[0.75rem] font-medium text-ink-soft transition-colors hover:text-red-500"
                  >
                    {chip.label}
                    <X className="size-3" strokeWidth={2.6} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label className="sr-only" htmlFor="sort">
              {t('market.sort')}
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="h-9 rounded-lg border border-line bg-surface px-3 text-[0.8125rem] font-medium text-ink transition-colors hover:border-line-strong focus:border-gold-500 focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.tKey as 'market.sortNewest')}
                </option>
              ))}
            </select>

            <div className="hidden items-center rounded-lg border border-line sm:flex">
              {(
                [
                  { id: 'grid', icon: LayoutGrid, label: t('market.gridView') },
                  { id: 'list', icon: Rows3, label: t('market.listView') },
                ] as const
              ).map((v) => {
                const Cmp = v.icon
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    aria-label={v.label}
                    aria-pressed={view === v.id}
                    className={cn(
                      'grid size-8 place-items-center transition-colors first:rounded-l-md last:rounded-r-md',
                      view === v.id ? 'bg-ink text-canvas' : 'text-ink-muted hover:text-ink',
                    )}
                  >
                    <Cmp className="size-3.5" strokeWidth={2.2} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- results ---------------- */}
      <section className="bg-canvas py-10 lg:py-14">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-12">
            {/* desktop filter rail */}
            <aside className="hidden lg:block">
              <div className="sticky top-36 max-h-[calc(100dvh-11rem)] overflow-y-auto pr-2">
                <h2 className="mb-6 flex items-center gap-2 text-[0.6875rem] font-semibold tracking-[0.18em] text-ink-muted uppercase">
                  {t('market.filters')}
                  {activeChips.length > 0 && (
                    <span className="grid size-4 place-items-center rounded-full bg-gold-500 text-[0.625rem] font-bold text-white">
                      {activeChips.length}
                    </span>
                  )}
                </h2>
                {filterPanel}
              </div>
            </aside>

            <div>
              {results.length > 0 ? (
                <>
                  <motion.div
                    key={`${view}-${results.length}-${sort}`}
                    initial="hidden"
                    animate="show"
                    variants={stagger(0.05)}
                    className={cn(
                      view === 'grid'
                        ? 'grid gap-5 sm:grid-cols-2 xl:grid-cols-3'
                        : 'flex flex-col gap-4',
                    )}
                  >
                    {results.slice(0, visible).map((property, i) =>
                      view === 'grid' ? (
                        <PropertyCard key={property.id} property={property} index={i} />
                      ) : (
                        <PropertyRow key={property.id} property={property} />
                      ),
                    )}
                  </motion.div>

                  {visible < results.length && (
                    <div className="mt-12 flex flex-col items-center gap-3">
                      <p className="text-[0.8125rem] text-ink-muted">
                        {t('market.showing', {
                          shown: Math.min(visible, results.length),
                          total: results.length,
                        })}
                      </p>
                      <Button variant="outline" onClick={() => setVisible((v) => v + PER_PAGE)}>
                        {t('cta.loadMore')}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-line-strong px-6 py-20 text-center">
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {t('market.noResults')}
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
                    {t('market.noResultsBody')}
                  </p>
                  <div className="mt-7 flex flex-wrap justify-center gap-3">
                    <Button onClick={resetAll} variant="outline">
                      {t('market.clearFilters')}
                    </Button>
                    <Button to="/contact" variant="gold">
                      Tell us what you need
                    </Button>
                  </div>
                </div>
              )}

              {/* seller CTA */}
              <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-canvas-alt p-7 sm:p-9 lg:flex-row lg:items-center">
                <div className="max-w-xl">
                  <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                    Have a property you want to sell?
                  </h2>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-muted">
                    Free valuation, drone video and professional photography included. Commission
                    agreed in writing before we start, and only earned on completion.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <Button to="/sell" variant="gold">
                    {t('cta.listProperty')}
                  </Button>
                  <Button to="/consultation" variant="outline">
                    Book a valuation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- mobile filter sheet ---------------- */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
              className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: EASE }}
              role="dialog"
              aria-modal="true"
              aria-label={t('market.filters')}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-3xl bg-canvas lg:hidden"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
                <h2 className="font-display text-lg font-semibold text-ink">
                  {t('market.filters')}
                </h2>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  aria-label={t('nav.closeMenu')}
                  className="grid size-9 place-items-center rounded-full border border-line text-ink"
                >
                  <X className="size-4" strokeWidth={2.2} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6">{filterPanel}</div>
              <div className="shrink-0 border-t border-line bg-surface px-5 py-4">
                <Button onClick={() => setFiltersOpen(false)} variant="primary" className="w-full">
                  {results.length === 1
                    ? t('market.oneResult')
                    : t('market.resultsFound', { count: results.length })}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ------------------------------------------------------------------ *
 *  Small filter-panel primitives
 * ------------------------------------------------------------------ */

function Field({
  label,
  aside,
  children,
}: {
  label: string
  aside?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-muted uppercase">
          {label}
        </p>
        {aside && <span className="text-[0.8125rem] font-semibold text-ink">{aside}</span>}
      </div>
      {children}
    </div>
  )
}

function FilterRow({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[0.875rem] transition-colors',
        active ? 'font-semibold text-gold-600' : 'text-ink-soft hover:bg-canvas-alt hover:text-ink',
      )}
    >
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'h-px transition-all duration-300',
            active ? 'w-4 bg-gold-500' : 'w-0 bg-transparent',
          )}
        />
        {label}
      </span>
      <span className="text-[0.75rem] text-ink-faint tabular-nums">{count}</span>
    </button>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md border px-2.5 py-1.5 text-[0.75rem] font-medium transition-colors duration-200',
        active
          ? 'border-gold-500 bg-gold-500 text-white'
          : 'border-line text-ink-soft hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
