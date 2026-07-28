import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Calculator,
  Check,
  HardHat,
  Send,
  ShieldCheck,
  Star,
  TriangleAlert,
} from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { FaqSection } from '@/components/sections/FaqSection'
import {
  BUILD_PROCESS,
  CONSTRUCTION_PACKAGES,
  RENOVATION_SERVICES,
} from '@/data/services'
import { getAgent } from '@/data/properties'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn, formatCurrency } from '@/lib/utils'

const CONSTRUCTION_FAQS = [
  {
    question: 'Is the price you quote the price I actually pay?',
    answer:
      'Yes. We work on fixed-price contracts with a 15% contingency stated openly at signature — not discovered at month four. If a genuine variation is needed, for example you change the specification, we price it in writing and you approve it before any work starts.',
  },
  {
    question: 'How do payments work?',
    answer:
      'A 30–40% deposit on signature, then milestone payments against completed work. You never pay ahead of what has been built. Every payment goes to our registered company account and is receipted the same day.',
  },
  {
    question: 'Can you finish a house someone else started?',
    answer:
      'That is one of our most common projects. We survey what has been built, test what is structurally sound, and quote to bring it to a lettable or liveable standard. We will tell you honestly if any of the existing work needs to come down.',
  },
  {
    question: 'I live abroad. How do I know the work is really happening?',
    answer:
      'A weekly photo report and running cost sheet, plus a monthly video walkthrough. We also offer remote supervision as a standalone service if you are building with your own contractor — we inspect, photograph and verify every payment request before you release funds.',
  },
  {
    question: 'Who are the workers on my site?',
    answer:
      'A vetted sub-contractor network: masons, electricians, plumbers and tilers we have worked with repeatedly and hold accountable. No casual labour, and no contractor new to us on a high-value job. A site supervisor is present daily.',
  },
  {
    question: 'What happens if something goes wrong after handover?',
    answer:
      'Every package carries a written workmanship warranty — 12 months on Standard, 24 on Premium, 36 on Luxury. We come back and fix it. That warranty is in the contract, not a verbal promise.',
  },
]

export default function ConstructionPage() {
  const [selected, setSelected] = useState(CONSTRUCTION_PACKAGES[1].id)
  const [area, setArea] = useState(180)
  const [briefSent, setBriefSent] = useState(false)

  const activePackage =
    CONSTRUCTION_PACKAGES.find((p) => p.id === selected) ?? CONSTRUCTION_PACKAGES[1]

  const estimate = useMemo(() => {
    const base = activePackage.pricePerSqm * area
    return {
      base,
      contingency: Math.round(base * 0.15),
      total: Math.round(base * 1.15),
      deposit: Math.round(base * 1.15 * 0.35),
    }
  }, [activePackage, area])

  const headOfConstruction = getAgent('ag-04')

  return (
    <>
      <Seo
        title="Construction & Renovation in Kigali — Fixed-Price Building Packages"
        description="Evaramu Construction builds and renovates in Kigali on fixed-price contracts with a 15% contingency stated up front. Standard, Premium and Luxury finishing packages, weekly cost reporting and remote supervision for diaspora clients."
        path="/construction"
        keywords={[
          'construction company Kigali',
          'house finishing Rwanda',
          'renovation Kigali',
          'building cost per sqm Rwanda',
          'remote build supervision Rwanda',
        ]}
        jsonLd={[
          faqJsonLd(CONSTRUCTION_FAQS),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Construction', path: '/construction' },
          ]),
        ]}
      />

      <PageHero
        eyebrow="Evaramu Construction"
        title="A fixed price, written down"
        accent="before the first block is laid."
        description="The Rwandan market is full of unbranded contractors, verbal contracts and quotes that move once you are committed. We do the opposite: a priced bill of quantities, a contingency stated openly, and a cost sheet you can open at any time."
        crumbs={[{ label: 'Construction' }]}
        image="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: '15%', label: 'Contingency stated at signature' },
          { value: '30–40%', label: 'Deposit — the rest on milestones' },
          { value: '20–50%', label: 'Value added to the property' },
          { value: '36 mo', label: 'Maximum workmanship warranty' },
        ]}
      />

      {/* ---------------- the risk we manage ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-5">
              <motion.div variants={fadeUp}>
                <Eyebrow>The honest version</Eyebrow>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-ink sm:text-[2.125rem]"
              >
                The cheapest quote
                <span className="text-gradient-gold"> almost always costs the most.</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft"
              >
                An underquoted contract does not stay underquoted. It gets revised at exactly the
                point where you are committed and cannot easily replace the contractor. Cost
                overrun is the single highest-likelihood, highest-impact risk in this business — so
                we price for it openly instead of pretending it away.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="mt-8 flex items-start gap-4 rounded-3xl border border-gold-200 bg-gold-50 p-6"
              >
                <TriangleAlert className="mt-0.5 size-5 shrink-0 text-gold-600" strokeWidth={2.2} />
                <p className="text-[0.9375rem] leading-relaxed text-ink-soft">
                  If a builder quotes you a single number per square metre without visiting the
                  site, they are guessing or underquoting deliberately. Ask them what their
                  contingency is. If they say there isn't one, walk away.
                </p>
              </motion.div>
            </motion.div>

            <motion.div {...revealProps} variants={stagger(0.08)} className="lg:col-span-7">
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  {
                    icon: 'FileText',
                    title: 'Priced bill of quantities',
                    body: 'Every item measured and costed before you sign. You can see what each line is for.',
                  },
                  {
                    icon: 'ShieldCheck',
                    title: '15% contingency, stated',
                    body: 'Written into the contract at signature so surprises come out of a budget that already exists.',
                  },
                  {
                    icon: 'HardHat',
                    title: 'Site supervisor daily',
                    body: 'Not a visit once a fortnight. Somebody accountable is on your site every working day.',
                  },
                  {
                    icon: 'Calculator',
                    title: 'Weekly cost tracking',
                    body: 'A running cost sheet and photo report every week, whether you ask for it or not.',
                  },
                ].map((item) => (
                  <motion.div
                    key={item.title}
                    variants={fadeUp}
                    className="group rounded-3xl border border-line bg-surface p-7 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift"
                  >
                    <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                      <Icon name={item.icon} className="size-[1.35rem]" strokeWidth={2} />
                    </span>
                    <h3 className="mt-5 font-display text-lg font-semibold text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {item.body}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- packages ---------------- */}
      <section id="packages" className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Finishing packages"
            title="Three bands."
            accent="No hidden fourth."
            description="Pick the standard that matches what the property needs to do. Most Wealth Cycle builds land on Premium, because it is the specification that rents well and sells well."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.1)}
            className="mt-14 grid gap-6 lg:grid-cols-3"
          >
            {CONSTRUCTION_PACKAGES.map((pkg) => {
              const isActive = pkg.id === selected
              return (
                <motion.article
                  key={pkg.id}
                  variants={fadeUp}
                  className={cn(
                    'relative flex flex-col overflow-hidden rounded-3xl p-8 transition-all duration-500 ease-brand',
                    isActive
                      ? 'bg-navy-950 text-white shadow-lift ring-2 ring-gold-500'
                      : 'border border-line bg-canvas hover:-translate-y-1.5 hover:shadow-lift',
                  )}
                >
                  {isActive && (
                    <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                  )}
                  {pkg.popular && (
                    <span className="absolute top-8 right-8 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide text-white uppercase">
                      <Star className="size-3 fill-white" strokeWidth={0} />
                      Most chosen
                    </span>
                  )}

                  <div className="relative flex flex-1 flex-col">
                    <p
                      className={cn(
                        'text-[0.6875rem] font-bold tracking-[0.2em] uppercase',
                        isActive ? 'text-gold-400' : 'text-gold-600',
                      )}
                    >
                      {pkg.tier}
                    </p>
                    <h3
                      className={cn(
                        'mt-3 font-display text-2xl font-semibold',
                        isActive ? 'text-white' : 'text-ink',
                      )}
                    >
                      {pkg.name}
                    </h3>
                    <p
                      className={cn(
                        'mt-2 text-[0.9375rem]',
                        isActive ? 'text-white/60' : 'text-ink-muted',
                      )}
                    >
                      {pkg.tagline}
                    </p>

                    <div
                      className={cn(
                        'mt-7 border-y py-6',
                        isActive ? 'border-white/10' : 'border-line',
                      )}
                    >
                      <p
                        className={cn(
                          'text-[0.75rem] font-semibold tracking-wide uppercase',
                          isActive ? 'text-white/45' : 'text-ink-muted',
                        )}
                      >
                        From
                      </p>
                      <p
                        className={cn(
                          'mt-1 font-display text-4xl leading-none font-bold',
                          isActive ? 'text-white' : 'text-ink',
                        )}
                      >
                        {formatCurrency(pkg.pricePerSqm)}
                        <span
                          className={cn(
                            'ml-1.5 font-sans text-sm font-medium',
                            isActive ? 'text-white/50' : 'text-ink-muted',
                          )}
                        >
                          /sqm
                        </span>
                      </p>
                      <p
                        className={cn(
                          'mt-2 text-[0.875rem]',
                          isActive ? 'text-white/55' : 'text-ink-muted',
                        )}
                      >
                        Typical duration {pkg.duration}
                      </p>
                    </div>

                    <p
                      className={cn(
                        'mt-6 text-[0.9375rem] leading-relaxed',
                        isActive ? 'text-white/65' : 'text-ink-soft',
                      )}
                    >
                      {pkg.description}
                    </p>

                    <ul className="mt-6 space-y-3">
                      {pkg.includes.map((item) => (
                        <li
                          key={item}
                          className={cn(
                            'flex items-start gap-2.5 text-[0.9375rem] leading-snug',
                            isActive ? 'text-white/75' : 'text-ink-soft',
                          )}
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-gold-500" strokeWidth={3} />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div
                      className={cn(
                        'mt-7 border-t pt-6',
                        isActive ? 'border-white/10' : 'border-line',
                      )}
                    >
                      <p
                        className={cn(
                          'text-[0.6875rem] font-bold tracking-[0.16em] uppercase',
                          isActive ? 'text-white/40' : 'text-ink-muted',
                        )}
                      >
                        Specification
                      </p>
                      <dl className="mt-3 space-y-2">
                        {pkg.finishes.map((finish) => (
                          <div key={finish.label} className="flex gap-2 text-[0.8125rem]">
                            <dt
                              className={cn(
                                'w-20 shrink-0 font-semibold',
                                isActive ? 'text-white/70' : 'text-ink-soft',
                              )}
                            >
                              {finish.label}
                            </dt>
                            <dd className={isActive ? 'text-white/50' : 'text-ink-muted'}>
                              {finish.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    <Button
                      onClick={() => setSelected(pkg.id)}
                      variant={isActive ? 'gold' : 'outline'}
                      className="mt-7 w-full"
                    >
                      {isActive ? 'Selected — see estimate' : `Estimate a ${pkg.tier} build`}
                    </Button>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ---------------- estimator ---------------- */}
      <section
        id="estimate"
        className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-28"
      >
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />

        <div className="container-page relative">
          <SectionHeading
            tone="light"
            eyebrow="Indicative estimate"
            title="What would your build"
            accent="actually cost?"
            description="A first-pass figure using the package you selected above. The real quotation comes after a site visit and a measured bill of quantities — but this tells you whether you are in the right range."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-12">
            {/* inputs */}
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-5">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <Calculator className="size-5 text-gold-400" strokeWidth={2.2} />
                  <h3 className="font-display text-lg font-semibold">Your build</h3>
                </div>

                <fieldset className="mt-7">
                  <legend className="text-[0.75rem] font-bold tracking-wide text-white/45 uppercase">
                    Package
                  </legend>
                  <div className="mt-3 grid gap-2">
                    {CONSTRUCTION_PACKAGES.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelected(pkg.id)}
                        className={cn(
                          'flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition-colors',
                          pkg.id === selected
                            ? 'border-gold-500 bg-gold-500/15'
                            : 'border-white/10 hover:border-white/25',
                        )}
                      >
                        <span className="text-[0.9375rem] font-semibold">{pkg.name}</span>
                        <span className="text-[0.8125rem] text-white/50">
                          {formatCurrency(pkg.pricePerSqm)}/sqm
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="mt-7">
                  <div className="flex items-baseline justify-between gap-3">
                    <label
                      htmlFor="build-area"
                      className="text-[0.75rem] font-bold tracking-wide text-white/45 uppercase"
                    >
                      Built area
                    </label>
                    <span className="font-display text-lg font-semibold text-white">{area} sqm</span>
                  </div>
                  <input
                    id="build-area"
                    type="range"
                    min={40}
                    max={600}
                    step={10}
                    value={area}
                    onChange={(e) => setArea(Number(e.target.value))}
                    className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-gold-500"
                  />
                  <div className="mt-2 flex justify-between text-[0.75rem] text-white/40">
                    <span>40 sqm</span>
                    <span>600 sqm</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* output */}
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-7">
              <div className="h-full rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm sm:p-9">
                <p className="text-[0.75rem] font-bold tracking-wide text-white/45 uppercase">
                  {activePackage.name} · {area} sqm
                </p>

                <p className="mt-4 font-display text-[2rem] leading-none font-bold text-gold-400 sm:text-[3.25rem]">
                  {formatCurrency(estimate.total)}
                </p>
                <p className="mt-3 text-[0.9375rem] text-white/55">
                  Indicative total including the 15% contingency
                </p>

                <dl className="mt-9 space-y-4 border-t border-white/10 pt-8">
                  {[
                    {
                      label: `Build cost (${area} sqm × ${formatCurrency(activePackage.pricePerSqm)})`,
                      value: formatCurrency(estimate.base),
                    },
                    { label: 'Contingency (15%, stated up front)', value: formatCurrency(estimate.contingency) },
                    { label: 'Deposit on signature (35%)', value: formatCurrency(estimate.deposit) },
                    { label: 'Typical duration', value: activePackage.duration },
                  ].map((row) => (
                    <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-3">
                      <dt className="text-[0.9375rem] text-white/55">{row.label}</dt>
                      <dd className="font-display text-[1.0625rem] font-semibold text-white">{row.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-9 flex flex-wrap gap-3">
                  <Button to="/consultation?type=construction" variant="gold" size="lg">
                    Book a site visit
                  </Button>
                  <Button to="/contact" variant="outline-light" size="lg">
                    Send us your drawings
                  </Button>
                </div>

                <p className="mt-6 flex items-start gap-2.5 text-[0.8125rem] leading-relaxed text-white/45">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-400" strokeWidth={2.2} />
                  This figure is indicative. Ground conditions, access, service connections and
                  your specification all move it. The quotation we give after a site visit is fixed.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- process ---------------- */}
      <section className="bg-canvas-alt py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="How a project runs"
            title="Six stages, and you know"
            accent="where you are in all of them."
          />

          <motion.ol
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {BUILD_PROCESS.map((stage) => (
              <motion.li
                key={stage.step}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-3xl border border-line bg-surface p-7 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                    <Icon name={stage.icon} className="size-[1.35rem]" strokeWidth={2} />
                  </span>
                  <span className="font-display text-2xl font-semibold text-line transition-colors duration-500 group-hover:text-gold-200">
                    {stage.step}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink">
                  {stage.title}
                </h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {stage.description}
                </p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* ---------------- renovation services ---------------- */}
      <section className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Renovation & smaller works"
            title="Not every project is"
            accent="a new build."
            description="Most of what we do is finishing something someone else started, or lifting an existing property to a standard that lets it rent. Prices below are typical starting points, not quotations."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.07)}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {RENOVATION_SERVICES.map((service) => (
              <motion.article
                key={service.id}
                variants={fadeUp}
                className="group flex flex-col rounded-3xl border border-line bg-canvas p-7 transition-all duration-500 hover:-translate-y-1.5 hover:bg-surface hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-surface text-ink shadow-soft transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                  <Icon name={service.icon} className="size-[1.35rem]" strokeWidth={2} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink">
                  {service.title}
                </h3>
                <p className="mt-2.5 flex-1 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {service.description}
                </p>
                <p className="mt-5 border-t border-line pt-4">
                  <span className="text-[0.75rem] font-semibold tracking-wide text-ink-muted uppercase">
                    From
                  </span>
                  <span className="ml-2 font-display text-lg font-semibold text-ink">
                    {formatCurrency(service.from)}
                  </span>
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- brief form ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-5">
              <motion.div variants={fadeUp}>
                <Eyebrow>Start a project</Eyebrow>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-ink sm:text-[2.125rem]"
              >
                Tell us what you want built.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft"
              >
                Send the brief and we will come back within two working hours with next steps —
                usually a site visit within the week.
              </motion.p>

              {headOfConstruction && (
                <motion.div
                  variants={fadeUp}
                  className="mt-9 flex items-center gap-4 rounded-3xl border border-line bg-surface p-6"
                >
                  <img
                    src={headOfConstruction.photo}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="size-16 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-[1.0625rem] font-semibold text-ink">
                      {headOfConstruction.name}
                    </p>
                    <p className="text-[0.875rem] text-ink-muted">{headOfConstruction.role}</p>
                    <p className="mt-1.5 text-[0.8125rem] text-ink-soft">
                      {headOfConstruction.deals} projects delivered · {headOfConstruction.rating} rating
                    </p>
                  </div>
                </motion.div>
              )}

              <motion.ul variants={stagger(0.06)} className="mt-8 space-y-3">
                {[
                  'Site visit and written brief',
                  'Priced bill of quantities within 7 days',
                  'Fixed-price contract with milestone schedule',
                  'Weekly photo and cost reporting',
                ].map((item) => (
                  <motion.li
                    key={item}
                    variants={fadeUp}
                    className="flex items-start gap-3 text-[0.9375rem] text-ink-soft"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500">
                      <Check className="size-3 text-white" strokeWidth={3.5} />
                    </span>
                    {item}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>

            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-7">
              <div className="rounded-3xl border border-line bg-surface p-7 shadow-soft sm:p-9">
                {briefSent ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check className="size-8" strokeWidth={2.6} />
                    </span>
                    <h3 className="mt-6 font-display text-xl font-semibold text-ink">
                      Brief received
                    </h3>
                    <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-ink-soft">
                      {headOfConstruction?.name ?? 'Our Head of Construction'} will call you within
                      two working hours to arrange the site visit.
                    </p>
                    <Button
                      onClick={() => setBriefSent(false)}
                      variant="outline"
                      className="mt-7"
                    >
                      Send another brief
                    </Button>
                  </div>
                ) : (
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setBriefSent(true)
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <HardHat className="size-5 text-gold-600" strokeWidth={2.2} />
                      <h3 className="font-display text-lg font-semibold text-ink">
                        Project brief
                      </h3>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="b-name" label="Your name" required />
                      <Field id="b-phone" label="Phone or WhatsApp" required type="tel" />
                    </div>

                    <Field id="b-email" label="Email address" required type="email" />

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="b-type"
                          className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                        >
                          Project type
                        </label>
                        <select
                          id="b-type"
                          className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                        >
                          <option>New build</option>
                          <option>Finishing an unfinished build</option>
                          <option>Renovation</option>
                          <option>Extension or extra units</option>
                          <option>Remote supervision only</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="b-package"
                          className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                        >
                          Preferred package
                        </label>
                        <select
                          id="b-package"
                          value={selected}
                          onChange={(e) => setSelected(e.target.value)}
                          className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                        >
                          {CONSTRUCTION_PACKAGES.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name}
                            </option>
                          ))}
                          <option value="unsure">Not sure yet — advise me</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="b-location" label="Plot location (sector or UPI)" />
                      <Field id="b-area" label="Approximate area (sqm)" type="number" />
                    </div>

                    <div>
                      <label
                        htmlFor="b-notes"
                        className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                      >
                        What do you want built?
                      </label>
                      <textarea
                        id="b-notes"
                        rows={4}
                        placeholder="Tell us about the plot, what stage it is at, and what you want at the end of it."
                        className="w-full resize-y rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="gold"
                      size="lg"
                      className="w-full"
                      trailing={<Send className="size-[1.05rem]" strokeWidth={2.2} />}
                    >
                      Send project brief
                    </Button>

                    <p className="text-center text-[0.8125rem] text-ink-muted">
                      No obligation. We will tell you honestly if your budget and your brief do not
                      match.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- cross-sell ---------------- */}
      <section className="bg-navy-950 py-16 text-white lg:py-20">
        <div className="container-page">
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center"
          >
            <div className="max-w-2xl">
              <h2 className="font-display text-xl font-semibold sm:text-3xl">
                Building is step two of the Wealth Cycle.
              </h2>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/60">
                A Premium build typically lifts a property 20–50%. Once it is finished, our Realty
                division can tenant it or list it — and the cycle keeps going.
              </p>
            </div>
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
              See the full cycle
            </Button>
          </motion.div>
        </div>
      </section>

      <FaqSection
        faqs={CONSTRUCTION_FAQS}
        eyebrow="Construction questions"
        title="What clients ask"
        accent="before they sign."
        description="Fixed pricing, payment schedules, warranties and how we handle a build when you are not in the country."
      />
    </>
  )
}

/** Small labelled input used throughout the brief form. */
function Field({
  id,
  label,
  type = 'text',
  required = false,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
      >
        {label}
        {required && <span className="ml-1 text-gold-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
      />
    </div>
  )
}
