import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Quote, Star } from 'lucide-react'
import { useBlock, useQuery } from '@/lib/queries'
import type { ApiTestimonial } from '@/types/api'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { EASE, fadeUp, revealProps } from '@/lib/motion'
import { cn } from '@/lib/utils'

export function Testimonials() {
  const block = useBlock('home', 'testimonials', {
    eyebrow: "Client stories",
    title: "The proof is not our brochure.",
    accent: "It is their portfolio.",
  })
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const { data } = useQuery<ApiTestimonial[]>('/public/testimonials')
  const items = data ?? []
  const active = items[index % Math.max(items.length, 1)]

  const go = (delta: number) => {
    setDirection(delta)
    setIndex((i) => (i + delta + items.length) % items.length)
  }

  if (!active) return null

  return (
    <section className="relative overflow-hidden bg-navy-900 py-20 text-white lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 size-[32rem] rounded-full bg-gold-500/10 blur-[130px]"
      />

      <div className="container-page relative">
        <SectionHeading
          tone="light"
          eyebrow={block.eyebrow}
          title={block.title}
          accent={block.accent}
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* ---- quote ---- */}
          <div className="lg:col-span-7">
            <Quote className="size-12 text-gold-500/40" strokeWidth={1.5} />

            <div className="relative mt-6 min-h-[19rem] sm:min-h-[15rem]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.blockquote
                  key={active.id}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -40 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="absolute inset-0"
                >
                  <p className="font-display text-2xl leading-[1.45] font-medium text-white sm:text-[1.75rem]">
                    "{active.quote}"
                  </p>

                  <footer className="mt-8 flex flex-wrap items-center gap-5">
                    <img
                      src={active.photo_url ?? undefined}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="size-14 shrink-0 rounded-full object-cover ring-2 ring-gold-500/40"
                    />
                    <div>
                      <p className="font-semibold text-white">{active.author_name}</p>
                      <p className="text-[0.875rem] text-white/50">
                        {active.author_role} · {active.location}
                      </p>
                    </div>
                    <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-3.5 py-1.5 text-[0.75rem] font-semibold text-gold-200">
                      {active.milestone}
                    </span>
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>

            {/* controls */}
            <div className="mt-8 flex items-center gap-6 border-t border-white/10 pt-7">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous story"
                  className="grid size-12 place-items-center rounded-full border border-white/20 text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500 hover:bg-gold-500"
                >
                  <ArrowLeft className="size-5" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next story"
                  className="grid size-12 place-items-center rounded-full border border-white/20 text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500 hover:bg-gold-500"
                >
                  <ArrowRight className="size-5" strokeWidth={2.2} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {items.map((t, i) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setDirection(i > index ? 1 : -1)
                      setIndex(i)
                    }}
                    aria-label={`Story ${i + 1}`}
                    aria-current={i === index}
                    className="py-3"
                  >
                    <span
                      className={cn(
                        'block h-0.5 rounded-full transition-all duration-500',
                        i === index ? 'w-10 bg-gold-500' : 'w-4 bg-white/25 hover:bg-white/50',
                      )}
                    />
                  </button>
                ))}
              </div>

              <p className="ml-auto text-[0.8125rem] text-white/40 tabular-nums">
                {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </p>
            </div>
          </div>

          {/* ---- rating panel ---- */}
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="lg:col-span-5 lg:pl-8"
          >
            <div className="rounded-4xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-5 fill-gold-400 text-gold-400" strokeWidth={0} />
                ))}
                <span className="ml-2 font-display text-xl font-semibold text-white">4.9</span>
              </div>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/60">
                Average client rating across verified testimonials and Google Business reviews.
                We ask every client for one — and we publish the ones we get.
              </p>

              <dl className="mt-8 space-y-6 border-t border-white/10 pt-8">
                {[
                  { value: '10+', label: 'Deals closed in year one' },
                  { value: '3–5', label: 'Renovation projects completed' },
                  { value: '15+', label: 'Rental units under management' },
                  { value: '100%', label: 'Titles verified before transacting' },
                ].map((item) => (
                  <div key={item.label} className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.9375rem] text-white/55">{item.label}</dt>
                    <dd className="font-display text-xl font-semibold text-gold-400">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
