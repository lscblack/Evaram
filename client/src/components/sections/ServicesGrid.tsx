import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { useBlock, useLocalizedQuery } from '@/lib/queries'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ApiServiceLine } from '@/types/api'
import type { TranslationKey } from '@/data/translations'

const DIVISION_STYLES: Record<string, string> = {
  realty: 'text-gold-700',
  construction: 'text-ink-muted',
}

/**
 * What we do, as a grid of compact cards.
 *
 * One card per service: icon, name, one line, which division. No descriptions,
 * no bullet points — those live on /services, one click away. The card carries
 * exactly enough to choose one, which is all a homepage section is for.
 */
export function ServicesGrid() {
  const t = useT()
  const block = useBlock('home', 'services', {
    eyebrow: 'What we do',
    title: 'Two divisions.',
    accent: 'One value chain.',
    body: 'We broker property and we build on it, so the same team that found you a plot can put a house on it.',
  })
  const { data } = useLocalizedQuery<ApiServiceLine>('/public/services')
  const services = data ?? []

  if (services.length === 0) return null

  return (
    <section className="bg-surface py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
          description={block.body}
        />

        <motion.div
          {...revealProps}
          variants={stagger(0.05)}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {services.map((service, index) => (
            <motion.div key={service.id} variants={fadeUp}>
              <Link
                to={service.href ?? '/services'}
                className="group flex h-full flex-col rounded-2xl border border-line bg-canvas p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface hover:shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas-alt text-ink transition-colors group-hover:bg-gold-500 group-hover:text-white">
                    <Icon name={service.icon ?? 'Building2'} className="size-5" strokeWidth={1.9} />
                  </span>
                  <span className="font-display text-[0.75rem] tabular-nums text-ink-faint">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <span className="mt-4 block font-display text-[1.0625rem] leading-snug font-semibold text-ink">
                  {service.title}
                </span>
                {service.tagline && (
                  <span className="mt-1 block text-[0.875rem] leading-snug text-ink-soft">
                    {service.tagline}
                  </span>
                )}

                <span className="mt-auto flex items-center justify-between pt-4">
                  <span
                    className={cn(
                      'text-[0.6875rem] font-bold tracking-wide uppercase',
                      DIVISION_STYLES[service.division] ?? 'text-ink-muted',
                    )}
                  >
                    {t(`division.${service.division}` as TranslationKey)}
                  </span>
                  <ArrowUpRight
                    className="size-4 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-600"
                    strokeWidth={2.4}
                  />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-ink transition-colors hover:text-gold-600"
          >
            How each service works, and what it costs
            <ArrowUpRight className="size-4" strokeWidth={2.4} />
          </Link>
        </div>
      </div>
    </section>
  )
}
