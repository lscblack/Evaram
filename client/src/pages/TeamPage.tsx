import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Mail, Phone } from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { SocialIcon } from '@/components/ui/SocialIcon'
import { useBlock, useQuery } from '@/lib/queries'
import type { ApiTeamMember } from '@/types/api'
import { useT } from '@/lib/i18n'
import { fadeUp, revealProps, stagger } from '@/lib/motion'
import { useSite } from '@/lib/siteConfig'
import { cn } from '@/lib/utils'

const DIVISIONS = ['All', 'Realty', 'Construction', 'Group'] as const
type Division = (typeof DIVISIONS)[number]

const DIVISION_BLURB: Record<string, string> = {
  Realty: 'Sourcing, listings, negotiation, diaspora clients and the Wealth Cycle.',
  Construction: 'Supervised builds, renovation, cost control and site quality.',
  Group: 'Title verification, finance, documentation and content.',
}

export default function TeamPage() {
  const seo = useBlock('team', 'seo', {
    title: "Our Team — The People Behind Evaramu",
    body: "Meet the Evaramu Group Ltd team in Kigali: property consultants, diaspora relations, construction supervisors, title officers and finance. Every person owns a function end to end.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const heroBlock = useBlock('team', 'hero', {
    title: "Small team.",
    accent: "Everyone owns something.",
    body: "We hire slow and place people on strength, not convenience. Nobody here is buried in a hierarchy — each of these people runs a function end to end and reports on it at the monthly board meeting.",
  })
  const howWeHireBlock = useBlock('team', 'how_we_hire', {
    eyebrow: "How we hire",
    title: "Hire slow.",
    accent: "Fire fast.",
    body: "Not because we enjoy it, but because in a business built entirely on trust, one person in the wrong seat costs everybody.",
  })
  const site = useSite()
  const t = useT()
  const [division, setDivision] = useState<Division>('All')

  const { data } = useQuery<ApiTeamMember[]>('/public/team')
  const team = useMemo(() => data ?? [], [data])

  const people = useMemo(
    () => (division === 'All' ? team : team.filter((a) => a.division === division)),
    [division, team],
  )

  const totalDeals = team.reduce((n, a) => n + a.deals_closed, 0)
  const languages = new Set(team.flatMap((a) => a.languages ?? []))

  const teamJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    url: `${site.url}/team`,
    employee: team.map((a) => ({
      '@type': 'Person',
      name: a.full_name,
      jobTitle: a.job_title,
      email: a.email,
      telephone: a.phone,
      knowsLanguage: a.languages,
      worksFor: { '@type': 'Organization', name: site.name },
    })),
  }

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/team"
        keywords={seoKeywords}
        jsonLd={[
          teamJsonLd,
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Our Team', path: '/team' },
          ]),
        ]}
      />

      <PageHero
        eyebrow={t('team.title')}
        title={heroBlock.title}
        accent={heroBlock.accent}
        description="We hire slow and place people on strength, not convenience. Nobody here is buried in a hierarchy — each of these people runs a function end to end and reports on it at the monthly board meeting."
        crumbs={[{ label: t('team.title') }]}
        image="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: String(team.length), label: 'People across the group' },
          { value: `${totalDeals}+`, label: 'Transactions handled' },
          { value: String(languages.size), label: 'Languages spoken' },
          { value: '2h', label: 'Lead response standard' },
        ]}
      />

      {/* ---------------- roster ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          {/* division filter */}
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between"
          >
            <div>
              <Eyebrow>{t('nav.team')}</Eyebrow>
              <h2 className="mt-4 font-display text-[1.75rem] leading-tight font-semibold text-ink sm:text-[2rem]">
                {division === 'All' ? 'Everyone at Evaramu' : `Evaramu ${division}`}
              </h2>
              {division !== 'All' && (
                <p className="mt-2 max-w-xl text-[0.9375rem] text-ink-muted">
                  {DIVISION_BLURB[division]}
                </p>
              )}
            </div>

            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
              {DIVISIONS.map((d) => {
                const count = d === 'All' ? team.length : team.filter((a) => a.division === d).length
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDivision(d)}
                    aria-pressed={division === d}
                    className={cn(
                      'shrink-0 rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors duration-300',
                      division === d
                        ? 'border-ink bg-ink text-canvas'
                        : 'border-line text-ink-soft hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {d === 'All' ? t('prop.all') : d}
                    <span className="ml-1.5 opacity-50">{count}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* people grid */}
          <motion.ul
            key={division}
            initial="hidden"
            animate="show"
            variants={stagger(0.06)}
            className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {people.map((person) => (
              <motion.li key={person.id} variants={fadeUp} className="group">
                {/* portrait */}
                <div className="relative overflow-hidden rounded-2xl bg-canvas-alt">
                  <img
                    src={person.photo_url ?? undefined}
                    alt={person.full_name}
                    loading="lazy"
                    className="aspect-4/5 w-full object-cover grayscale transition-all duration-700 ease-brand group-hover:scale-[1.03] group-hover:grayscale-0"
                  />

                  {/* contact strip slides up on hover */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-ink/90 px-4 py-3 backdrop-blur-sm transition-transform duration-400 ease-brand group-hover:translate-y-0 group-focus-within:translate-y-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${(person.phone ?? '').replace(/\s/g, '')}`}
                        aria-label={`${t('team.call')} ${person.full_name}`}
                        className="grid size-8 place-items-center rounded-full bg-canvas/15 text-canvas transition-colors hover:bg-gold-500 hover:text-white"
                      >
                        <Phone className="size-3.5" strokeWidth={2.2} />
                      </a>
                      <a
                        href={`mailto:${person.email}`}
                        aria-label={`${t('team.email')} ${person.full_name}`}
                        className="grid size-8 place-items-center rounded-full bg-canvas/15 text-canvas transition-colors hover:bg-gold-500 hover:text-white"
                      >
                        <Mail className="size-3.5" strokeWidth={2.2} />
                      </a>
                      {person.linkedin_url && (
                        <a
                          href={person.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${person.full_name} on LinkedIn`}
                          className="grid size-8 place-items-center rounded-full bg-canvas/15 text-canvas transition-colors hover:bg-gold-500 hover:text-white"
                        >
                          <SocialIcon name="Linkedin" className="size-3.5" />
                        </a>
                      )}
                      <span className="ml-auto text-[0.75rem] text-canvas/60">
                        {t('common.from')} {person.joined_year}
                      </span>
                    </div>
                  </div>
                </div>

                {/* details */}
                <div className="mt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-lg leading-tight font-semibold text-ink">
                      {person.full_name}
                    </h3>
                    <span className="shrink-0 text-[0.6875rem] font-semibold tracking-wide text-ink-faint uppercase">
                      {person.division}
                    </span>
                  </div>

                  <p className="mt-1 text-[0.875rem] font-medium text-gold-600">{person.job_title}</p>

                  <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-muted">
                    {person.bio}
                  </p>

                  <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-[0.8125rem]">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-faint">{t('team.specialties')}</dt>
                      <dd className="text-ink-soft">{(person.specialties ?? []).join(', ')}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-faint">Covers</dt>
                      <dd className="text-ink-soft">{(person.covers ?? []).join(', ')}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-faint">{t('team.speaks')}</dt>
                      <dd className="text-ink-soft">{(person.languages ?? []).join(', ')}</dd>
                    </div>
                    {person.deals_closed > 0 && (
                      <div className="flex gap-2">
                        <dt className="w-20 shrink-0 text-ink-faint">Record</dt>
                        <dd className="text-ink-soft">
                          {person.deals_closed} {t('team.deals')} · {person.rating}/5
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* ---------------- how we hire ---------------- */}
      <section className="border-y border-line bg-canvas-alt py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={howWeHireBlock.eyebrow}
            title={howWeHireBlock.title}
            accent={howWeHireBlock.accent}
            description="Not because we enjoy it, but because in a business built entirely on trust, one person in the wrong seat costs everybody."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.07)}
            className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                title: 'Placed on strength',
                body: 'People are put where they are naturally strong — never where it is convenient for the org chart.',
              },
              {
                title: 'Measured on outcomes',
                body: 'Every role owns a function and reports on it monthly. Nobody is graded on how busy they looked.',
              },
              {
                title: 'Documented, always',
                body: 'No verbal-only agreements, inside or outside the company. If it is not written down, it did not happen.',
              },
              {
                title: 'Trust is the product',
                body: 'Undisclosed double-brokering, personal-account deposits or misrepresenting a title end a career here.',
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="bg-surface p-7">
                <h3 className="font-display text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- join CTA ---------------- */}
      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="flex flex-col items-start justify-between gap-8 rounded-3xl border border-line bg-surface p-8 sm:p-10 lg:flex-row lg:items-center"
          >
            <div className="max-w-2xl">
              <Eyebrow>Open roles</Eyebrow>
              <h2 className="mt-4 font-display text-[1.75rem] leading-tight font-semibold text-ink sm:text-[2.125rem]">
                There is room for one more good person.
              </h2>
              <p className="mt-3 text-[1rem] leading-relaxed text-ink-muted">
                Commission agents, independent brokers, vetted sub-contractors and full-time roles
                across both divisions. Bring your network to a company with systems behind it.
              </p>
            </div>
            <Button
              to="/join"
              variant="gold"
              size="lg"
              className="shrink-0"
              trailing={
                <ArrowUpRight
                  className="size-[1.05rem] transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
                  strokeWidth={2.3}
                />
              }
            >
              {t('cta.applyNow')}
            </Button>
          </motion.div>
        </div>
      </section>
    </>
  )
}
