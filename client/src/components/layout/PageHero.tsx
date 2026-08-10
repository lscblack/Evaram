import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { EASE, blurUp, fadeUp, staggerSlow } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { useHeroScroll, useParallax } from '@/lib/scroll'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  to?: string
}

/**
 * The dark banner that opens every inner page. Keeps breadcrumbs, the H1 and
 * any page-level stats consistent across the site.
 */
export function PageHero({
  eyebrow,
  title,
  accent,
  description,
  crumbs = [],
  image,
  stats,
  children,
  compact = false,
}: {
  eyebrow?: string
  title: string
  accent?: string
  description?: React.ReactNode
  crumbs?: Crumb[]
  image?: string
  stats?: { value: string; label: string }[]
  children?: React.ReactNode
  compact?: boolean
}) {
  const t = useT()
  const sectionRef = useRef<HTMLElement>(null)
  // The image drifts against the copy as the banner leaves; the copy itself
  // fades so the transition into the page body is not a hard edge.
  const imageY = useParallax(sectionRef, 90)
  const { opacity: copyOpacity } = useHeroScroll(sectionRef)

  return (
    <section ref={sectionRef} className="relative isolate overflow-hidden bg-navy-950 text-white">
      {image && (
        <div className="absolute inset-0 -z-10">
          <motion.img
            src={image}
            alt=""
            aria-hidden
            initial={{ scale: 1.14 }}
            animate={{ scale: 1 }}
            transition={{ duration: 9, ease: 'linear' }}
            style={{ y: imageY }}
            // Taller than the section so the parallax travel never exposes an edge.
            className="absolute inset-x-0 -top-12 h-[calc(100%+6rem)] w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/93 to-navy-950/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 to-transparent" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blueprint opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-0 -z-10 size-[30rem] rounded-full bg-gold-500/10 blur-[130px]"
      />

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerSlow(0.05)}
        style={{ opacity: copyOpacity }}
        className={cn('container-page relative', compact ? 'py-12 lg:py-16' : 'py-16 lg:py-24')}
      >
        {/* breadcrumbs */}
        {crumbs.length > 0 && (
          <motion.nav variants={fadeUp} aria-label="Breadcrumb" className="mb-7">
            <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-white/45">
              <li>
                <Link to="/" className="transition-colors hover:text-gold-300">
                  {t('nav.home')}
                </Link>
              </li>
              {crumbs.map((crumb, i) => (
                <li key={crumb.label} className="flex items-center gap-1.5">
                  <ChevronRight className="size-3.5 text-white/25" strokeWidth={2.4} />
                  {crumb.to && i < crumbs.length - 1 ? (
                    <Link to={crumb.to} className="transition-colors hover:text-gold-300">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-white/80" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </motion.nav>
        )}

        <div className="max-w-3xl">
          {eyebrow && (
            <motion.div variants={fadeUp}>
              <Eyebrow tone="light">{eyebrow}</Eyebrow>
            </motion.div>
          )}

          <motion.h1
            variants={blurUp}
            className={cn(
              'mt-5 leading-[1.08] font-bold text-white',
              compact
                ? 'text-[1.75rem] sm:text-[2.125rem] lg:text-[2.5rem]'
                : 'text-[1.875rem] sm:text-[2.375rem] lg:text-[2.875rem]',
            )}
          >
            {title}
            {accent && (
              <>
                {' '}
                <span className="text-gradient-gold">{accent}</span>
              </>
            )}
          </motion.h1>

          {description && (
            <motion.p
              variants={fadeUp}
              className="mt-6 text-[0.9375rem] leading-relaxed text-white/65 sm:text-lg"
            >
              {description}
            </motion.p>
          )}
        </div>

        {children && (
          <motion.div variants={fadeUp} className="mt-9">
            {children}
          </motion.div>
        )}

        {stats && stats.length > 0 && (
          <motion.dl
            variants={fadeUp}
            className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-9 sm:grid-cols-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.35 + i * 0.08 }}
              >
                <dd className="font-display text-3xl leading-none font-bold text-white sm:text-4xl">
                  {stat.value}
                </dd>
                <dt className="mt-2.5 text-[0.8125rem] leading-snug text-white/50">
                  {stat.label}
                </dt>
              </motion.div>
            ))}
          </motion.dl>
        )}
      </motion.div>
    </section>
  )
}
