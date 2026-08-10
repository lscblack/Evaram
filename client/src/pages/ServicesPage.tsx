import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check, Video, Wallet } from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { FaqSection } from '@/components/sections/FaqSection'
import { DiasporaSection } from '@/components/sections/DiasporaSection'

import { useBlock, useBlockItems, useLocalizedQuery } from '@/lib/queries'
import type { ApiFaq, ApiServiceLine } from '@/types/api'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const DIVISION_STYLES: Record<string, string> = {
  Realty: 'bg-accent-soft text-ink-soft',
  Construction: 'bg-gold-50 text-gold-700',
  Group: 'bg-emerald-50 text-emerald-700',
}

/** Fallback for `services` → `management_includes` — the shipped copy. */
const MANAGEMENT_INCLUDES_FALLBACK: { body: string; title: string }[] = [
  {
    title: 'Tenant sourcing and screening',
    body: 'We market the unit, vet applicants and check they can actually afford it. Corporate and NGO tenants are targeted deliberately — they sign longer and pay on time.',
  },
  {
    title: 'Rent collection and arrears',
    body: 'Collected on schedule and remitted to you. If a tenant falls behind, we chase it — that is what the fee is for.',
  },
  {
    title: 'Maintenance coordination',
    body: 'Our construction division handles repairs at cost, so a leaking roof does not turn into a three-week negotiation with a stranger.',
  },
  {
    title: 'Inspections and condition reports',
    body: 'Photographed inspections between tenancies, so deposits are argued from evidence rather than memory.',
  },
  {
    title: 'Monthly statement',
    body: 'Rent collected, expenses incurred, net remitted — in your inbox on the first of every month, whether or not anything happened.',
  },
  {
    title: 'Re-letting and repricing',
    body: 'We watch the market and tell you when the rent is below what the unit could achieve at renewal.',
  },
]


export default function ServicesPage() {
  const t = useT()
  const seo = useBlock('services', 'seo', {
    title: "Our Services — Real Estate, Construction & Property Management in Rwanda",
    body: "Buy verified property, sell with proper marketing, build with fixed-price contracts, let us manage your rentals, or invest from abroad with full remote reporting. One company across the whole value chain.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const managementIncludes = useBlockItems(
    'services',
    'management_includes',
    MANAGEMENT_INCLUDES_FALLBACK,
  )
  const heroBlock = useBlock('services', 'hero', {
    eyebrow: "What we do",
    title: "Six services.",
    accent: "One company behind all of them.",
    body: "Most agencies broker. Most builders build. Nobody manages what they sold you. Evaramu Realty and Evaramu Construction sit inside the same company, which is why we can add value to a property instead of just transacting on it.",
  })
  const valueChainBlock = useBlock('services', 'value_chain', {
    eyebrow: "The full value chain",
    title: "Find it. Buy it. Build it.",
    accent: "Let it. Sell it. Repeat.",
    body: "Each of these works on its own. Together they are the Wealth Cycle — which is the only reason a client of ours can go from one property to four in three years.",
  })
  const remoteReportingBlock = useBlock('services', 'remote_reporting', {
    eyebrow: "Remote reporting",
    title: "What lands in your inbox",
    accent: "every month.",
    body: "The diaspora segment is the most underserved in Rwanda precisely because distance makes accountability optional. We removed the option.",
  })
  const { data: faqData } = useLocalizedQuery<ApiFaq>('/public/faqs?page=services')
  const faqs = faqData ?? []
  const { data: serviceData } = useLocalizedQuery<ApiServiceLine>('/public/services')
  const services = serviceData ?? []

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/services"
        keywords={seoKeywords}
        jsonLd={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Services', path: '/services' },
          ]),
        ]}
      />

      <PageHero
        eyebrow={heroBlock.eyebrow}
        title={heroBlock.title}
        accent={heroBlock.accent}
        description="Most agencies broker. Most builders build. Nobody manages what they sold you. Evaramu Realty and Evaramu Construction sit inside the same company, which is why we can add value to a property instead of just transacting on it."
        crumbs={[{ label: t('nav.services') }]}
        image="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: '2', label: 'Active divisions' },
          { value: '10%', label: 'Management fee, on collected rent' },
          { value: '15%', label: 'Build contingency, stated up front' },
          { value: '2h', label: 'Response to every enquiry' },
        ]}
      />

      {/* ---------------- all services ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={valueChainBlock.eyebrow}
            title={valueChainBlock.title}
            accent={valueChainBlock.accent}
            description="Each of these works on its own. Together they are the Wealth Cycle — which is the only reason a client of ours can go from one property to four in three years."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {services.map((service) => (
              <motion.article
                key={service.id}
                variants={fadeUp}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-13 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-all duration-500 group-hover:scale-105 group-hover:bg-gold-500 group-hover:text-white">
                    <Icon name={service.icon ?? "Building2"} className="size-6" strokeWidth={1.9} />
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase',
                      DIVISION_STYLES[service.division],
                    )}
                  >
                    {service.division}
                  </span>
                </div>

                <h2 className="mt-6 font-display text-xl font-semibold text-ink">
                  {service.title}
                </h2>
                <p className="mt-1.5 text-[0.875rem] font-semibold text-gold-600">
                  {service.tagline}
                </p>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {service.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {(service.bullets ?? []).map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-[0.875rem] text-ink-soft"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-gold-500" strokeWidth={3} />
                      {bullet}
                    </li>
                  ))}
                </ul>

                <a
                  href={service.href ?? '/services'}
                  className="mt-auto inline-flex items-center gap-2 pt-7 text-[0.9375rem] font-bold text-ink transition-colors hover:text-gold-600 before:absolute before:inset-0"
                >
                  Learn more
                  <ArrowUpRight
                    className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    strokeWidth={2.4}
                  />
                </a>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- property management ---------------- */}
      <section
        id="management"
        className="scroll-mt-36 bg-surface py-16 lg:py-24"
      >
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-5">
              <motion.div variants={fadeUp}>
                <Eyebrow>Property management</Eyebrow>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-ink sm:text-[2.125rem]"
              >
                We only earn
                <span className="text-gradient-gold"> when your property does.</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft"
              >
                Our management fee is 10% of collected rent — not of contracted rent. If a unit
                sits empty or a tenant defaults, we do not get paid either. That is the alignment
                we want, because it means finding you a good tenant matters to us as much as it
                does to you.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-9 rounded-3xl border border-line bg-canvas p-7"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="size-5 text-gold-600" strokeWidth={2.2} />
                  <p className="font-display text-lg font-semibold text-ink">
                    What you can expect to earn
                  </p>
                </div>
                <dl className="mt-6 space-y-4">
                  {[
                    { label: 'Prime apartments', value: '8–12% / year' },
                    { label: 'Villas', value: '7–10% / year' },
                    { label: 'Our fee', value: '10% of rent collected' },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0"
                    >
                      <dt className="text-[0.9375rem] text-ink-soft">{row.label}</dt>
                      <dd className="font-display text-lg font-semibold text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                <Button to="/consultation?type=discovery" variant="gold">
                  Discuss managing my property
                </Button>
                <Button to="/wealth-cycle" variant="outline">
                  See where this fits
                </Button>
              </motion.div>
            </motion.div>

            <motion.div {...revealProps} variants={stagger(0.07)} className="lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {managementIncludes.map((item) => (
                  <motion.div
                    key={item.title}
                    variants={fadeUp}
                    className="rounded-3xl border border-line bg-canvas p-6 transition-colors duration-400 hover:bg-surface hover:shadow-soft"
                  >
                    <span className="grid size-9 place-items-center rounded-xl bg-gold-500 text-white">
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                    <h3 className="mt-4 font-display text-lg leading-snug font-bold text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-soft">
                      {item.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- diaspora ---------------- */}
      <div id="diaspora" className="scroll-mt-36">
        <DiasporaSection />
      </div>

      {/* ---------------- diaspora reporting detail ---------------- */}
      <section className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div className="container-page relative">
          <SectionHeading
            tone="light"
            eyebrow={remoteReportingBlock.eyebrow}
            title={remoteReportingBlock.title}
            accent={remoteReportingBlock.accent}
            description="The diaspora segment is the most underserved in Rwanda precisely because distance makes accountability optional. We removed the option."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                icon: Video,
                title: 'Video walkthrough',
                body: 'A filmed walk of your property or site, with the UPI visible on screen.',
              },
              {
                icon: Wallet,
                title: 'Financial statement',
                body: 'Rent collected, expenses incurred, net remitted to you. Line by line.',
              },
              {
                icon: Check,
                title: 'Build diary',
                body: 'If you are building: photographs against the schedule and the running cost sheet.',
              },
              {
                icon: ArrowRight,
                title: 'Market note',
                body: 'What comparable properties in your sector sold or let for that month.',
              },
            ].map((item) => {
              const Cmp = item.icon
              return (
                <motion.div
                  key={item.title}
                  variants={fadeUp}
                  className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-gold-500 text-white">
                    <Cmp className="size-[1.35rem]" strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-white/60">
                    {item.body}
                  </p>
                </motion.div>
              )
            })}
          </motion.div>

          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl border border-gold-500/25 bg-gold-500/10 p-8 lg:flex-row lg:items-center"
          >
            <div className="max-w-2xl">
              <h3 className="font-display text-lg font-semibold text-white">
                Never send a deposit to a personal account
              </h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/65">
                Whoever you end up working with — us or anyone else. If they cannot receive funds
                into a registered company account and issue a receipt the same day, that is the end
                of the conversation. We wrote a checklist about it.
              </p>
            </div>
            <Button
              to="/insights/buying-property-in-rwanda-from-abroad"
              variant="gold"
              className="shrink-0"
            >
              Read the checklist
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="bg-canvas-alt py-16 lg:py-20">
        <div className="container-page">
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center"
          >
            <div className="max-w-2xl">
              <Eyebrow>Not sure which you need?</Eyebrow>
              <h2 className="mt-5 text-[2rem] leading-[1.15] font-bold text-ink sm:text-[2.5rem]">
                Start with a free call. We will tell you honestly.
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                Thirty minutes, no obligation. Sometimes the right answer is that you should wait
                six months — and we would rather say that than sell you something.
              </p>
            </div>
            <Button
              to="/consultation"
              variant="gold"
              size="lg"
              className="shrink-0"
              trailing={
                <ArrowRight
                  className="size-5 transition-transform duration-300 group-hover/btn:translate-x-1"
                  strokeWidth={2.3}
                />
              }
            >
              Book a free consultation
            </Button>
          </motion.div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        eyebrow="Service questions"
        title="Fees, coverage"
        accent="and commitments."
        description="What each service costs, where we operate, and what you are and are not tied into."
      />
    </>
  )
}
