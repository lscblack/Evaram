import { motion } from 'framer-motion'
import { ArrowRight, Check, Quote, X } from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { FaqSection } from '@/components/sections/FaqSection'

import { useBlock, useLocalizedQuery } from '@/lib/queries'
import type { ApiCycleStep, ApiFaq, ApiTestimonial } from '@/types/api'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { useT } from '@/lib/i18n'


export default function WealthCyclePage() {
  const t = useT()
  const seo = useBlock('wealth-cycle', 'seo', {
    title: "The Evaramu Wealth Cycle — From One Property to a Portfolio",
    body: "Buy, build, earn, sell, reinvest, repeat. The full six-step model Evaramu uses to grow a client from one property to four or five within three years — with the complete arithmetic published.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const heroBlock = useBlock('wealth-cycle', 'hero', {
    eyebrow: "Our signature model",
    title: "Most agencies close a sale and disappear.",
    accent: "We stay.",
    body: "The Wealth Cycle is the reason clients come back to us for their second, third and fourth property. We find it, help you buy it, build on it, tenant it, tell you when to sell — then put the proceeds to work again.",
  })
  const modelBlock = useBlock('wealth-cycle', 'model', {
    eyebrow: "The model",
    title: "Six steps, and we are",
    accent: "beside you for all of them.",
    body: "Each step compounds into the next. Skip one and the cycle still works — it just works more slowly.",
  })
  const { data: faqData } = useLocalizedQuery<ApiFaq>('/public/faqs?page=wealth-cycle')
  const faqs = faqData ?? []

  const { data: stepData } = useLocalizedQuery<ApiCycleStep>('/public/wealth-cycle')
  const steps = stepData ?? []
  const { data: storyData } = useLocalizedQuery<ApiTestimonial>('/public/testimonials')
  const cycleStory = (storyData ?? [])[0]

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/wealth-cycle"
        keywords={seoKeywords}
        jsonLd={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Wealth Cycle', path: '/wealth-cycle' },
          ]),
        ]}
      />

      <PageHero
        eyebrow={heroBlock.eyebrow}
        title={heroBlock.title}
        accent={heroBlock.accent}
        description="The Wealth Cycle is the reason clients come back to us for their second, third and fourth property. We find it, help you buy it, build on it, tenant it, tell you when to sell — then put the proceeds to work again."
        crumbs={[{ label: t('nav.wealthCycle') }]}
        image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: '1 → 4–5', label: 'Properties within 3 years' },
          { value: '20–50%', label: 'Value added by the build step' },
          { value: '10%', label: 'Our management fee — only on rent collected' },
        ]}
      />

      {/* ---------------- the six steps ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={modelBlock.eyebrow}
            title={modelBlock.title}
            accent={modelBlock.accent}
            description="Each step compounds into the next. Skip one and the cycle still works — it just works more slowly."
          />

          <motion.ol
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {steps.map((step) => (
              <motion.li
                key={step.step}
                variants={fadeUp}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
              >
                <span
                  aria-hidden
                  className="absolute -top-6 -right-3 font-display text-[7rem] leading-none font-bold text-line transition-colors duration-500 group-hover:text-gold-50"
                >
                  {step.step}
                </span>

                <span className="relative grid size-13 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                  <Icon name={step.icon ?? "RefreshCw"} className="size-6" strokeWidth={1.9} />
                </span>

                <h3 className="relative mt-6 font-display text-xl font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="relative mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {step.action}
                </p>

                <p className="relative mt-auto flex items-start gap-2.5 border-t border-line pt-5 text-[0.875rem] font-semibold text-gold-700">
                  <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} />
                  {step.outcome}
                </p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>


      {/* ---------------- why it wins ---------------- */}
      <section className="bg-canvas-alt py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-5">
              <motion.div variants={fadeUp}>
                <Eyebrow>Why the model wins</Eyebrow>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-ink sm:text-[2.125rem]"
              >
                Clients don't leave because we are
                <span className="text-gradient-gold"> embedded in their future.</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft"
              >
                Not because of a contract. Because after two years of doing exactly what we said we
                would do, we are the people they call.
              </motion.p>

              <motion.ul variants={stagger(0.07)} className="mt-9 space-y-4">
                {[
                  'Each completed cycle generates a testimonial, a referral and a case study — the best marketing there is.',
                  'Recurring management fees create stable monthly revenue independent of new deals.',
                  'Diaspora clients especially value entrusting their wealth to one reliable Rwandan partner.',
                  'As your portfolio grows, our commissions, fees and build contracts scale with it — our incentives stay aligned with yours.',
                ].map((item) => (
                  <motion.li key={item} variants={fadeUp} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500">
                      <Check className="size-3 text-white" strokeWidth={3.5} />
                    </span>
                    <span className="text-[0.9375rem] leading-relaxed text-ink-soft">{item}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            {/* comparison */}
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-7">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-3xl border border-line bg-surface p-7">
                  <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-ink-muted uppercase">
                    A typical agency
                  </p>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ink">
                    One transaction
                  </h3>
                  <ul className="mt-6 space-y-3.5">
                    {[
                      'Finds you a property',
                      'Takes the commission',
                      'Stops answering the phone',
                      'You are alone with the build',
                      'You guess when to sell',
                      'You start from scratch next time',
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-[0.9375rem] text-ink-muted"
                      >
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-red-50">
                          <X className="size-3 text-red-500" strokeWidth={3} />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative overflow-hidden rounded-3xl bg-navy-950 p-7 text-white">
                  <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                  <div className="relative">
                    <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-gold-400 uppercase">
                      Evaramu
                    </p>
                    <h3 className="mt-3 font-display text-lg font-semibold">A compounding cycle</h3>
                    <ul className="mt-6 space-y-3.5">
                      {[
                        'Sources and verifies the parcel',
                        'Builds on it to raise the value',
                        'Places tenants and manages it',
                        'Sends you a monthly statement',
                        'Advises when to sell, with data',
                        'Reinvests into two or three more',
                      ].map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2.5 text-[0.9375rem] text-white/80"
                        >
                          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500">
                            <Check className="size-3 text-white" strokeWidth={3.5} />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* testimonial */}
              <div className="mt-5 rounded-3xl border border-gold-200 bg-gold-50 p-7">
                <Quote className="size-8 text-gold-500/50" strokeWidth={1.6} />
                <blockquote className="mt-4 font-display text-xl leading-relaxed font-medium text-ink">
                  "{cycleStory?.quote}"
                </blockquote>
                <footer className="mt-6 flex items-center gap-4">
                  <img
                    src={cycleStory?.photo_url ?? undefined}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="size-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-ink">{cycleStory?.author_name}</p>
                    <p className="text-[0.875rem] text-ink-soft">
                      {cycleStory?.author_role} · {cycleStory?.milestone}
                    </p>
                  </div>
                </footer>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- entry CTA ---------------- */}
      <section className="bg-surface py-16 lg:py-20">
        <div className="container-page">
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="relative overflow-hidden rounded-4xl bg-navy-950 px-8 py-14 text-center text-white sm:px-14 lg:py-20"
          >
            <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
            <div
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/12 blur-[120px]"
            />
            <div className="relative mx-auto max-w-2xl">
              <Eyebrow tone="light" align="center">
                Step one
              </Eyebrow>
              <h2 className="mt-5 text-[2rem] leading-[1.1] font-bold sm:text-[2.125rem]">
                The cycle starts with
                <span className="text-gradient-gold"> one conversation.</span>
              </h2>
              <p className="mt-5 text-[0.9375rem] leading-relaxed text-white/60">
                A free 60-minute planning session. We map your capital against a three-year plan:
                what to buy first, what to build on it, when to sell, and what to reinvest into.
              </p>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
                <Button
                  to="/consultation?type=wealth-plan"
                  variant="gold"
                  size="lg"
                  trailing={
                    <ArrowRight
                      className="size-5 transition-transform duration-300 group-hover/btn:translate-x-1"
                      strokeWidth={2.3}
                    />
                  }
                >
                  Book a planning session
                </Button>
                <Button to="/properties" variant="outline-light" size="lg">
                  See what's available now
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        eyebrow="Wealth Cycle questions"
        title="The things people ask"
        accent="before they start."
        description="Honest answers about how the model works, what it costs and where the risks actually sit."
      />
    </>
  )
}
