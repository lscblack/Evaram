import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Search } from 'lucide-react'
import { useBlockItems, useQuery } from '@/lib/queries'
import { useSiteConfig, useSite } from '@/lib/siteConfig'
import type { ApiCategory, ApiPropertyCard } from '@/types/api'
import { EASE } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { cn, formatCompactCurrency } from '@/lib/utils'

/**
 * Editorial hero: a stacked-serif statement on the left, a live listing card
 * on the right, and a full-width search rail bridging the two. Deliberately
 * asymmetric and type-led rather than a centred image with a floating panel.
 */

/** Fallback for `home` → `hero_stats` — the shipped copy. */
const HERO_STATS_FALLBACK = [
  { value: '750+', label: 'Properties catalogued' },
  { value: '20–50%', label: 'Value added by build' },
  { value: '100%', label: 'Titles verified' },
]

/** Fallback for `home` → `hero_marquee` — the shipped copy. */
const MARQUEE_ITEMS_FALLBACK: string[] = [
  'Every title verified at the National Land Authority',
  'We broker and we build',
  'Response within two hours',
  'Diaspora reporting every month',
  'Commission agreed in writing',
]

export function Hero() {
  const heroStats = useBlockItems(
    'home',
    'hero_stats',
    HERO_STATS_FALLBACK,
  )
  const marqueeItems = useBlockItems(
    'home',
    'hero_marquee',
    MARQUEE_ITEMS_FALLBACK,
  )
  const site = useSite()
  const navigate = useNavigate()
  const t = useT()

  const [active, setActive] = useState(0)
  const [intent, setIntent] = useState<'sale' | 'rent'>('sale')
  const [category, setCategory] = useState('')
  const [district, setDistrict] = useState('')
  const [query, setQuery] = useState('')

  const { data: featuredData } = useQuery<ApiPropertyCard[]>('/public/properties/featured?limit=4')
  const featured = useMemo(() => featuredData ?? [], [featuredData])

  const { data: categoryData } = useQuery<ApiCategory[]>('/public/taxonomy')
  const categories = categoryData ?? []
  const { districts } = useSiteConfig()

  useEffect(() => {
    if (featured.length < 2) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % featured.length), 5000)
    return () => window.clearInterval(id)
  }, [featured.length])

  const property = featured[active % Math.max(featured.length, 1)] as
    | ApiPropertyCard
    | undefined

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('intent', intent)
    if (category) params.set('category', category)
    if (district) params.set('district', district)
    if (query.trim()) params.set('q', query.trim())
    navigate(`/properties?${params.toString()}`)
  }

  const field =
    'h-11 w-full border-0 bg-transparent text-[0.9375rem] text-ink placeholder:text-ink-faint focus:outline-none'

  return (
    <section className="relative overflow-hidden bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-blueprint-light opacity-70"
      />

      <div className="container-page relative">
        <div className="grid items-end gap-x-12 gap-y-12 pt-12 pb-10 lg:grid-cols-12 lg:pt-20">
          {/* ---------- statement ---------- */}
          <div className="lg:col-span-7 xl:col-span-6">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 text-[0.6875rem] font-semibold tracking-[0.2em] text-ink-muted uppercase"
            >
              <span aria-hidden className="h-px w-8 bg-gold-500" />
              {t('hero.badge')}
            </motion.p>

            <h1 className="mt-7 font-display text-[2.25rem] leading-[1.02] font-semibold tracking-[-0.02em] text-ink sm:text-[2.875rem] lg:text-[3.25rem] xl:text-[3.5rem]">
              {[t('hero.titleA'), t('hero.titleB')].map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.1 + i * 0.12 }}
                    className={cn('block', i === 1 && 'text-gold-600 dark:text-gold-400')}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
              className="mt-7 max-w-xl text-[1rem] leading-relaxed text-ink-soft"
            >
              {t('hero.lede')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4"
            >
              <Link
                to="/properties"
                className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-ink px-7 text-[0.9375rem] font-semibold text-canvas transition-colors duration-300 hover:bg-gold-500 hover:text-white"
              >
                {t('cta.browseProperties')}
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2.2}
                />
              </Link>
              <Link
                to="/wealth-cycle"
                className="inline-flex items-center gap-2 border-b border-ink-faint pb-1 text-[0.9375rem] font-semibold text-ink transition-colors hover:border-gold-500 hover:text-gold-600"
              >
                {t('cta.seeWealthCycle')}
              </Link>
            </motion.div>

            {/* three ruled figures — no icons */}
            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.65 }}
              className="mt-12 grid max-w-lg grid-cols-3 divide-x divide-line border-t border-line pt-6"
            >
              {heroStats.map((stat, i) => (
                <div key={stat.label} className={cn(i > 0 && 'pl-5', i < 2 && 'pr-5')}>
                  <dd className="font-display text-xl leading-none font-semibold text-ink sm:text-2xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-2 text-[0.75rem] leading-snug text-ink-muted">{stat.label}</dt>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* ---------- live listing card ---------- */}
          {property && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
            className="lg:col-span-5 xl:col-span-6"
          >
            <div className="relative">
              <div className="relative overflow-hidden rounded-3xl bg-navy-950">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={property.id}
                    src={property.cover_url ?? undefined}
                    alt={property.title}
                    initial={{ opacity: 0, scale: 1.06 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      opacity: { duration: 0.6 },
                      scale: { duration: 5, ease: 'linear' },
                    }}
                    className="aspect-4/5 w-full object-cover sm:aspect-16/11 lg:aspect-4/5 xl:aspect-16/11"
                  />
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/25 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-gold-300 uppercase">
                        {property.district} ·{' '}
                        {t(property.intent === 'rent' ? 'prop.forRent' : 'prop.forSale')}
                      </p>
                      <h2 className="mt-2 max-w-md font-display text-xl leading-snug font-semibold text-white sm:text-2xl">
                        <Link to={`/properties/${property.slug}`} className="hover:text-gold-300">
                          {property.title}
                        </Link>
                      </h2>
                      <p className="mt-2.5 font-display text-lg font-semibold text-white">
                        {formatCompactCurrency(
                          property.intent === 'rent'
                            ? (property.rent_amount ?? 0)
                            : (property.price ?? 0),
                          property.currency,
                        )}
                        {property.intent === 'rent' && (
                          <span className="ml-1 font-sans text-[0.8125rem] font-medium text-white/60">
                            {t('prop.perMonth')}
                          </span>
                        )}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-5 flex items-center gap-1.5">
                    {featured.map((p, i) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActive(i)}
                        aria-label={p.title}
                        aria-current={i === active}
                        className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25"
                      >
                        {i === active && (
                          <motion.span
                            key={`bar-${p.id}`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 5, ease: 'linear' }}
                            className="block h-full origin-left bg-gold-400"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute -top-3 -left-3 hidden rounded-full border border-line bg-surface px-4 py-2 shadow-soft sm:block">
                <p className="text-[0.6875rem] font-semibold tracking-wide text-ink uppercase">
                  {t('prop.titleVerified')} · NLA
                </p>
              </div>
            </div>
          </motion.div>
          )}
        </div>

        {/* ---------- search rail ---------- */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.55 }}
          onSubmit={onSearch}
          className="relative -mb-8 overflow-hidden rounded-2xl border border-line bg-surface shadow-lift lg:-mb-10"
        >
          <div className="grid divide-y divide-line lg:grid-cols-[auto_1fr_1fr_1fr_auto] lg:divide-x lg:divide-y-0">
            <div className="flex items-center gap-1 p-2 lg:p-3">
              {(['sale', 'rent'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIntent(value)}
                  className={cn(
                    'relative flex-1 rounded-full px-5 py-2.5 text-[0.875rem] font-semibold transition-colors duration-300 lg:flex-none',
                    intent === value ? 'text-canvas' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {intent === value && (
                    <motion.span
                      layoutId="hero-intent"
                      className="absolute inset-0 rounded-full bg-ink"
                      transition={{ duration: 0.35, ease: EASE }}
                    />
                  )}
                  <span className="relative">
                    {value === 'sale' ? t('prop.buy') : t('prop.rent')}
                  </span>
                </button>
              ))}
            </div>

            <label className="flex items-center gap-3 px-5 py-1 lg:px-6">
              <Search className="size-4 shrink-0 text-ink-faint" strokeWidth={2.1} />
              <span className="sr-only">{t('market.keyword')}</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Kanombe, Kimironko, UPI…"
                className={field}
              />
            </label>

            <label className="flex items-center px-5 lg:px-6">
              <span className="sr-only">{t('market.propertyType')}</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn(field, 'cursor-pointer')}
              >
                <option value="">{t('market.allTypes')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center px-5 lg:px-6">
              <span className="sr-only">{t('market.district')}</span>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className={cn(field, 'cursor-pointer')}
              >
                <option value="">{t('market.allDistricts')}</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <div className="p-2 lg:p-3">
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gold-500 px-7 text-[0.875rem] font-semibold whitespace-nowrap text-white transition-colors duration-300 hover:bg-gold-600"
              >
                {t('cta.search')}
              </button>
            </div>
          </div>
        </motion.form>
      </div>

      {/* ---------- promise marquee ---------- */}
      <div className="mt-8 border-y border-line bg-canvas-alt py-3 lg:mt-10">
        <div className="mask-fade-x flex overflow-hidden">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex animate-marquee shrink-0 items-center gap-10 pr-10 whitespace-nowrap"
            >
              {marqueeItems.map((item) => (
                <span
                  key={`${copy}-${item}`}
                  className="flex items-center gap-10 text-[0.8125rem] font-medium text-ink-muted"
                >
                  {item}
                  <span aria-hidden className="size-1 rounded-full bg-gold-500" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="sr-only">
        {site.name} — {site.tagline}
      </p>
    </section>
  )
}
