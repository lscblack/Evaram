import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Home } from 'lucide-react'
import { Seo } from '@/components/Seo'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { fadeUp, stagger } from '@/lib/motion'
import { useBlockItems } from '@/lib/queries'
import { Icon } from '@/components/ui/Icon'

/** Fallback for `not-found` → `suggestions` — the shipped copy. */
const SUGGESTIONS_FALLBACK = [
  {
    to: '/properties',
    icon: 'Search',
    title: 'Browse properties',
    description: 'Verified land, houses and commercial space across Rwanda',
  },
  {
    to: '/wealth-cycle',
    icon: 'RefreshCw',
    title: 'The Wealth Cycle',
    description: 'How one property becomes four or five within three years',
  },
  {
    to: '/construction',
    icon: 'HardHat',
    title: 'Construction packages',
    description: 'Standard, Premium and Luxury finishes with fixed pricing',
  },
  {
    to: '/consultation',
    icon: 'Compass',
    title: 'Book a consultation',
    description: 'A free 30-minute call to work out what is achievable',
  },
]

export default function NotFoundPage() {
  const suggestions = useBlockItems(
    'not-found',
    'suggestions',
    SUGGESTIONS_FALLBACK,
  )
  return (
    <>
      <Seo
        title="Page not found"
        description="The page you were looking for has moved or no longer exists. Browse our verified property listings or book a free consultation instead."
        path="/404"
        noIndex
      />

      <section className="relative isolate overflow-hidden bg-navy-950 text-white">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-gold-500/10 blur-[130px]"
        />

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger(0.1)}
          className="container-page relative flex min-h-[70dvh] flex-col items-center justify-center py-20 text-center lg:py-28"
        >
          <motion.p
            variants={fadeUp}
            className="font-display text-[5rem] leading-none font-semibold text-white/10 select-none sm:text-[7rem]"
          >
            404
          </motion.p>

          <motion.div variants={fadeUp} className="-mt-6 sm:-mt-10">
            <Eyebrow tone="light" align="center">
              Page not found
            </Eyebrow>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 max-w-2xl text-[1.875rem] leading-[1.1] font-semibold sm:text-[2.375rem]"
          >
            This plot isn't
            <span className="text-gradient-gold"> on our register.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-[0.9375rem] leading-relaxed text-white/60"
          >
            The page you were looking for has moved, or the listing has since been sold. Everything
            below is very much still available.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap justify-center gap-4">
            <Button
              to="/"
              variant="gold"
              size="lg"
              leading={<Home className="size-[1.05rem]" strokeWidth={2.2} />}
            >
              Back to home
            </Button>
            <Button
              to="/properties"
              variant="outline-light"
              size="lg"
              trailing={
                <ArrowRight
                  className="size-5 transition-transform duration-300 group-hover/btn:translate-x-1"
                  strokeWidth={2.3}
                />
              }
            >
              Browse properties
            </Button>
          </motion.div>

          <motion.ul
            variants={stagger(0.08)}
            className="mt-16 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-2"
          >
            {suggestions.map((item) => {
                            return (
                <motion.li key={item.to} variants={fadeUp}>
                  <Link
                    to={item.to}
                    className="group flex items-start gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 transition-all duration-400 hover:-translate-y-1 hover:border-gold-500/40 hover:bg-white/8"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/8 text-gold-400 transition-colors duration-400 group-hover:bg-gold-500 group-hover:text-white">
                      <Icon name={item.icon} className="size-5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[1.0625rem] font-semibold text-white">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[0.875rem] leading-snug text-white/55">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </motion.ul>
        </motion.div>
      </section>
    </>
  )
}
