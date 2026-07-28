import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { WEALTH_CYCLE } from '@/data/services'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { EASE, fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The six-step cycle, shown as an interactive ring on desktop and a stacked
 * timeline on mobile.
 */
export function WealthCycleSection() {
  const [active, setActive] = useState(0)
  const step = WEALTH_CYCLE[active]

  return (
    <section className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-70" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/8 blur-[140px]"
      />

      <div className="container-page relative">
        <SectionHeading
          tone="light"
          align="center"
          eyebrow="Our signature model"
          title="The Evaramu"
          accent="Wealth Cycle"
          description="Most agencies close a sale and disappear. We stay. Buy, build, earn, sell, reinvest, repeat — six steps that turn one property into four or five within three years."
        />

        {/* ---------- desktop ring ---------- */}
        {/* The node chips are centred on the orbit, so they overhang the ring
            by roughly half their own size — the wrapper padding reserves that
            space instead of letting them collide with the heading and CTA. */}
        <div className="mt-12 hidden px-16 py-14 lg:block">
          <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
            {/* orbit rings */}
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-white/10"
            />
            <span
              aria-hidden
              className="absolute inset-[14%] rounded-full border border-dashed border-white/10"
            />
            <motion.span
              aria-hidden
              className="absolute inset-[7%] rounded-full border border-gold-500/25"
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              style={{ borderStyle: 'dashed' }}
            />

            {/* centre panel */}
            <div className="absolute inset-[16%] grid place-items-center rounded-full border border-white/10 bg-navy-900/80 p-9 text-center backdrop-blur-xl">
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-gold-500 text-white mx-auto">
                  <Icon name={step.icon} className="size-7" strokeWidth={2} />
                </span>
                <p className="mt-5 text-[0.6875rem] font-bold tracking-[0.22em] text-gold-400 uppercase">
                  Step {step.step} of 6
                </p>
                <h3 className="mt-2 font-display text-2xl font-semibold text-white">{step.title}</h3>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/65">
                  {step.action}
                </p>
                <p className="mt-4 border-t border-white/10 pt-4 text-[0.875rem] font-semibold text-gold-300">
                  {step.outcome}
                </p>
              </motion.div>
            </div>

            {/* nodes */}
            {WEALTH_CYCLE.map((s, i) => {
              const angle = (i / WEALTH_CYCLE.length) * 2 * Math.PI - Math.PI / 2
              const radius = 50 // percent of half-width
              const x = 50 + radius * Math.cos(angle)
              const y = 50 + radius * Math.sin(angle)
              const isActive = i === active

              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Step ${s.step}: ${s.title}`}
                  aria-current={isActive}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <motion.span
                    animate={{ scale: isActive ? 1.12 : 1 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className={cn(
                      'flex flex-col items-center gap-2.5 rounded-3xl px-5 py-4 transition-colors duration-400',
                      isActive
                        ? 'border border-gold-500/40 bg-gold-500/15 backdrop-blur-md'
                        : 'border border-white/10 bg-navy-900/70 backdrop-blur-md hover:border-white/25',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-11 place-items-center rounded-xl transition-colors duration-400',
                        isActive ? 'bg-gold-500 text-white' : 'bg-white/10 text-gold-300',
                      )}
                    >
                      <Icon name={s.icon} className="size-5" strokeWidth={2} />
                    </span>
                    <span
                      className={cn(
                        'text-[0.8125rem] font-bold whitespace-nowrap transition-colors',
                        isActive ? 'text-white' : 'text-white/55',
                      )}
                    >
                      {s.step}. {s.title}
                    </span>
                  </motion.span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ---------- mobile / tablet timeline ---------- */}
        <motion.ol
          {...revealProps}
          variants={stagger(0.08)}
          className="relative mt-14 space-y-4 lg:hidden"
        >
          <span
            aria-hidden
            className="absolute top-4 bottom-4 left-[1.65rem] w-px bg-gradient-to-b from-gold-500/60 via-white/15 to-transparent"
          />
          {WEALTH_CYCLE.map((s) => (
            <motion.li
              key={s.step}
              variants={fadeUp}
              className="relative flex gap-5 rounded-3xl border border-white/10 bg-navy-900/60 p-5 backdrop-blur-sm sm:p-6"
            >
              <span className="relative z-10 grid size-13 shrink-0 place-items-center rounded-2xl bg-gold-500 text-white">
                <Icon name={s.icon} className="size-6" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-gold-400 uppercase">
                  Step {s.step}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/60">{s.action}</p>
                <p className="mt-3 text-[0.875rem] font-semibold text-gold-300">{s.outcome}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>

        <motion.div
          {...revealProps}
          variants={fadeUp}
          className="mt-14 flex flex-col items-center gap-5 text-center"
        >
          <p className="max-w-2xl text-[0.9375rem] leading-relaxed text-white/60">
            A client who starts with RWF 8 million in savings can realistically own three
            properties by Year 3. We publish the full arithmetic — nothing hidden.
          </p>
          <Button
            to="/wealth-cycle"
            variant="gold"
            size="lg"
            trailing={
              <ArrowRight
                className="size-5 transition-transform duration-300 group-hover/btn:translate-x-1"
                strokeWidth={2.3}
              />
            }
          >
            See the full model
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
