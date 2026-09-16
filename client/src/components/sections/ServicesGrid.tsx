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
 * What we do, as a list you can read top to bottom.
 *
 * One row per service: icon, name, one line, which division. No cards, no
 * descriptions, no bullet points — those live on /services, one click away.
 * A list is scanned in seconds; a wall of cards is read, or more often not.
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

        <motion.ol
          {...revealProps}
          variants={stagger(0.05)}
          className="mt-12 divide-y divide-line border-y border-line"
        >
          {services.map((service, index) => (
            <motion.li key={service.id} variants={fadeUp}>
              <Link
                to={service.href ?? '/services'}
                className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 transition-colors hover:bg-canvas sm:grid-cols-[2.5rem_auto_1fr_auto] sm:gap-6"
              >
                <span className="hidden font-display text-[0.8125rem] tabular-nums text-ink-faint sm:block">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-canvas-alt text-ink transition-colors group-hover:bg-gold-500 group-hover:text-white">
                  <Icon name={service.icon ?? 'Building2'} className="size-5" strokeWidth={1.9} />
                </span>

                <span className="min-w-0">
                  <span className="block font-display text-[1.0625rem] font-semibold text-ink sm:text-lg">
                    {service.title}
                  </span>
                  {service.tagline && (
                    <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink-soft">
                      {service.tagline}
                    </span>
                  )}
                </span>

                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      'hidden text-[0.6875rem] font-bold tracking-wide uppercase md:block',
                      DIVISION_STYLES[service.division] ?? 'text-ink-muted',
                    )}
                  >
                    {t(`division.${service.division}` as TranslationKey)}
                  </span>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-600"
                    strokeWidth={2.4}
                  />
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ol>

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
