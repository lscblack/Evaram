import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, HardHat, Send, Star, TriangleAlert, Users } from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { FaqSection } from '@/components/sections/FaqSection'

import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { api } from '@/lib/api'
import { useBlock, useBlockItems, useQuery } from '@/lib/queries'
import type { ApiFaq, ApiPackage, ApiTeamMember } from '@/types/api'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn, formatCurrency } from '@/lib/utils'


export default function ConstructionPage() {
  const seo = useBlock('construction', 'seo', {
    title: "Construction & Renovation in Kigali — Fixed-Price Building Packages",
    body: "Evaramu Construction builds and renovates in Kigali on fixed-price contracts with a 15% contingency stated up front. Standard, Premium and Luxury finishing packages, weekly cost reporting and remote supervision for diaspora clients.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const heroBlock = useBlock('construction', 'hero', {
    eyebrow: "Evaramu Construction",
    title: "A fixed price, written down",
    accent: "before the first block is laid.",
    body: "The Rwandan market is full of unbranded contractors, verbal contracts and quotes that move once you are committed. We do the opposite: a priced bill of quantities, a contingency stated openly, and a cost sheet you can open at any time.",
  })
  const packagesBlock = useBlock('construction', 'packages', {
    eyebrow: "Finishing packages",
    title: "Three bands.",
    accent: "No hidden fourth.",
    body: "Pick the standard that matches what the property needs to do. Most Wealth Cycle builds land on Premium, because it is the specification that rents well and sells well.",
  })
  const estimatorBlock = useBlock('construction', 'estimator', {
    eyebrow: "Indicative estimate",
    title: "What would your build",
    accent: "actually cost?",
    body: "A first-pass figure using the package you selected above. The real quotation comes after a site visit and a measured bill of quantities — but this tells you whether you are in the right range.",
  })
  const processIntroBlock = useBlock('construction', 'process_intro', {
    eyebrow: "How a project runs",
    title: "Six stages, and you know",
    accent: "where you are in all of them.",
  })
  const renovationIntroBlock = useBlock('construction', 'renovation_intro', {
    eyebrow: "Renovation & smaller works",
    title: "Not every project is",
    accent: "a new build.",
    body: "Most of what we do is finishing something someone else started, or lifting an existing property to a standard that lets it rent. Prices below are typical starting points, not quotations.",
  })
  const buildProcess = useBlockItems<{ step: string; title: string; description: string; icon: string }>('construction', 'build_process')
  const renovations = useBlockItems<{ id: string; title: string; description: string; icon: string; from: number }>('construction', 'renovation_services')
  const { data: faqData } = useQuery<ApiFaq[]>('/public/faqs?page=construction')
  const faqs = faqData ?? []

  const { data: packageData } = useQuery<ApiPackage[]>('/public/construction-packages')
  const packages = useMemo(() => packageData ?? [], [packageData])

  const [selected, setSelected] = useState<string | null>(null)
  const [briefSent, setBriefSent] = useState(false)
  const [briefSending, setBriefSending] = useState(false)
  const [briefError, setBriefError] = useState<string | null>(null)
  const [briefCaptcha, setBriefCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [brief, setBrief] = useState({
    name: '',
    phone: '',
    email: '',
    project_type: 'New build',
    location: '',
    area: '',
    notes: '',
  })
  const setBriefField = (key: keyof typeof brief) => (next: string) =>
    setBrief((prev) => ({ ...prev, [key]: next }))

  // Default to whichever tier the admin flagged as popular, else the middle one.
  const activePackage =
    packages.find((p) => p.id === selected) ??
    packages.find((p) => p.is_popular) ??
    packages[Math.floor(packages.length / 2)]


  const sendBrief = async (e: React.FormEvent) => {
    e.preventDefault()
    setBriefSending(true)
    setBriefError(null)
    const pkg = packages.find((p) => p.id === (selected ?? activePackage?.id))
    try {
      await api.post('/public/contact', {
        full_name: brief.name,
        email: brief.email,
        phone: brief.phone,
        topic: `Construction — ${brief.project_type}`,
        budget: pkg ? pkg.name : 'Not specified',
        based_in: brief.location || null,
        message: brief.notes || 'Project brief submitted from the construction page.',
        ...briefCaptcha,
      })
      setBriefSent(true)
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'That did not send. Please try again.')
    } finally {
      setBriefSending(false)
    }
  }

  const { data: teamData } = useQuery<ApiTeamMember[]>('/public/team')
  const headOfConstruction = (teamData ?? []).find(
    (m) => m.division === 'Construction' && /head/i.test(m.job_title ?? ''),
  )

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/construction"
        keywords={seoKeywords}
        jsonLd={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Construction', path: '/construction' },
          ]),
        ]}
      />

      <PageHero
        eyebrow={heroBlock.eyebrow}
        title={heroBlock.title}
        accent={heroBlock.accent}
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
            eyebrow={packagesBlock.eyebrow}
            title={packagesBlock.title}
            accent={packagesBlock.accent}
            description="Pick the standard that matches what the property needs to do. Most Wealth Cycle builds land on Premium, because it is the specification that rents well and sells well."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.1)}
            className="mt-14 grid gap-6 lg:grid-cols-3"
          >
            {packages.map((pkg) => {
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
                  {pkg.is_popular && (
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

                    {pkg.suited_to && (
                      <p
                        className={cn(
                          'mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[0.8125rem] leading-snug',
                          isActive ? 'bg-white/10 text-white/75' : 'bg-canvas-alt text-ink-soft',
                        )}
                      >
                        <Users
                          className={cn(
                            'mt-0.5 size-3.5 shrink-0',
                            isActive ? 'text-gold-400' : 'text-gold-600',
                          )}
                          strokeWidth={2.2}
                        />
                        {pkg.suited_to}
                      </p>
                    )}

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
                        {pkg.price_per_sqm != null
                          ? formatCurrency(pkg.price_per_sqm)
                          : 'On quotation'}
                        {pkg.price_per_sqm != null && (
                          <span
                            className={cn(
                              'ml-1.5 font-sans text-sm font-medium',
                              isActive ? 'text-white/50' : 'text-ink-muted',
                            )}
                          >
                            /sqm
                          </span>
                        )}
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
                      {(pkg.includes ?? []).map((item) => (
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
                        {(pkg.finishes ?? []).map((finish) => (
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
        className="relative overflow-hidden bg-navy-950 py-16 text-white lg:py-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div className="container-page relative">
          <SectionHeading
            tone="light"
            eyebrow={estimatorBlock.eyebrow}
            title={estimatorBlock.title}
            accent={estimatorBlock.accent}
            description={estimatorBlock.body}
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-12">
            {/* ---- why we do not publish a rate ---- */}
            <div className="lg:col-span-7">
              <p className="text-[1rem] leading-relaxed text-white/70">
                We are asked for a per-square-metre figure constantly, and we do not publish one.
                A rate quoted before anyone has stood on the plot is a number you would hold us
                to — and the plot is exactly what moves it.
              </p>

              <ul className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2">
                {[
                  {
                    icon: 'Landmark',
                    title: 'Slope and soil',
                    body: 'A sloping or soft site can add a third to the foundation before a single wall goes up.',
                  },
                  {
                    icon: 'MapPinned',
                    title: 'Access to the plot',
                    body: 'If a lorry cannot reach the site, every block and every bag of cement is carried — and that is priced.',
                  },
                  {
                    icon: 'Layers',
                    title: 'What you are building',
                    body: 'One household or three, single storey or two — the layout changes the structure, not just the finish.',
                  },
                  {
                    icon: 'Timer',
                    title: 'When you build',
                    body: 'Material prices move. We quote against the day you sign, with a 15% contingency stated openly.',
                  },
                ].map((item) => (
                  <div key={item.title} className="bg-navy-950 p-6">
                    <span className="grid size-10 place-items-center rounded-xl bg-gold-500/15 text-gold-400">
                      <Icon name={item.icon} className="size-5" strokeWidth={2} />
                    </span>
                    <h3 className="mt-4 font-display text-[1.0625rem] font-semibold">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-[0.875rem] leading-relaxed text-white/55">
                      {item.body}
                    </p>
                  </div>
                ))}
              </ul>
            </div>

            {/* ---- what you get instead ---- */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
                <h3 className="font-display text-xl font-semibold">What you get instead</h3>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/60">
                  Send us the brief below. Within a week of the site visit you receive a written
                  quotation — not a rate, an actual price for your plot.
                </p>

                <ol className="mt-7 space-y-4">
                  {[
                    'A surveyor and a site supervisor walk the plot with you',
                    'Drawings and a bill of quantities are prepared',
                    'A fixed-price contract, with the 15% contingency written into it',
                    'A payment schedule tied to milestones, not to dates',
                  ].map((line, i) => (
                    <li key={line} className="flex gap-3.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gold-500 text-[0.75rem] font-bold text-white">
                        {i + 1}
                      </span>
                      <span className="text-[0.875rem] leading-relaxed text-white/70">{line}</span>
                    </li>
                  ))}
                </ol>

                <a
                  href="#brief"
                  className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gold-500 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-gold-600"
                >
                  Request a quotation
                  <ArrowRight className="size-4" strokeWidth={2.3} />
                </a>

                <p className="mt-4 text-center text-[0.75rem] text-white/40">
                  Free, and with no obligation to build with us.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="bg-canvas-alt py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={processIntroBlock.eyebrow}
            title={processIntroBlock.title}
            accent={processIntroBlock.accent}
          />

          <motion.ol
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {buildProcess.map((stage) => (
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
            eyebrow={renovationIntroBlock.eyebrow}
            title={renovationIntroBlock.title}
            accent={renovationIntroBlock.accent}
            description="Most of what we do is finishing something someone else started, or lifting an existing property to a standard that lets it rent. Prices below are typical starting points, not quotations."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.07)}
            className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {renovations.map((service) => (
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
      <section id="brief" className="bg-canvas py-16 lg:py-24">
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
                    src={headOfConstruction.photo_url ?? undefined}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    className="size-16 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-[1.0625rem] font-semibold text-ink">
                      {headOfConstruction.full_name}
                    </p>
                    <p className="text-[0.875rem] text-ink-muted">{headOfConstruction.job_title}</p>
                    <p className="mt-1.5 text-[0.8125rem] text-ink-soft">
                      {headOfConstruction.deals_closed} projects delivered · {headOfConstruction.rating} rating
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
                      {headOfConstruction?.full_name ?? 'Our Head of Construction'} will call you within
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
                    onSubmit={sendBrief}
                  >
                    <div className="flex items-center gap-2.5">
                      <HardHat className="size-5 text-gold-600" strokeWidth={2.2} />
                      <h3 className="font-display text-lg font-semibold text-ink">
                        Project brief
                      </h3>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="b-name" label="Your name" required value={brief.name} onChange={setBriefField('name')} />
                      <Field id="b-phone" label="Phone or WhatsApp" required type="tel" value={brief.phone} onChange={setBriefField('phone')} />
                    </div>

                    <Field id="b-email" label="Email address" required type="email" value={brief.email} onChange={setBriefField('email')} />

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
                          value={brief.project_type}
                          onChange={(e) => setBriefField('project_type')(e.target.value)}
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
                          value={selected ?? activePackage?.id ?? ''}
                          onChange={(e) => setSelected(e.target.value)}
                          className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
                        >
                          {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                              {pkg.name}
                            </option>
                          ))}
                          <option value="unsure">Not sure yet — advise me</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field id="b-location" label="Plot location (sector or UPI)" value={brief.location} onChange={setBriefField('location')} />
                      <Field id="b-area" label="Approximate area (sqm)" type="number" value={brief.area} onChange={setBriefField('area')} />
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
                        value={brief.notes}
                        onChange={(e) => setBriefField('notes')(e.target.value)}
                        placeholder="Tell us about the plot, what stage it is at, and what you want at the end of it."
                        className="w-full resize-y rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[0.9375rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
                      />
                    </div>

                    <Captcha value={briefCaptcha} onChange={setBriefCaptcha} scope="contact" compact />

                    {briefError && (
                      <p
                        role="alert"
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.875rem] text-red-700"
                      >
                        {briefError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="gold"
                      size="lg"
                      className="w-full"
                      disabled={briefSending}
                      trailing={<Send className="size-[1.05rem]" strokeWidth={2.2} />}
                    >
                      {briefSending ? 'Sending…' : 'Send project brief'}
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
        faqs={faqs}
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
  value,
  onChange,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
  value?: string
  onChange?: (next: string) => void
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
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink transition-colors focus:border-gold-500 focus:bg-surface focus:outline-none"
      />
    </div>
  )
}
