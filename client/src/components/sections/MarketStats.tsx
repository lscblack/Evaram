import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBlock, useLocalizedQuery } from '@/lib/queries'
import type { ApiMarketStat } from '@/types/api'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { useT } from '@/lib/i18n'

/** The market case — why property in Rwanda, in four numbers. */
export function MarketStats() {
  const t = useT()
  const block = useBlock('home', 'market', {
    eyebrow: "The market",
    title: "The demand is structural,",
    accent: "not speculative.",
    body: "Rwanda needs more than 30,000 new housing units a year and delivered 13.8% of that in 2024. The gap is not a trend that might reverse — it is arithmetic, and it is widening.",
  })
  const { data } = useLocalizedQuery<ApiMarketStat>('/public/market-stats')
  const stats = data ?? []

  if (stats.length === 0) return null

  return (
    <section id="market" className="relative overflow-hidden bg-canvas py-16 lg:py-24">
      <div className="pointer-events-none absolute inset-0 bg-blueprint-light opacity-60" />

      <div className="container-page relative">
        <SectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
          description={block.body}
          action={
            <Link
              to="/insights"
              className="group inline-flex items-center gap-2 text-[0.9375rem] font-bold text-gold-600 transition-colors hover:text-gold-700"
            >
              {t('cta.readMarketReports')}
              <ArrowUpRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2.4}
              />
            </Link>
          }
        />

        <motion.div
          {...revealProps}
          variants={stagger(0.1)}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-7 shadow-soft transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
            >
              <span
                aria-hidden
                className="absolute -top-8 -right-8 size-28 rounded-full bg-gold-500/5 transition-transform duration-700 group-hover:scale-150"
              />

              <span className="relative grid size-12 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                <Icon name={stat.icon ?? "TrendingUp"} className="size-[1.35rem]" strokeWidth={2} />
              </span>

              <p className="relative mt-6 font-display text-[1.75rem] leading-none font-semibold text-ink">
                {stat.value}
              </p>
              <p className="relative mt-3 font-semibold text-ink">{stat.label}</p>
              <p className="relative mt-1.5 text-[0.875rem] leading-snug text-ink-muted">
                {stat.detail}
              </p>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          {...revealProps}
          variants={fadeUp}
          className="mt-8 text-[0.8125rem] text-ink-muted"
        >
          Sources: Rwanda residential market valued at USD 84.85B of a USD 95.70B total (2025),
          projected USD 110.10B by 2029 · population 13.2M today, 23.6M by 2052.
        </motion.p>
      </div>
    </section>
  )
}
