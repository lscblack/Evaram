import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { TRUST_POINTS } from '@/data/site'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { fadeUp, revealProps, stagger } from '@/lib/motion'

/** The seven gaps, from the business plan's competitor analysis. */
const GAPS = [
  {
    gap: 'After the sale',
    them: 'Sell once, then disappear',
    us: 'Stay through buy → build → earn → sell → reinvest',
  },
  {
    gap: 'Diaspora clients',
    them: 'Phone calls and WhatsApp, no documentation',
    us: 'Video updates, digital contracts, verified titles, monthly reports',
  },
  {
    gap: 'Marketing a property',
    them: 'Blurry phone photos in WhatsApp groups',
    us: 'Drone video, professional photography, mapped online listings',
  },
  {
    gap: 'Realty and construction',
    them: 'Agents and builders are separate businesses',
    us: 'One company that brokers and builds — the full value chain',
  },
  {
    gap: 'Documentation',
    them: 'Verbal deals, no receipts, title disputes',
    us: 'Digital contracts, cost tracking, RLA verification workflow',
  },
  {
    gap: 'Following up a lead',
    them: 'Leads lost, no follow-up system',
    us: 'Every contact tracked; response within two hours',
  },
  {
    gap: 'Educating clients',
    them: 'Almost no agent publishes anything useful',
    us: 'Weekly land tours, market data, renovation reveals, testimonials',
  },
]

export function WhyEvaramu() {
  return (
    <section className="bg-surface py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="Why Evaramu"
          title="There are 204 registered agencies in Rwanda."
          accent="Almost none of them do this."
          description="99% are single-owner informal operations with no systems, no branding and no technology. The few large formal players ignore the middle market entirely. Here is the difference, line by line."
        />

        {/* ---- trust points ---- */}
        <motion.div
          {...revealProps}
          variants={stagger(0.09)}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TRUST_POINTS.map((point) => (
            <motion.div
              key={point.title}
              variants={fadeUp}
              className="group rounded-3xl border border-line bg-canvas p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:bg-navy-900"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-gold-500 text-white">
                <Icon name={point.icon} className="size-[1.35rem]" strokeWidth={2} />
              </span>
              <h3 className="mt-5 font-display text-xl leading-snug font-bold text-ink transition-colors duration-500 group-hover:text-white">
                {point.title}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft transition-colors duration-500 group-hover:text-white/65">
                {point.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* ---- comparison table ---- */}
        <motion.div
          {...revealProps}
          variants={fadeUp}
          className="mt-14 overflow-hidden rounded-3xl border border-line shadow-soft"
        >
          {/* header */}
          <div className="hidden grid-cols-12 gap-6 bg-navy-950 px-8 py-5 text-white md:grid">
            <p className="col-span-3 text-[0.6875rem] font-bold tracking-[0.2em] text-white/50 uppercase">
              The gap
            </p>
            <p className="col-span-4 text-[0.6875rem] font-bold tracking-[0.2em] text-white/50 uppercase">
              What competitors do
            </p>
            <p className="col-span-5 text-[0.6875rem] font-bold tracking-[0.2em] text-gold-400 uppercase">
              What Evaramu does
            </p>
          </div>

          <div className="divide-y divide-line bg-surface">
            {GAPS.map((row, i) => (
              <motion.div
                key={row.gap}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="grid gap-4 px-6 py-6 transition-colors hover:bg-canvas md:grid-cols-12 md:gap-6 md:px-8"
              >
                <p className="font-display text-[1.0625rem] font-semibold text-ink md:col-span-3 md:text-base">
                  {row.gap}
                </p>

                <div className="flex items-start gap-3 md:col-span-4">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-red-50">
                    <X className="size-3 text-red-500" strokeWidth={3} />
                  </span>
                  <p className="text-[0.9375rem] leading-snug text-ink-muted">{row.them}</p>
                </div>

                <div className="flex items-start gap-3 md:col-span-5">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-100">
                    <Check className="size-3 text-gold-700" strokeWidth={3.5} />
                  </span>
                  <p className="text-[0.9375rem] leading-snug font-medium text-ink">
                    {row.us}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
