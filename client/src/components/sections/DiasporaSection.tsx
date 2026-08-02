import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Button } from '@/components/ui/Button'
import { EASE, fadeRight, fadeUp, revealProps, stagger } from '@/lib/motion'
import { useBlockItems } from '@/lib/queries'
import { Icon } from '@/components/ui/Icon'

/** Fallback for `home` → `diaspora_promises` — the shipped copy. */
const PROMISES_FALLBACK = [
  {
    icon: 'Video',
    title: 'You see the parcel before you pay',
    description:
      'A video walking the boundary with the UPI visible on screen — not a photo someone sent you.',
  },
  {
    icon: 'FileCheck2',
    title: 'Title verified before any deposit',
    description:
      'An NLA title search dated within 30 days, with the registered owner matched to the seller.',
  },
  {
    icon: 'Wallet',
    title: 'Company account, same-day receipt',
    description:
      'Funds go to a registered company account. Never to an individual mobile money number.',
  },
  {
    icon: 'Globe2',
    title: 'Monthly reporting, wherever you are',
    description:
      'Build diary, photos, rent collected and maintenance spend — the first of every month.',
  },
]

export function DiasporaSection() {
  const promises = useBlockItems(
    'home',
    'diaspora_promises',
    PROMISES_FALLBACK,
  )
  return (
    <section
      id="diaspora"
      className="relative overflow-hidden bg-surface py-16 lg:py-24"
    >
      <div className="container-page">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          {/* ---- imagery ---- */}
          <motion.div
            {...revealProps}
            variants={fadeRight}
            className="relative lg:col-span-5"
          >
            <div className="relative overflow-hidden rounded-4xl">
              <img
                src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80"
                alt="Aerial view from an aircraft window approaching Kigali"
                loading="lazy"
                className="aspect-4/5 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
            </div>

            {/* floating stat card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
              className="absolute -right-2 -bottom-6 w-64 rounded-3xl border border-line bg-surface p-6 shadow-lift sm:right-6 lg:-right-8"
            >
              <p className="font-display text-4xl leading-none font-bold text-ink">20%+</p>
              <p className="mt-2 text-[0.875rem] leading-snug text-ink-soft">
                of Evaramu's revenue comes from diaspora clients — the most underserved segment
                in Rwanda today.
              </p>
            </motion.div>

            <span
              aria-hidden
              className="absolute -top-6 -left-6 -z-10 size-40 rounded-full bg-gold-500/10 blur-3xl"
            />
          </motion.div>

          {/* ---- copy ---- */}
          <motion.div
            {...revealProps}
            variants={stagger(0.09)}
            className="lg:col-span-7 lg:pl-4"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>For the diaspora</Eyebrow>
            </motion.div>

            <motion.h2
              variants={fadeUp}
              className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-ink sm:text-[2.125rem] lg:text-[2.5rem]"
            >
              Invest at home
              <br />
              <span className="text-gradient-gold">without flying home.</span>
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="mt-5 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft"
            >
              You have heard the stories — deposits sent, brokers gone quiet, a plot that turned
              out to belong to someone else. We built our whole diaspora process around removing
              the distance that makes that possible.
            </motion.p>

            <motion.ul variants={stagger(0.08)} className="mt-10 grid gap-5 sm:grid-cols-2">
              {promises.map((promise) => {
                                return (
                  <motion.li
                    key={promise.title}
                    variants={fadeUp}
                    className="group flex gap-4"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-ink-soft transition-colors duration-400 group-hover:bg-gold-500 group-hover:text-white">
                      <Icon name={promise.icon} className="size-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg leading-snug font-bold text-ink">
                        {promise.title}
                      </h3>
                      <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-soft">
                        {promise.description}
                      </p>
                    </div>
                  </motion.li>
                )
              })}
            </motion.ul>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-4">
              <Button
                to="/consultation"
                variant="gold"
                size="lg"
                trailing={
                  <ArrowRight
                    className="size-5 transition-transform duration-300 group-hover/btn:translate-x-1"
                    strokeWidth={2.3}
                  />
                }
              >
                Book a diaspora briefing
              </Button>
              <Button to="/insights/buying-property-in-rwanda-from-abroad" variant="outline" size="lg">
                Read the checklist
              </Button>
            </motion.div>

            <motion.p variants={fadeUp} className="mt-6 text-[0.875rem] text-ink-muted">
              Briefings are scheduled across time zones — early mornings and evenings Kigali time
              for clients in Europe and North America.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
