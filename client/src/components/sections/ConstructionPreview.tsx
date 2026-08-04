import { motion } from 'framer-motion'
import { ArrowRight, Check, Star } from 'lucide-react'
import { useBlock, useQuery } from '@/lib/queries'
import type { ApiPackage } from '@/types/api'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn, formatCurrency } from '@/lib/utils'

export function ConstructionPreview() {
  const block = useBlock('home', 'construction', {
    eyebrow: "Evaramu Construction",
    title: "Fixed prices, written down",
    accent: "before we start.",
    body: "Construction cost overrun is the highest risk in this business. We manage it the only honest way: a fixed-price contract, a 15% contingency stated openly at signature, and a cost sheet you can open at any time.",
  })
  const { data } = useQuery<ApiPackage[]>('/public/construction-packages')
  const packages = data ?? []

  if (packages.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-canvas-alt py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
          description="Construction cost overrun is the highest risk in this business. We manage it the only honest way: a fixed-price contract, a 15% contingency stated openly at signature, and a cost sheet you can open at any time."
          action={
            <Button
              to="/construction"
              variant="primary"
              trailing={
                <ArrowRight
                  className="size-[1.05rem] transition-transform duration-300 group-hover/btn:translate-x-1"
                  strokeWidth={2.3}
                />
              }
            >
              Explore construction
            </Button>
          }
        />

        <motion.div
          {...revealProps}
          variants={stagger(0.1)}
          className="mt-14 grid gap-6 lg:grid-cols-3"
        >
          {packages.map((pkg) => (
            <motion.article
              key={pkg.id}
              variants={fadeUp}
              className={cn(
                'relative flex flex-col overflow-hidden rounded-3xl p-8 transition-all duration-500 ease-brand hover:-translate-y-2',
                pkg.is_popular
                  ? 'bg-navy-950 text-white shadow-lift lg:-mt-4 lg:mb-4'
                  : 'border border-line bg-surface shadow-soft hover:shadow-lift',
              )}
            >
              {pkg.is_popular && (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                  <span className="absolute top-7 right-7 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide text-white uppercase">
                    <Star className="size-3 fill-white" strokeWidth={0} />
                    Most chosen
                  </span>
                </>
              )}

              <div className="relative">
                <p
                  className={cn(
                    'text-[0.6875rem] font-bold tracking-[0.2em] uppercase',
                    pkg.is_popular ? 'text-gold-400' : 'text-gold-600',
                  )}
                >
                  {pkg.tier}
                </p>
                <h3
                  className={cn(
                    'mt-3 font-display text-2xl font-semibold',
                    pkg.is_popular ? 'text-white' : 'text-ink',
                  )}
                >
                  {pkg.name}
                </h3>
                <p
                  className={cn(
                    'mt-2 text-[0.9375rem]',
                    pkg.is_popular ? 'text-white/60' : 'text-ink-muted',
                  )}
                >
                  {pkg.tagline}
                </p>

                <div
                  className={cn(
                    'mt-7 border-y py-6',
                    pkg.is_popular ? 'border-white/10' : 'border-line',
                  )}
                >
                  <p
                    className={cn(
                      'text-[0.75rem] font-semibold tracking-wide uppercase',
                      pkg.is_popular ? 'text-white/45' : 'text-ink-muted',
                    )}
                  >
                    From
                  </p>
                  <p
                    className={cn(
                      'mt-1 font-display text-4xl leading-none font-bold',
                      pkg.is_popular ? 'text-white' : 'text-ink',
                    )}
                  >
                    {pkg.price_per_sqm != null
                      ? formatCurrency(pkg.price_per_sqm)
                      : 'On quotation'}
                    <span
                      className={cn(
                        'ml-1.5 font-sans text-sm font-medium',
                        pkg.is_popular ? 'text-white/50' : 'text-ink-muted',
                      )}
                    >
                      {pkg.price_per_sqm != null ? '/sqm' : ''}
                    </span>
                  </p>
                  <p
                    className={cn(
                      'mt-2 text-[0.875rem]',
                      pkg.is_popular ? 'text-white/55' : 'text-ink-muted',
                    )}
                  >
                    Typical duration {pkg.duration}
                  </p>
                </div>

                <ul className="mt-6 space-y-3">
                  {(pkg.includes ?? []).slice(0, 5).map((item) => (
                    <li
                      key={item}
                      className={cn(
                        'flex items-start gap-2.5 text-[0.9375rem] leading-snug',
                        pkg.is_popular ? 'text-white/70' : 'text-ink-soft',
                      )}
                    >
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-gold-500"
                        strokeWidth={3}
                      />
                      {item}
                    </li>
                  ))}
                </ul>

                <Button
                  to="/construction"
                  variant={pkg.is_popular ? 'gold' : 'outline'}
                  className="mt-8 w-full"
                >
                  Get a quote
                </Button>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
