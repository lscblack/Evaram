import { motion } from 'framer-motion'
import { ArrowRight, Building2, Check, Mail, Phone, ShieldCheck, Star } from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Counter } from '@/components/ui/Counter'
import { Testimonials } from '@/components/sections/Testimonials'
import { useBlock, useBlockItems, useQuery } from '@/lib/queries'
import { useSite } from '@/lib/siteConfig'
import type { ApiTeamMember } from '@/types/api'

import { fadeRight, fadeUp, revealProps, stagger } from '@/lib/motion'

/** Fallback for `about` → `divisions` — the shipped copy. */
const DIVISIONS_FALLBACK: { active: boolean; focus: string; icon: string; name: string; status: string }[] = [
  {
    name: 'Evaramu Realty',
    status: 'Division 1 · Active',
    icon: 'Home',
    focus: 'Property brokerage, sales, rentals, diaspora services and the Wealth Cycle.',
    active: true,
  },
  {
    name: 'Evaramu Construction',
    status: 'Division 2 · Active',
    icon: 'HardHat',
    focus: 'Renovation, finishing, supervised builds and site management.',
    active: true,
  },
  {
    name: 'Evaramu Technologies',
    status: 'Division 3 · Phase 3',
    icon: 'LayoutGrid',
    focus: 'PropTech platform, listings, client dashboards and AI tooling.',
    active: false,
  },
  {
    name: 'Evaramu Capital',
    status: 'Division 4 · Phase 4',
    icon: 'Wallet',
    focus: 'Property investment fund, syndications and portfolio management.',
    active: false,
  },
]

/** Fallback for `about` → `timeline` — the shipped copy. */
const TIMELINE_FALLBACK: { done: boolean; outcome: string; period: string; title: string }[] = [
  {
    period: 'Months 1–3',
    title: 'Register, build, find the team',
    outcome: 'Company registered at RDB. Brand live. Fifty properties catalogued.',
    done: true,
  },
  {
    period: 'Months 4–9',
    title: 'First deals and first builds',
    outcome: '10+ transactions closed. 3–5 renovation projects delivered. First Wealth Cycle clients.',
    done: true,
  },
  {
    period: 'Months 10–24',
    title: 'Brand and technology platform',
    outcome: 'Listing platform live. Client dashboards for diaspora. 15+ rental units managed.',
    done: false,
  },
  {
    period: 'Year 3',
    title: 'Mid-market leader in Kigali',
    outcome: 'First multi-unit development under construction. Expansion into the Eastern Province.',
    done: false,
  },
]

/** Fallback for `about` → `governance` — the shipped copy. */
const GOVERNANCE_FALLBACK: { responsibility: string; role: string }[] = [
  {
    role: 'Chairman / Co-Founder',
    responsibility: 'Sets vision, owns strategy, final authority on major decisions.',
  },
  {
    role: 'Managing Director',
    responsibility: 'Daily operations, team management, deal execution, P&L ownership.',
  },
  {
    role: 'Head of Real Estate',
    responsibility: 'Leads Evaramu Realty — listings, deals, diaspora clients, the property cycle.',
  },
  {
    role: 'Head of Construction',
    responsibility: 'Leads Evaramu Construction — projects, contractors, site quality.',
  },
  {
    role: 'Finance Director',
    responsibility: 'Cash flow, invoicing, budgets, commissions and financial reporting.',
  },
  {
    role: 'Non-Executive Advisor',
    responsibility: 'External perspective, introductions and governance quality.',
  },
]

export default function AboutPage() {
  const seo = useBlock('about', 'seo', {
    title: "About Evaramu Group Ltd — Kigali Real Estate & Construction",
    body: "Evaramu Group Ltd is a registered Rwandan real estate, construction and property wealth company based in Kigali. Two active divisions, an internal board, and a culture built on documentation and speed.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const governance = useBlockItems(
    'about',
    'governance',
    GOVERNANCE_FALLBACK,
  )
  const timeline = useBlockItems(
    'about',
    'timeline',
    TIMELINE_FALLBACK,
  )
  const divisions = useBlockItems(
    'about',
    'divisions',
    DIVISIONS_FALLBACK,
  )
  const heroBlock = useBlock('about', 'hero', {
    eyebrow: "About us",
    title: "We are not a brokerage.",
    accent: "We are a wealth-building engine.",
    body: "Evaramu Group Ltd finds the right property, helps clients buy it, builds or renovates it, manages it, and when the time is right helps them sell and reinvest. A client who starts with one property can realistically grow to four or five within three years.",
  })
  const groupStructureBlock = useBlock('about', 'group_structure', {
    eyebrow: "Group structure",
    title: "A holding parent with",
    accent: "two active divisions.",
    body: "Evaramu Group Ltd is registered as a private limited company in Rwanda under the Rwanda Development Board. Future divisions will be added as sub-entities under the group.",
  })
  const phasedExecutionBlock = useBlock('about', 'phased_execution', {
    eyebrow: "Phased execution",
    title: "Start small. Build strong.",
    accent: "Each phase funds the next.",
    body: "We never expand faster than our trust can support. Here is where we are and where we are going.",
  })
  const teamIntroBlock = useBlock('about', 'team_intro', {
    eyebrow: "The team",
    title: "Placed on strength,",
    accent: "not convenience.",
    body: "Every person here is in their role because of what they are naturally good at. The wrong person in the wrong role destroys deals, reputation and culture — so we hire slow.",
  })
  const howWeOperateBlock = useBlock('about', 'how_we_operate', {
    eyebrow: "How we operate",
    title: "Four commitments we",
    accent: "do not negotiate on.",
  })
  const trustPoints = useBlockItems<{ title: string; description: string; icon: string }>('home', 'trust_points')
  const site = useSite()
  const { data: teamData } = useQuery<ApiTeamMember[]>('/public/team')
  const team = teamData ?? []

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/about"
        keywords={seoKeywords}
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />

      <PageHero
        eyebrow={heroBlock.eyebrow}
        title={heroBlock.title}
        accent={heroBlock.accent}
        description="Evaramu Group Ltd finds the right property, helps clients buy it, builds or renovates it, manages it, and when the time is right helps them sell and reinvest. A client who starts with one property can realistically grow to four or five within three years."
        crumbs={[{ label: 'About' }]}
        image="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: '2025', label: 'Founded in Kigali' },
          { value: '2', label: 'Active divisions' },
          { value: '204', label: 'Registered agencies we compete with' },
          { value: '100%', label: 'Titles verified before transacting' },
        ]}
      />

      {/* ---------------- story ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
            <motion.div {...revealProps} variants={fadeRight} className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-4xl">
                <img
                  src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
                  alt="Kigali skyline"
                  loading="lazy"
                  className="aspect-4/5 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                {[
                  { value: 400, suffix: 'k+', label: 'National housing deficit' },
                  { value: 30, suffix: 'k+', label: 'Units needed each year' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-3xl border border-line bg-surface p-6 text-center"
                  >
                    <p className="font-display text-3xl leading-none font-bold text-ink">
                      <Counter value={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="mt-2 text-[0.8125rem] leading-snug text-ink-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-7 lg:pl-4">
              <motion.div variants={fadeUp}>
                <Eyebrow>Who we are</Eyebrow>
              </motion.div>

              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-ink sm:text-[2.125rem]"
              >
                Ordinary Rwandans should be able to
                <span className="text-gradient-gold"> build real wealth through property.</span>
              </motion.h2>

              <motion.div variants={fadeUp} className="mt-6 space-y-5 text-[0.9375rem] leading-relaxed text-ink-soft">
                <p>
                  Rwanda needs more than 30,000 new housing units every year and delivered 13.8% of
                  that in 2024. The national deficit sits above 400,000 units and widens annually.
                  Kigali's household count is projected to double by 2032. That demand is
                  structural, not speculative.
                </p>
                <p>
                  And yet 204 registered real estate and construction companies exist here, of which
                  roughly 99% are single-owner informal operations with no systems, no branding and
                  no technology. The few large formal players ignore the middle market entirely.
                </p>
                <p>
                  That gap is the whole reason we exist. We built a company for the family with RWF
                  10–80 million to invest, and for the Rwandan abroad who wants to buy at home but
                  has heard too many stories about deposits that vanished.
                </p>
              </motion.div>

              <motion.blockquote
                variants={fadeUp}
                className="mt-9 rounded-3xl border-l-4 border-gold-500 bg-surface p-7"
              >
                <p className="font-display text-xl leading-relaxed font-medium text-ink italic">
                  "We help ordinary Rwandans and diaspora investors build real, lasting wealth
                  through property — not just one transaction, but a lifetime relationship with a
                  system that works for them."
                </p>
                <footer className="mt-4 text-[0.875rem] font-semibold text-gold-700">
                  Our core philosophy
                </footer>
              </motion.blockquote>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- divisions ---------------- */}
      <section className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={groupStructureBlock.eyebrow}
            title={groupStructureBlock.title}
            accent={groupStructureBlock.accent}
            description="Evaramu Group Ltd is registered as a private limited company in Rwanda under the Rwanda Development Board. Future divisions will be added as sub-entities under the group."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {divisions.map((division) => (
              <motion.article
                key={division.name}
                variants={fadeUp}
                className={`group rounded-3xl border p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift ${
                  division.active
                    ? 'border-line bg-canvas'
                    : 'border-dashed border-line-strong bg-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`grid size-12 place-items-center rounded-2xl transition-colors duration-500 ${
                      division.active
                        ? 'bg-navy-900 text-gold-400 group-hover:bg-gold-500 group-hover:text-white'
                        : 'bg-canvas-alt text-ink-muted'
                    }`}
                  >
                    <Icon name={division.icon} className="size-[1.35rem]" strokeWidth={2} />
                  </span>
                  {division.active && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide text-emerald-700 uppercase">
                      Live
                    </span>
                  )}
                </div>

                <h3
                  className={`mt-5 font-display text-xl leading-snug font-bold ${
                    division.active ? 'text-ink' : 'text-ink-muted'
                  }`}
                >
                  {division.name}
                </h3>
                <p className="mt-1.5 text-[0.75rem] font-semibold tracking-wide text-gold-600 uppercase">
                  {division.status}
                </p>
                <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-soft">
                  {division.focus}
                </p>
              </motion.article>
            ))}
          </motion.div>

          {/* governance */}
          <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-14">
            <motion.div {...revealProps} variants={stagger(0.08)} className="lg:col-span-5">
              <motion.div variants={fadeUp}>
                <Eyebrow>Governance</Eyebrow>
              </motion.div>
              <motion.h3
                variants={fadeUp}
                className="mt-5 text-[1.875rem] leading-[1.15] font-bold text-ink sm:text-[2.25rem]"
              >
                An internal board,
                <span className="text-gradient-gold"> from day one.</span>
              </motion.h3>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft"
              >
                We run monthly board meetings with a fixed agenda: financials, pipeline, team
                performance, risks and the next 30-day priorities. Minutes are recorded and filed.
                For a company of our size that is unusual — which is exactly the point.
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-line-strong bg-canvas px-4 py-2.5"
              >
                <ShieldCheck className="size-4 text-emerald-600" strokeWidth={2.2} />
                <span className="text-[0.875rem] font-medium text-ink">{site.rdb}</span>
              </motion.div>
            </motion.div>

            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-7">
              <div className="overflow-hidden rounded-3xl border border-line">
                <div className="bg-navy-950 px-7 py-4">
                  <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-gold-400 uppercase">
                    Board of directors
                  </p>
                </div>
                <dl className="divide-y divide-line bg-surface">
                  {governance.map((row) => (
                    <div key={row.role} className="px-7 py-4 transition-colors hover:bg-canvas">
                      <dt className="font-display text-[1.0625rem] font-semibold text-ink">{row.role}</dt>
                      <dd className="mt-1 text-[0.9375rem] leading-snug text-ink-soft">
                        {row.responsibility}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- roadmap ---------------- */}
      <section className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div className="container-page relative">
          <SectionHeading
            tone="light"
            eyebrow={phasedExecutionBlock.eyebrow}
            title={phasedExecutionBlock.title}
            accent={phasedExecutionBlock.accent}
            description="We never expand faster than our trust can support. Here is where we are and where we are going."
          />

          <motion.ol {...revealProps} variants={stagger(0.09)} className="relative mt-14">
            <span
              aria-hidden
              className="absolute top-4 bottom-4 left-6 hidden w-px bg-gradient-to-b from-gold-500 via-white/20 to-transparent lg:block"
            />
            {timeline.map((phase) => (
              <motion.li
                key={phase.period}
                variants={fadeUp}
                className="relative mb-4 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm last:mb-0 sm:p-7 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pl-20"
              >
                <span
                  aria-hidden
                  className={`absolute top-1/2 left-6 z-10 hidden size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-navy-950 lg:block ${
                    phase.done ? 'bg-gold-500' : 'bg-white/25'
                  }`}
                />

                <div className="lg:col-span-3">
                  <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-gold-400 uppercase">
                    {phase.period}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold text-white">{phase.title}</h3>
                </div>

                <p className="text-[0.9375rem] leading-relaxed text-white/65 lg:col-span-7">
                  {phase.outcome}
                </p>

                <div className="lg:col-span-2 lg:text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.6875rem] font-bold tracking-wide uppercase ${
                      phase.done
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-white/8 text-white/50'
                    }`}
                  >
                    {phase.done && <Check className="size-3" strokeWidth={3.5} />}
                    {phase.done ? 'Delivered' : 'Planned'}
                  </span>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* ---------------- team ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={teamIntroBlock.eyebrow}
            title={teamIntroBlock.title}
            accent={teamIntroBlock.accent}
            description="Every person here is in their role because of what they are naturally good at. The wrong person in the wrong role destroys deals, reputation and culture — so we hire slow."
            action={
              <Button
                to="/join"
                variant="outline"
                trailing={<ArrowRight className="size-[1.05rem]" strokeWidth={2.3} />}
              >
                Join the team
              </Button>
            }
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {team.map((agent) => (
              <motion.article
                key={agent.id}
                variants={fadeUp}
                className="group overflow-hidden rounded-3xl border border-line bg-surface transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
              >
                <div className="relative h-60 overflow-hidden">
                  <img
                    src={agent.photo_url ?? undefined}
                    alt={agent.full_name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/75 via-transparent to-transparent" />
                  <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[0.6875rem] font-bold tracking-wide text-ink uppercase backdrop-blur-sm">
                      {agent.division}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-navy-950/70 px-2.5 py-1 text-[0.75rem] font-bold text-white backdrop-blur-sm">
                      <Star className="size-3 fill-gold-400 text-gold-400" strokeWidth={0} />
                      {agent.rating}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-display text-lg font-semibold text-ink">{agent.full_name}</h3>
                  <p className="mt-1 text-[0.875rem] font-medium text-gold-600">{agent.job_title}</p>

                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {(agent.specialties ?? []).map((s) => (
                      <li
                        key={s}
                        className="rounded-full bg-canvas-alt px-2.5 py-1 text-[0.75rem] text-ink-soft"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
                    <a
                      href={`tel:${(agent.phone ?? '').replace(/\s/g, '')}`}
                      aria-label={`Call ${agent.full_name}`}
                      className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-white"
                    >
                      <Phone className="size-4" strokeWidth={2.2} />
                    </a>
                    <a
                      href={`mailto:${agent.email}`}
                      aria-label={`Email ${agent.full_name}`}
                      className="grid size-9 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-gold-500 hover:bg-gold-500 hover:text-white"
                    >
                      <Mail className="size-4" strokeWidth={2.2} />
                    </a>
                    <span className="ml-auto text-[0.8125rem] text-ink-muted">
                      {agent.deals_closed} deals
                    </span>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- values ---------------- */}
      <section className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={howWeOperateBlock.eyebrow}
            title={howWeOperateBlock.title}
            accent={howWeOperateBlock.accent}
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.09)}
            className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {trustPoints.map((point) => (
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

          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl border border-line bg-canvas-alt p-8 lg:flex-row lg:items-center"
          >
            <div className="flex items-start gap-4">
              <Building2 className="mt-0.5 size-6 shrink-0 text-gold-600" strokeWidth={2} />
              <div className="max-w-2xl">
                <h3 className="font-display text-lg font-semibold text-ink">
                  Come and see us in Kimihurura
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {site.address}. {site.hours}, {site.saturdayHours}.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button to="/contact" variant="primary">
                Get directions
              </Button>
              <Button to="/consultation" variant="gold">
                Book a visit
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Testimonials />
    </>
  )
}
