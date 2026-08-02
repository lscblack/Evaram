import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import type { ApiFaq } from '@/types/api'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { EASE, fadeUp, revealProps, stagger } from '@/lib/motion'

export function FaqSection({
  faqs,
  eyebrow = 'Questions',
  title = 'Straight answers,',
  accent = 'before you ask.',
  description,
}: {
  faqs: ApiFaq[]
  eyebrow?: string
  title?: string
  accent?: string
  description?: string
}) {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="bg-surface py-16 lg:py-24">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              accent={accent}
              description={
                description ??
                'The things clients ask us most often, answered the way we would answer them on the phone.'
              }
            />

            <motion.div {...revealProps} variants={fadeUp} className="mt-9">
              <div className="rounded-3xl border border-line bg-canvas p-7">
                <p className="font-display text-lg font-semibold text-ink">
                  Still have a question?
                </p>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                  Book a free 30-minute call. No obligation, no pressure — we will tell you
                  honestly whether we can help.
                </p>
                <Button to="/consultation" variant="gold" className="mt-5 w-full sm:w-auto">
                  Book a free call
                </Button>
              </div>
            </motion.div>
          </div>

          <motion.dl
            {...revealProps}
            variants={stagger(0.06)}
            className="lg:col-span-7"
          >
            {faqs.map((faq, i) => {
              const isOpen = open === i
              return (
                <motion.div
                  key={faq.question}
                  variants={fadeUp}
                  className="border-b border-line first:border-t"
                >
                  <dt>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start justify-between gap-6 py-6 text-left transition-colors hover:text-gold-600"
                    >
                      <span className="font-display text-lg leading-snug font-bold text-ink sm:text-xl">
                        {faq.question}
                      </span>
                      <span
                        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-300 ${
                          isOpen ? 'bg-gold-500 text-white' : 'bg-accent-soft text-ink-soft'
                        }`}
                      >
                        {isOpen ? (
                          <Minus className="size-4" strokeWidth={2.6} />
                        ) : (
                          <Plus className="size-4" strokeWidth={2.6} />
                        )}
                      </span>
                    </button>
                  </dt>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.dd
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pr-14 pb-7 text-[0.9375rem] leading-relaxed text-ink-soft">
                          {faq.answer}
                        </p>
                      </motion.dd>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.dl>
        </div>
      </div>
    </section>
  )
}
