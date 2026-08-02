import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Quote, Send, Sparkles, X } from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Counter } from '@/components/ui/Counter'
import { FaqSection } from '@/components/sections/FaqSection'
import type { ApiFaq, ApiTeamMember } from '@/types/api'
import { Captcha, EMPTY_CAPTCHA, type CaptchaValue } from '@/components/ui/Captcha'
import { api } from '@/lib/api'
import { useBlockItems, useBlock, useQuery } from '@/lib/queries'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { cn, formatCompactCurrency, formatCurrency } from '@/lib/utils'

type RoleId = 'agent' | 'broker' | 'contractor' | 'staff'

interface Role {
  id: RoleId
  title: string
  subtitle: string
  icon: string
  who: string
  earning: string
  responsibilities: string[]
  requirements: string[]
}

const ROLES: Role[] = [
  {
    id: 'agent',
    title: 'Commission Sales Agent',
    subtitle: 'Earn 5–10% on every deal you close',
    icon: 'Handshake',
    who: 'You have a network, you can hold a conversation with a serious buyer, and you follow up without being chased.',
    earning: '5–10% of the agency commission per closed deal, paid on completion',
    responsibilities: [
      'Qualify inbound leads routed to you from our marketing',
      'Show properties and walk boundaries with buyers',
      'Negotiate under the guidance of your division head',
      'Log every contact in the CRM — no lead goes cold',
    ],
    requirements: [
      'Demonstrable local network in your target sector',
      'Own smartphone and reliable transport',
      'Willing to respond to leads within two hours',
      'No history of undisclosed double-brokering',
    ],
  },
  {
    id: 'broker',
    title: 'Independent Broker Partner',
    subtitle: 'Bring your listings under a real brand',
    icon: 'Users',
    who: 'You already broker land informally. You know your sector better than anyone, but you have no brand, no documentation and no marketing behind you.',
    earning: 'Negotiated split per listing, agreed in writing before we market it',
    responsibilities: [
      'Introduce properties you have a genuine mandate on',
      'Provide accurate owner and parcel information',
      'Attend viewings with our consultant where useful',
      'Operate within our documentation standards',
    ],
    requirements: [
      'Written mandate from the owner on any property you introduce',
      'Willingness to have every title verified at NLA',
      'No verbal-only arrangements with sellers',
      'Reference from at least one past transaction',
    ],
  },
  {
    id: 'contractor',
    title: 'Vetted Sub-Contractor',
    subtitle: 'Steady work from a client who pays on time',
    icon: 'HardHat',
    who: 'You are a mason, electrician, plumber, tiler, carpenter or roofer with a crew you can vouch for and work you are proud to show.',
    earning: 'Per-project rates agreed up front, milestone payments, no chasing invoices',
    responsibilities: [
      'Deliver to the specification on the drawings, not to memory',
      'Work under a site supervisor and to a written schedule',
      'Flag problems immediately — bad news travels fast here',
      'Stand behind your work for the warranty period',
    ],
    requirements: [
      'Photographs of at least three completed jobs',
      'A crew you can put on site reliably',
      'Willing to be paid against completed milestones',
      'No new contractor is placed on a high-value job first',
    ],
  },
  {
    id: 'staff',
    title: 'Full-Time Team',
    subtitle: 'Build the company, not just close deals',
    icon: 'Building2',
    who: 'You want a role with ownership: site supervision, customer success, finance, content or the PropTech platform itself.',
    earning: 'Salaried, with performance components tied to division results',
    responsibilities: [
      'Own a function end to end, not a task list',
      'Report honestly at the monthly board meeting',
      'Improve the system, not just work inside it',
      'Protect client trust — it is the entire product',
    ],
    requirements: [
      'Evidence you have done the work, not just studied it',
      'Comfortable with documentation and accountability',
      'Prepared to be measured on outcomes',
      'Aligned with our culture rules, all five of them',
    ],
  },
]

/** Fallback for `join` → `culture_rules` — the shipped copy. */
const CULTURE_RULES_FALLBACK: { body: string; title: string }[] = [
  {
    title: 'Every deal is documented',
    body: 'No verbal-only agreements, inside or outside the company. If it is not written down, it did not happen.',
  },
  {
    title: 'Speed is a differentiator',
    body: 'Every lead gets a response within two hours. Competitors take days — that gap is our advantage and we protect it.',
  },
  {
    title: 'No one hides problems',
    body: 'Bad news is shared immediately so it can be fixed. Hiding a problem is the only genuinely unforgivable thing here.',
  },
  {
    title: 'Client trust is the product',
    body: 'Every team member protects it or leaves. One bad deal damages a brand it took years to build.',
  },
  {
    title: 'Results over seniority',
    body: 'The best idea wins regardless of who has it. Nobody is overruled because someone else has been here longer.',
  },
]


export default function JoinPage() {
  const seo = useBlock('join', 'seo', {
    title: "Join Evaramu — Careers, Agents, Brokers & Contractors in Rwanda",
    body: "Join Evaramu Group Ltd as a commission sales agent, independent broker partner, vetted sub-contractor or full-time team member. 5–10% commission, real marketing behind you, and payment on a documented schedule.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const cultureRules = useBlockItems(
    'join',
    'culture_rules',
    CULTURE_RULES_FALLBACK,
  )
  const heroBlock = useBlock('join', 'hero', {
    eyebrow: "Join the agency",
    title: "Bring your network to a company",
    accent: "with systems behind it.",
    body: "There are more than 200 informal brokers in Rwanda with genuine local knowledge and nothing behind them — no brand, no documentation, no marketing, no follow-up system. If that is you, this is the offer.",
  })
  const rolesBlock = useBlock('join', 'roles', {
    eyebrow: "Four ways in",
    title: "Pick the one that",
    accent: "describes you.",
    body: "We hire and partner on strength, not convenience. The wrong person in the wrong role destroys deals, reputation and culture — so we are specific about what each of these actually involves.",
  })
  const calculatorBlock = useBlock('join', 'calculator', {
    eyebrow: "Commission calculator",
    title: "What could a good year",
    accent: "actually pay?",
    body: "Move the sliders to your own reality. This models the agency commission of roughly 3% of transaction value, of which you take your agreed share.",
  })
  const colleaguesBlock = useBlock('join', 'colleagues', {
    eyebrow: "Your colleagues",
    title: "Small team.",
    accent: "Everyone owns something.",
    body: "You would not be lost in a hierarchy. Each of these people runs a function end to end and reports on it at the monthly board meeting.",
  })
  const { data: teamData } = useQuery<ApiTeamMember[]>('/public/team')
  const team = teamData ?? []

  const { data: faqData } = useQuery<ApiFaq[]>('/public/faqs?page=join')
  const faqs = faqData ?? []

  const [roleId, setRoleId] = useState<RoleId>('agent')
  const [dealValue, setDealValue] = useState(60_000_000)
  const [dealsPerYear, setDealsPerYear] = useState(6)
  const [rate, setRate] = useState(7)
  const [applied, setApplied] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [captcha, setCaptcha] = useState<CaptchaValue>(EMPTY_CAPTCHA)
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    area_covered: '',
    years_experience: '',
    pitch: '',
    portfolio_url: '',
  })
  const set = (key: keyof typeof form) => (next: string) =>
    setForm((prev) => ({ ...prev, [key]: next }))

  const apply = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      await api.post('/public/applications', {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role_applied: roleId,
        area_covered: form.area_covered || null,
        years_experience: form.years_experience ? Number(form.years_experience) : null,
        pitch: form.pitch,
        portfolio_url: form.portfolio_url || null,
        ...captcha,
      })
      setApplied(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const role = ROLES.find((r) => r.id === roleId) ?? ROLES[0]

  const earnings = useMemo(() => {
    // Agency commission is ~3% of the transaction; the agent takes `rate`% of that deal.
    const perDeal = dealValue * 0.03 * (rate / 100) * 10
    return {
      perDeal: Math.round(perDeal),
      perYear: Math.round(perDeal * dealsPerYear),
      perMonth: Math.round((perDeal * dealsPerYear) / 12),
    }
  }, [dealValue, dealsPerYear, rate])

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/join"
        keywords={seoKeywords}
        jsonLd={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Join us', path: '/join' },
          ]),
        ]}
      />

      <PageHero
        eyebrow={heroBlock.eyebrow}
        title={heroBlock.title}
        accent={heroBlock.accent}
        description="There are more than 200 informal brokers in Rwanda with genuine local knowledge and nothing behind them — no brand, no documentation, no marketing, no follow-up system. If that is you, this is the offer."
        crumbs={[{ label: 'Join us' }]}
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: '5–10%', label: 'Commission per closed deal' },
          { value: '2h', label: 'Lead response standard' },
          { value: '4', label: 'Ways to join us' },
          { value: '0', label: 'Cost to join' },
        ]}
      />

      {/* ---------------- roles ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={rolesBlock.eyebrow}
            title={rolesBlock.title}
            accent={rolesBlock.accent}
            description="We hire and partner on strength, not convenience. The wrong person in the wrong role destroys deals, reputation and culture — so we are specific about what each of these actually involves."
          />

          {/* role tabs */}
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="mt-12 -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {ROLES.map((r) => {
              const active = r.id === roleId
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoleId(r.id)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-2.5 rounded-full border px-5 py-3 text-[0.9375rem] font-semibold transition-all duration-300',
                    active
                      ? 'border-ink bg-ink text-canvas shadow-soft'
                      : 'border-line bg-surface text-ink-soft hover:-translate-y-0.5 hover:border-ink-faint',
                  )}
                >
                  <Icon
                    name={r.icon}
                    className={cn('size-[1.05rem]', active ? 'text-gold-400' : 'text-gold-600')}
                    strokeWidth={2.1}
                  />
                  {r.title}
                </button>
              )
            })}
          </motion.div>

          {/* role detail */}
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mt-8 grid gap-6 lg:grid-cols-12"
          >
            <div className="lg:col-span-7">
              <div className="h-full rounded-3xl border border-line bg-surface p-8 sm:p-9">
                <p className="text-[0.6875rem] font-bold tracking-[0.2em] text-gold-600 uppercase">
                  {role.subtitle}
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-ink">
                  {role.title}
                </h3>
                <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">{role.who}</p>

                <div className="mt-7 rounded-2xl bg-gold-50 p-5">
                  <p className="text-[0.75rem] font-bold tracking-wide text-gold-700 uppercase">
                    How you earn
                  </p>
                  <p className="mt-1.5 text-[0.9375rem] font-medium text-ink">
                    {role.earning}
                  </p>
                </div>

                <div className="mt-8">
                  <h4 className="text-[0.75rem] font-bold tracking-[0.16em] text-ink-muted uppercase">
                    What you would do
                  </h4>
                  <ul className="mt-4 space-y-3">
                    {role.responsibilities.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-500">
                          <Check className="size-3 text-white" strokeWidth={3.5} />
                        </span>
                        <span className="text-[0.9375rem] leading-relaxed text-ink-soft">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full rounded-3xl border border-line bg-navy-950 p-8 text-white sm:p-9">
                <h4 className="text-[0.75rem] font-bold tracking-[0.16em] text-gold-400 uppercase">
                  What we need from you
                </h4>
                <ul className="mt-5 space-y-4">
                  {role.requirements.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/10">
                        <Check className="size-3 text-gold-400" strokeWidth={3.5} />
                      </span>
                      <span className="text-[0.9375rem] leading-relaxed text-white/70">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-9 border-t border-white/10 pt-7">
                  <h4 className="text-[0.75rem] font-bold tracking-[0.16em] text-white/40 uppercase">
                    What will end it
                  </h4>
                  <ul className="mt-4 space-y-3">
                    {[
                      'Undisclosed double-brokering',
                      'Deposits into a personal account',
                      'Misrepresenting a title',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-red-500/15">
                          <X className="size-3 text-red-400" strokeWidth={3} />
                        </span>
                        <span className="text-[0.875rem] leading-relaxed text-white/55">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  href="#apply"
                  variant="gold"
                  className="mt-8 w-full"
                  trailing={<ArrowRight className="size-[1.05rem]" strokeWidth={2.3} />}
                >
                  Apply for this role
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------- earnings calculator ---------------- */}
      <section className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={calculatorBlock.eyebrow}
            title={calculatorBlock.title}
            accent={calculatorBlock.accent}
            description="Move the sliders to your own reality. This models the agency commission of roughly 3% of transaction value, of which you take your agreed share."
          />

          <div className="mt-14 grid gap-6 lg:grid-cols-12">
            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-5">
              <div className="rounded-3xl border border-line bg-canvas p-7">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="size-5 text-gold-600" strokeWidth={2.2} />
                  <h3 className="font-display text-lg font-semibold text-ink">Your assumptions</h3>
                </div>

                {[
                  {
                    id: 'deal-value',
                    label: 'Average deal value',
                    display: formatCompactCurrency(dealValue),
                    min: 10_000_000,
                    max: 400_000_000,
                    step: 5_000_000,
                    value: dealValue,
                    set: setDealValue,
                    minLabel: 'RWF 10M',
                    maxLabel: 'RWF 400M',
                  },
                  {
                    id: 'deals',
                    label: 'Deals closed per year',
                    display: String(dealsPerYear),
                    min: 1,
                    max: 24,
                    step: 1,
                    value: dealsPerYear,
                    set: setDealsPerYear,
                    minLabel: '1',
                    maxLabel: '24',
                  },
                  {
                    id: 'rate',
                    label: 'Your commission share',
                    display: `${rate}%`,
                    min: 5,
                    max: 10,
                    step: 1,
                    value: rate,
                    set: setRate,
                    minLabel: '5%',
                    maxLabel: '10%',
                  },
                ].map((field) => (
                  <div key={field.id} className="mt-8">
                    <div className="flex items-baseline justify-between gap-3">
                      <label
                        htmlFor={field.id}
                        className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
                      >
                        {field.label}
                      </label>
                      <span className="font-display text-lg font-semibold text-ink">
                        {field.display}
                      </span>
                    </div>
                    <input
                      id={field.id}
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={field.value}
                      onChange={(e) => field.set(Number(e.target.value))}
                      className="mt-4 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-navy-100 accent-gold-500"
                    />
                    <div className="mt-2 flex justify-between text-[0.75rem] text-ink-muted">
                      <span>{field.minLabel}</span>
                      <span>{field.maxLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-7">
              <div className="relative h-full overflow-hidden rounded-3xl bg-navy-950 p-8 text-white sm:p-10">
                <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
                <div className="relative">
                  <p className="text-[0.75rem] font-bold tracking-wide text-white/45 uppercase">
                    Indicative annual commission
                  </p>
                  <p className="mt-4 font-display text-[2.25rem] leading-none font-semibold text-gold-400 sm:text-[2.75rem]">
                    {formatCurrency(earnings.perYear)}
                  </p>

                  <dl className="mt-10 grid gap-6 sm:grid-cols-3">
                    {[
                      { label: 'Per closed deal', value: formatCurrency(earnings.perDeal) },
                      { label: 'Average per month', value: formatCurrency(earnings.perMonth) },
                      { label: 'Deals needed', value: `${dealsPerYear} / year` },
                    ].map((item) => (
                      <div key={item.label} className="border-t border-white/10 pt-5">
                        <dt className="text-[0.75rem] font-semibold tracking-wide text-white/45 uppercase">
                          {item.label}
                        </dt>
                        <dd className="mt-2 font-display text-xl leading-tight font-bold text-white">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-9 text-[0.875rem] leading-relaxed text-white/50">
                    Indicative only, and deliberately not a promise. What you earn depends entirely
                    on how many deals you actually close — but unlike almost every informal broker
                    in Rwanda, you would have marketing, documentation and a brand working for you
                    while you do it.
                  </p>

                  <Button href="#apply" variant="gold" className="mt-8">
                    Apply now
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ---------------- culture ---------------- */}
      <section className="bg-canvas-alt py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-4">
              <motion.div variants={fadeUp}>
                <Eyebrow>Culture rules</Eyebrow>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-ink sm:text-[2.5rem]"
              >
                Five rules.
                <span className="text-gradient-gold"> Non-negotiable.</span>
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[0.9375rem] leading-relaxed text-ink-soft"
              >
                We hire slow and we fire fast. Not because we enjoy it, but because in a business
                built entirely on trust, one person who breaks these costs everybody.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-9">
                <Button href="#apply" variant="primary" size="lg">
                  I'm in — apply
                </Button>
              </motion.div>
            </motion.div>

            <motion.ol
              {...revealProps}
              variants={stagger(0.08)}
              className="lg:col-span-8 lg:pl-4"
            >
              {cultureRules.map((rule, i) => (
                <motion.li
                  key={rule.title}
                  variants={fadeUp}
                  className="flex gap-6 border-b border-line-strong py-6 first:pt-0 last:border-0 last:pb-0"
                >
                  <span className="font-display text-xl font-semibold text-gold-500 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-semibold text-ink">{rule.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {rule.body}
                    </p>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </div>
      </section>

      {/* ---------------- who you'd work with ---------------- */}
      <section className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={colleaguesBlock.eyebrow}
            title={colleaguesBlock.title}
            accent={colleaguesBlock.accent}
            description="You would not be lost in a hierarchy. Each of these people runs a function end to end and reports on it at the monthly board meeting."
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
                className="group overflow-hidden rounded-3xl border border-line bg-canvas transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={agent.photo_url ?? undefined}
                    alt={agent.full_name}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-900 ease-brand group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 to-transparent" />
                  <span className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[0.6875rem] font-bold tracking-wide text-ink uppercase backdrop-blur-sm">
                    {agent.division}
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="font-display text-lg font-semibold text-ink">{agent.full_name}</h3>
                  <p className="mt-1 text-[0.875rem] text-gold-600">{agent.job_title}</p>
                  <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {(agent.specialties ?? []).join(' · ')}
                  </p>
                  <p className="mt-4 border-t border-line pt-4 text-[0.8125rem] text-ink-soft">
                    <Counter value={agent.deals_closed} /> deals · speaks {(agent.languages ?? []).length}{' '}
                    languages
                  </p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- application ---------------- */}
      <section id="apply" className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 right-0 size-[32rem] rounded-full bg-gold-500/10 blur-[130px]"
        />

        <div className="container-page relative">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <motion.div {...revealProps} variants={stagger(0.09)} className="lg:col-span-5">
              <motion.div variants={fadeUp}>
                <Eyebrow tone="light">Apply</Eyebrow>
              </motion.div>
              <motion.h2
                variants={fadeUp}
                className="mt-5 text-[1.75rem] leading-[1.15] font-semibold text-white sm:text-[2.125rem]"
              >
                Tell us what you bring.
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[0.9375rem] leading-relaxed text-white/65"
              >
                We read every application. If there is a fit you will hear from us within five
                working days — and if there is not, we will tell you that too rather than leave you
                waiting.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-9">
                <div className="flex items-start gap-4 rounded-3xl border border-gold-500/25 bg-gold-500/10 p-6">
                  <Quote className="mt-0.5 size-6 shrink-0 text-gold-400" strokeWidth={2} />
                  <p className="text-[0.9375rem] leading-relaxed text-white/75">
                    "Hire slow, fire fast. The wrong person in the wrong role will destroy deals,
                    reputation and culture."
                    <span className="mt-2 block text-[0.8125rem] text-white/45">
                      — Evaramu Group Ltd, Business Plan 2025–2028
                    </span>
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div {...revealProps} variants={fadeUp} className="lg:col-span-7">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm sm:p-9">
                {applied ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <span className="grid size-16 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-8" strokeWidth={2.6} />
                    </span>
                    <h3 className="mt-6 font-display text-xl font-semibold text-white">
                      Application received
                    </h3>
                    <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-white/60">
                      Thank you. We read every one. If there is a fit, you will hear from us within
                      five working days.
                    </p>
                    <Button
                      onClick={() => setApplied(false)}
                      variant="outline-light"
                      className="mt-7"
                    >
                      Submit another
                    </Button>
                  </div>
                ) : (
                  <form
                    className="space-y-5"
                    onSubmit={apply}
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <DarkField id="a-name" label="Full name" required value={form.full_name} onChange={set('full_name')} />
                      <DarkField id="a-phone" label="Phone or WhatsApp" type="tel" required value={form.phone} onChange={set('phone')} />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <DarkField id="a-email" label="Email" type="email" required value={form.email} onChange={set('email')} />
                      <div>
                        <label
                          htmlFor="a-role"
                          className="mb-2 block text-[0.75rem] font-bold tracking-wide text-white/45 uppercase"
                        >
                          Applying as
                        </label>
                        <select
                          id="a-role"
                          value={roleId}
                          onChange={(e) => setRoleId(e.target.value as RoleId)}
                          className="h-12 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-[0.9375rem] text-white transition-colors focus:border-gold-500 focus:outline-none [&>option]:bg-navy-900"
                        >
                          {ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <DarkField id="a-area" label="Area or sector you cover" value={form.area_covered} onChange={set('area_covered')} />
                      <DarkField id="a-years" label="Years of experience" type="number" value={form.years_experience} onChange={set('years_experience')} />
                    </div>

                    <div>
                      <label
                        htmlFor="a-about"
                        className="mb-2 block text-[0.75rem] font-bold tracking-wide text-white/45 uppercase"
                      >
                        What would you bring us?
                      </label>
                      <textarea
                        id="a-about"
                        rows={4}
                        required
                        value={form.pitch}
                        onChange={(e) => set('pitch')(e.target.value)}
                        placeholder="Your network, the deals you have done, the work you are proud of. Be specific — vague applications do not get read twice."
                        className="w-full resize-y rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-[0.9375rem] text-white transition-colors placeholder:text-white/30 focus:border-gold-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="a-portfolio"
                        className="mb-2 block text-[0.75rem] font-bold tracking-wide text-white/45 uppercase"
                      >
                        Link to work, CV or portfolio (optional)
                      </label>
                      <input
                        id="a-portfolio"
                        type="url"
                        value={form.portfolio_url}
                        onChange={(e) => set('portfolio_url')(e.target.value)}
                        placeholder="https://…"
                        className="h-12 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-[0.9375rem] text-white transition-colors placeholder:text-white/30 focus:border-gold-500 focus:outline-none"
                      />
                    </div>

                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        required
                        className="mt-1 size-4 shrink-0 accent-gold-500"
                      />
                      <span className="text-[0.875rem] leading-relaxed text-white/60">
                        I have read the culture rules above and I am comfortable working to them,
                        including documenting every deal and responding to leads within two hours.
                      </span>
                    </label>

                    <div className="rounded-2xl border border-white/15 bg-white/5 p-4 [&_input]:border-white/15 [&_input]:bg-white/5 [&_input]:text-white [&_label]:text-white/45">
                      <Captcha value={captcha} onChange={setCaptcha} scope="application" compact />
                    </div>

                    {error && (
                      <p
                        role="alert"
                        className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[0.875rem] text-red-200"
                      >
                        {error}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="gold"
                      size="lg"
                      className="w-full"
                      disabled={sending}
                      trailing={<Send className="size-[1.05rem]" strokeWidth={2.2} />}
                    >
                      {sending ? 'Submitting…' : 'Submit application'}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        eyebrow="Before you apply"
        title="The questions"
        accent="everybody asks."
        description="Licensing, pay structures, timing and what would rule you out."
      />
    </>
  )
}

/** Input styled for the dark application panel. */
function DarkField({
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
        className="mb-2 block text-[0.75rem] font-bold tracking-wide text-white/45 uppercase"
      >
        {label}
        {required && <span className="ml-1 text-gold-400">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-12 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-[0.9375rem] text-white transition-colors focus:border-gold-500 focus:outline-none"
      />
    </div>
  )
}
