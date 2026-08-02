import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check } from 'lucide-react'
import { useBlock, useQuery } from '@/lib/queries'
import type { ApiServiceLine } from '@/types/api'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

const DIVISION_STYLES: Record<string, string> = {
  Realty: 'bg-accent-soft text-ink-soft',
  Construction: 'bg-gold-50 text-gold-700',
  Group: 'bg-emerald-50 text-emerald-700',
}

export function ServicesGrid() {
  const block = useBlock('home', 'services', {
    eyebrow: "What we do",
    title: "Two divisions.",
    accent: "One value chain.",
    body: "Most agencies sell and disappear. Most builders never see the buyer. Evaramu Realty and Evaramu Construction sit inside the same company — which is why we can add value to a property instead of just transacting on it.",
  })
  const { data } = useQuery<ApiServiceLine[]>('/public/services')
  const services = data ?? []

  if (services.length === 0) return null

  return (
    <section className="bg-surface py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
          description="Most agencies sell and disappear. Most builders never see the buyer. Evaramu Realty and Evaramu Construction sit inside the same company — which is why we can add value to a property instead of just transacting on it."
        />

        <motion.div
          {...revealProps}
          variants={stagger(0.08)}
          className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
        >
          {services.map((service) => (
            <motion.article
              key={service.id}
              variants={fadeUp}
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-canvas p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:border-line-strong hover:bg-surface hover:shadow-lift"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-13 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-all duration-500 group-hover:scale-105 group-hover:bg-gold-500 group-hover:text-white">
                  <Icon name={service.icon ?? "Building2"} className="size-6" strokeWidth={1.9} />
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase',
                    DIVISION_STYLES[service.division],
                  )}
                >
                  {service.division}
                </span>
              </div>

              <h3 className="mt-6 font-display text-xl font-semibold text-ink">
                {service.title}
              </h3>
              <p className="mt-1.5 text-[0.875rem] font-semibold text-gold-600">
                {service.tagline}
              </p>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                {service.description}
              </p>

              <ul className="mt-6 space-y-2.5">
                {(service.bullets ?? []).map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-[0.875rem] text-ink-soft">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-gold-500"
                      strokeWidth={3}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>

              <Link
                to={service.href ?? '/services'}
                className="group/link mt-7 inline-flex items-center gap-2 text-[0.9375rem] font-bold text-ink transition-colors hover:text-gold-600 before:absolute before:inset-0"
              >
                Learn more
                <ArrowUpRight
                  className="size-4 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                  strokeWidth={2.4}
                />
              </Link>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
