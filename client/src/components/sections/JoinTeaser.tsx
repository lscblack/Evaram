import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'
import { Counter } from '@/components/ui/Counter'
import { fadeLeft, fadeUp, revealProps, stagger } from '@/lib/motion'
import { useBlockItems } from '@/lib/queries'
import { Icon } from '@/components/ui/Icon'

/** Fallback for `home` → `join_benefits` — the shipped copy. */
const BENEFITS_FALLBACK = [
  {
    icon: 'Banknote',
    title: '5–10% commission per deal',
    description: 'Paid on completion, agreed in writing before you start working a lead.',
  },
  {
    icon: 'BadgeCheck',
    title: 'A brand that opens doors',
    description:
      'Walk in as Evaramu, not as an unknown broker. Documented, registered, and trusted.',
  },
  {
    icon: 'GraduationCap',
    title: 'Training and a real CRM',
    description:
      'Title verification, negotiation and follow-up — plus a system so no lead goes cold.',
  },
  {
    icon: 'Users',
    title: 'Leads from our marketing',
    description:
      'Our content engine generates enquiries daily. Qualified leads get routed to agents.',
  },
]

export function JoinTeaser() {
  const benefits = useBlockItems(
    'home',
    'join_benefits',
    BENEFITS_FALLBACK,
  )
  return (
    <section className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 size-[30rem] rounded-full bg-gold-500/10 blur-[120px]"
      />

      <div className="container-page relative">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-6">
            <motion.div variants={fadeUp}>
              <Eyebrow tone="light">Join the agency</Eyebrow>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-white sm:text-[2.125rem] lg:text-[2.5rem]"
            >
              Brokers, commission agents
              <br />
              <span className="text-gradient-gold">and builders — join us.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-white/65"
            >
              There are more than 200 informal brokers in Rwanda with real local knowledge and no
              brand behind them. If that is you, bring your network to a company with systems,
              documentation and a marketing engine — and get paid properly for it.
            </motion.p>

            <motion.ul variants={stagger(0.08)} className="mt-10 grid gap-6 sm:grid-cols-2">
              {benefits.map((benefit) => {
                                return (
                  <motion.li key={benefit.title} variants={fadeUp} className="group flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/8 text-gold-400 transition-colors duration-400 group-hover:bg-gold-500 group-hover:text-white">
                      <Icon name={benefit.icon} className="size-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-snug font-bold text-white">
                        {benefit.title}
                      </h3>
                      <p className="mt-1.5 text-[0.9375rem] leading-snug text-white/55">
                        {benefit.description}
                      </p>
                    </div>
                  </motion.li>
                )
              })}
            </motion.ul>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
              <Button
                to="/join"
                variant="gold"
                size="lg"
                trailing={
                  <ArrowRight
                    className="size-5 transition-transform duration-300 group-hover/btn:translate-x-1"
                    strokeWidth={2.3}
                  />
                }
              >
                Apply to join
              </Button>
              <Button to="/about" variant="outline-light" size="lg">
                Meet the team
              </Button>
            </motion.div>
          </motion.div>

          {/* ---- visual ---- */}
          <motion.div {...revealProps} variants={fadeLeft} className="lg:col-span-6 lg:pl-8">
            <div className="relative">
              <div className="overflow-hidden rounded-4xl">
                <img
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=80"
                  alt="Evaramu consultants meeting a client"
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/60 to-transparent" />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-4">
                {[
                  { value: 10, suffix: '%', label: 'Top commission rate' },
                  { value: 2, suffix: 'h', label: 'Lead response target' },
                  { value: 204, suffix: '', label: 'Agencies we outwork' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-sm"
                  >
                    <p className="font-display text-3xl leading-none font-bold text-gold-400">
                      <Counter value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="mt-2 text-[0.75rem] leading-snug text-white/50">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
