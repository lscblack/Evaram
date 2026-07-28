import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Quote, Sparkles, TrendingUp, X } from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { FaqSection } from '@/components/sections/FaqSection'
import { CYCLE_TIMELINE, WEALTH_CYCLE } from '@/data/services'
import { TESTIMONIALS } from '@/data/content'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn, formatCompactCurrency, formatCurrency } from '@/lib/utils'

const CYCLE_FAQS = [
  {
    question: 'Do I have to commit to all six steps?',
    answer:
      'No. Plenty of clients only ever buy, or only ever build. The cycle is what we recommend if your goal is a portfolio rather than a single asset — but every step is a separate decision that you make, with our advice, when you get to it.',
  },
  {
    question: 'What if the market turns and my property loses value?',
    answer:
      'Then we advise you to hold and keep earning rent rather than sell into a weak market. That is precisely why step three exists: a tenanted property generates income while you wait, so you are never forced to sell at a bad moment.',
  },
  {
    question: 'How much capital do I need to start?',
    answer:
      'The worked example on this page starts at RWF 8 million, which buys a serviceable plot in a growth corridor. Below roughly RWF 5 million the numbers stop working, because the entry costs eat the margin. We will tell you honestly if you are not there yet.',
  },
  {
    question: 'Who decides when to sell?',
    answer:
      'You do — always. We bring the market data, the comparable sales and a recommendation with our reasoning written down. We have advised clients to wait eight months against their instinct, and it earned them millions more. But it remains your asset and your call.',
  },
  {
    question: 'What does Evaramu earn from the cycle?',
    answer:
      'A sales commission when we broker a purchase or sale, a build margin when our construction division does the work, and 10% of collected rent while we manage the property. All three only pay us when they pay you — which is exactly the alignment we want.',
  },
]

export default function WealthCyclePage() {
  const [capital, setCapital] = useState(8_000_000)
  const [years, setYears] = useState(3)

  /**
   * Indicative model, deliberately conservative and mirroring the business
   * plan's worked example: the build roughly doubles the asset, rent runs at
   * ~9% of value, and proceeds are recycled once per ~18 months.
   */
  const projection = useMemo(() => {
    const rows: { year: number; portfolio: number; properties: number; rentPerYear: number }[] = []
    let portfolio = capital * 1.25 // first plot, bought below market
    let properties = 1

    for (let year = 1; year <= years; year++) {
      // build / improve uplift in the first half of each cycle
      portfolio *= 1.35
      // corridor appreciation
      portfolio *= 1.16
      // reinvestment splits into more assets every ~18 months
      if (year % 2 === 0) properties += 1
      if (year >= 3 && year % 3 === 0) properties += 1

      rows.push({
        year,
        portfolio: Math.round(portfolio),
        properties,
        rentPerYear: Math.round(portfolio * 0.09),
      })
    }
    return rows
  }, [capital, years])

  const final = projection[projection.length - 1]
  const maxPortfolio = Math.max(...projection.map((r) => r.portfolio))

  const cycleStory = TESTIMONIALS[0]

  return (
    <>
      <Seo
        title="The Evaramu Wealth Cycle — From One Property to a Portfolio"
        description="Buy, build, earn, sell, reinvest, repeat. The full six-step model Evaramu uses to grow a client from one property to four or five within three years — with the complete arithmetic published."
        path="/wealth-cycle"
        keywords={[
          'property wealth Rwanda',
          'build a property portfolio Kigali',
          'real estate investment Rwanda',
          'rental income Kigali',
          'Evaramu Wealth Cycle',
        ]}
        jsonLd={[
          faqJsonLd(CYCLE_FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Wealth Cycle', path: '/wealth-cycle' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Our signature model"
        title="Most agencies close a sale and disappear."
        accent="We stay."
        description="The Wealth Cycle is the reason clients come back to us for their second, third and fourth property. We find it, help you buy it, build on it, tenant it, tell you when to sell — then put the proceeds to work again."
        crumbs={[{ label: 'Wealth Cycle' }]}
        image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: '1 → 4–5', label: 'Properties within 3 years' },
          { value: '20–50%', label: 'Value added by the build step' },
          { value: '8–12%', label: 'Annual yield once tenanted' },
          { value: '10%', label: 'Our management fee — only on rent collected' },
        ]}
      />

      {/* ---------------- the six steps ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="The model"
            title="Six steps, and we are"
            accent="beside you for all of them."
            description="Each step compounds into the next. Skip one and the cycle still works — it just works more slowly."
          />

          <motion.ol
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {WEALTH_CYCLE.map((step) => (
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
                  <Icon name={step.icon} className="size-6" strokeWidth={1.9} />
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

      {/* ---------------- worked example ---------------- */}
      <section className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />

        <div className="container-page relative">
          <SectionHeading
            tone="light"
            eyebrow="A real client journey"
            title="RWF 8 million in savings."
            accent="Three properties by Year 3."
            description="This is the worked example from our business plan, published in full. Every figure is one we have actually seen, not a projection we invented for a brochure."
          />

          <motion.ol {...revealProps} variants={stagger(0.08)} className="relative mt-14">
            <span
              aria-hidden
              className="absolute top-4 bottom-4 left-6 hidden w-px bg-gradient-to-b from-gold-500 via-white/20 to-transparent lg:block"
            />

            {CYCLE_TIMELINE.map((row, i) => (
              <motion.li
                key={row.year}
                variants={fadeUp}
                className="relative mb-4 grid gap-5 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm last:mb-0 sm:p-7 lg:grid-cols-12 lg:items-start lg:gap-8 lg:pl-20"
              >
                <span
                  aria-hidden
                  className="absolute top-8 left-6 z-10 hidden size-3 -translate-x-1/2 rounded-full bg-gold-500 ring-4 ring-navy-950 lg:block"
                />

                <div className="lg:col-span-2">
                  <p className="font-display text-xl font-semibold text-gold-400">{row.year}</p>
                  <p className="mt-1.5 text-[0.8125rem] text-white/40">Step {i + 1}</p>
                </div>

                <div className="lg:col-span-4">
                  <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-white/35 uppercase">
                    Situation
                  </p>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/70">
                    {row.situation}
                  </p>
                </div>

                <div className="lg:col-span-3">
                  <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-white/35 uppercase">
                    What we do
                  </p>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/70">
                    {row.action}
                  </p>
                </div>

                <div className="lg:col-span-3">
                  <p className="text-[0.6875rem] font-bold tracking-[0.16em] text-gold-400 uppercase">
                    Outcome
                  </p>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed font-medium text-white">
                    {row.outcome}
                  </p>
                  <p className="mt-3 font-display text-lg font-semibold text-gold-400">
                    {formatCompactCurrency(row.portfolioValue)}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* ---------------- interactive projector ---------------- */}
      <section className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Run your own numbers"
            title="What could your capital"
            accent="become?"
            description="Move the sliders. This is an indicative model built on the same assumptions we use in a planning session — a build uplift of roughly 35%, corridor appreciation of 16% a year, and rent at around 9% of value."
          />

          <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* controls */}
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-4">
              <div className="rounded-3xl border border-line bg-canvas p-7">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="size-5 text-gold-600" strokeWidth={2.2} />
                  <h3 className="font-display text-lg font-semibold text-ink">Your inputs</h3>
                </div>

                <div className="mt-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor="wc-capital"
                      className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                    >
                      Starting capital
                    </label>
                    <span className="font-display text-lg font-semibold text-ink">
                      {formatCompactCurrency(capital)}
                    </span>
                  </div>
                  <input
                    id="wc-capital"
                    type="range"
                    min={5_000_000}
                    max={150_000_000}
                    step={1_000_000}
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-navy-100 accent-gold-500"
                  />
                  <div className="mt-2 flex justify-between text-[0.75rem] text-ink-muted">
                    <span>RWF 5M</span>
                    <span>RWF 150M</span>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor="wc-years"
                      className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                    >
                      Time horizon
                    </label>
                    <span className="font-display text-lg font-semibold text-ink">
                      {years} {years === 1 ? 'year' : 'years'}
                    </span>
                  </div>
                  <input
                    id="wc-years"
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-navy-100 accent-gold-500"
                  />
                  <div className="mt-2 flex justify-between text-[0.75rem] text-ink-muted">
                    <span>1 year</span>
                    <span>8 years</span>
                  </div>
                </div>

                <dl className="mt-8 space-y-4 border-t border-line-strong pt-7">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.9375rem] text-ink-soft">Portfolio value</dt>
                    <dd className="font-display text-xl font-semibold text-ink">
                      {formatCompactCurrency(final.portfolio)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.9375rem] text-ink-soft">Properties owned</dt>
                    <dd className="font-display text-xl font-semibold text-ink">
                      {final.properties}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.9375rem] text-ink-soft">Rental income / year</dt>
                    <dd className="font-display text-xl font-semibold text-gold-600">
                      {formatCompactCurrency(final.rentPerYear)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-6 text-[0.75rem] leading-relaxed text-ink-muted">
                  Indicative only. Actual returns depend on the specific parcel, the build
                  specification, tenant demand and the market at the time you sell. We will model
                  your real numbers in a planning session.
                </p>

                <Button to="/consultation?type=wealth-plan" variant="gold" className="mt-6 w-full">
                  Model my real numbers
                </Button>
              </div>
            </motion.div>

            {/* chart */}
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-8">
              <div className="flex flex-col rounded-3xl border border-line bg-canvas p-7">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Projected portfolio growth
                  </h3>
                  <span className="flex items-center gap-1.5 rounded-full bg-gold-50 px-3 py-1.5 text-[0.8125rem] font-bold text-gold-700">
                    <TrendingUp className="size-3.5" strokeWidth={2.6} />
                    {Math.round((final.portfolio / capital - 1) * 100)}% over {years}{' '}
                    {years === 1 ? 'year' : 'years'}
                  </span>
                </div>

                {/* bar chart */}
                <div className="mt-10 flex h-72 items-end gap-2 sm:h-80 sm:gap-4">
                  {projection.map((row) => (
                    <div key={row.year} className="flex flex-1 flex-col items-center gap-3">
                      <span className="font-display text-[0.8125rem] font-bold text-ink sm:text-sm">
                        {formatCompactCurrency(row.portfolio).replace('RWF ', '')}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(row.portfolio / maxPortfolio) * 100}%` }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          'w-full min-h-2 rounded-t-xl',
                          row.year === years
                            ? 'bg-gradient-to-t from-gold-600 to-gold-400'
                            : 'bg-gradient-to-t from-navy-800 to-navy-500',
                        )}
                      />
                      <span className="text-[0.75rem] font-semibold text-ink-muted">
                        Y{row.year}
                      </span>
                      <span className="hidden text-[0.6875rem] text-ink-muted sm:block">
                        {row.properties} {row.properties === 1 ? 'property' : 'properties'}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="mt-8 border-t border-line-strong pt-6 text-[0.875rem] leading-relaxed text-ink-muted">
                  Starting from{' '}
                  <span className="font-semibold text-ink">{formatCurrency(capital)}</span>,
                  this model reaches{' '}
                  <span className="font-semibold text-ink">
                    {formatCurrency(final.portfolio)}
                  </span>{' '}
                  across {final.properties}{' '}
                  {final.properties === 1 ? 'property' : 'properties'}, generating roughly{' '}
                  <span className="font-semibold text-ink">
                    {formatCurrency(Math.round(final.rentPerYear / 12))}
                  </span>{' '}
                  a month in rent.
                </p>
              </div>
            </motion.div>
          </div>
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
                  "{cycleStory.quote}"
                </blockquote>
                <footer className="mt-6 flex items-center gap-4">
                  <img
                    src={cycleStory.photo}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="size-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-ink">{cycleStory.name}</p>
                    <p className="text-[0.875rem] text-ink-soft">
                      {cycleStory.role} · {cycleStory.milestone}
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
        faqs={CYCLE_FAQS}
        eyebrow="Wealth Cycle questions"
        title="The things people ask"
        accent="before they start."
        description="Honest answers about how the model works, what it costs and where the risks actually sit."
      />
    </>
  )
}
