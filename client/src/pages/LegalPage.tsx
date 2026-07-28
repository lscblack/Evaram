import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, ShieldCheck } from 'lucide-react'
import { Seo, breadcrumbJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { Button } from '@/components/ui/Button'
import { SITE } from '@/data/site'
import { fadeUp, revealProps, stagger } from '@/lib/motion'

interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

interface LegalDoc {
  title: string
  accent: string
  eyebrow: string
  intro: string
  updated: string
  sections: LegalSection[]
}

const PRIVACY: LegalDoc = {
  eyebrow: 'Privacy',
  title: 'What we collect, and',
  accent: 'what we do with it.',
  intro:
    'Evaramu Group Ltd collects personal information in order to advise you on property, verify titles and complete transactions. This page explains exactly what we hold, why, and what you can ask us to do about it.',
  updated: '28 July 2026',
  sections: [
    {
      heading: 'Information we collect',
      paragraphs: [
        'We only collect what we need to do the job you have asked us to do.',
      ],
      bullets: [
        'Contact details you give us — name, phone number, email address and where you are based.',
        'Property information you submit when listing, including the UPI, parcel details and asking price.',
        'Transaction records: contracts, receipts, payment references and correspondence.',
        'Basic analytics about how this website is used, so we can improve it.',
      ],
    },
    {
      heading: 'Why we hold it',
      bullets: [
        'To respond to your enquiry and give you accurate advice.',
        'To verify land titles with the Rwanda Land Authority on your behalf.',
        'To prepare contracts, invoices and receipts, and to meet our record-keeping obligations.',
        'To send you the monthly Kigali Market Report, if and only if you asked for it.',
      ],
    },
    {
      heading: 'Who we share it with',
      paragraphs: [
        'We do not sell your personal information to anyone, ever. We share it only where it is necessary to complete work you have instructed us to do — for example with the Rwanda Land Authority when verifying a title, with retained legal counsel when preparing a contract, or with a sub-contractor who needs site access details.',
        'Every party we share information with is bound to use it only for that purpose.',
      ],
    },
    {
      heading: 'How we protect it',
      bullets: [
        'Access to client records is limited to the team members working on your matter.',
        'Company accounts use two-factor authentication.',
        'Payment instructions are never sent by unverified channels, and we will never ask you to send funds to a personal account.',
        'Documents are retained for as long as Rwandan law requires, then securely destroyed.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can ask us at any time what information we hold about you, ask us to correct anything inaccurate, ask us to delete anything we are not legally obliged to keep, or withdraw consent to marketing. Write to us and we will action it within 30 days.',
      ],
    },
    {
      heading: 'Cookies',
      paragraphs: [
        'This website uses only the cookies necessary to make it work and to understand aggregate usage. We do not run third-party advertising trackers on this site.',
      ],
    },
  ],
}

const TERMS: LegalDoc = {
  eyebrow: 'Terms',
  title: 'The rules we work by,',
  accent: 'written down.',
  intro:
    'These terms govern your use of this website and the services provided by Evaramu Group Ltd, a private limited company registered in Rwanda under the Rwanda Development Board.',
  updated: '28 July 2026',
  sections: [
    {
      heading: 'About the listings on this site',
      paragraphs: [
        'Every property listed here has been checked against its Unique Parcel Identifier at the Rwanda Land Authority before publication. However, listings are marketing material, not a warranty of title.',
        'Before completing any transaction we re-run the title search within 30 days and share the result with you in writing. Prices, availability and specifications are indicative and may change without notice.',
      ],
    },
    {
      heading: 'Engaging us',
      bullets: [
        'No agency relationship exists until a written engagement is signed by both parties.',
        'Commission is agreed in writing before work begins and is earned on completion of the transaction, not on introduction.',
        'Construction work is carried out under a separate fixed-price contract with a stated contingency and a milestone payment schedule.',
        'Property management is provided under a separate management agreement at 10% of rent collected.',
      ],
    },
    {
      heading: 'Payments',
      paragraphs: [
        'All payments to Evaramu Group Ltd are made to our registered company bank account and receipted the same day. We will never ask you to send funds to an individual’s personal or mobile money account.',
        'If anyone claiming to represent us asks you to do so, stop and contact us directly on the number published on this site.',
      ],
    },
    {
      heading: 'Estimates and projections',
      paragraphs: [
        'The calculators on this website — including the Wealth Cycle projection, the construction estimator and the commission calculator — are indicative models, not guarantees. Actual outcomes depend on the specific parcel, the build specification, tenant demand and market conditions at the time.',
        'Nothing on this website constitutes financial, legal or tax advice. For contentious matters we will tell you plainly that you need your own lawyer.',
      ],
    },
    {
      heading: 'Your obligations',
      bullets: [
        'Information you give us about a property must be accurate to the best of your knowledge.',
        'If you list a property you must be the registered owner or hold a written mandate from them.',
        'You agree to us verifying any title you present to us at the Rwanda Land Authority.',
      ],
    },
    {
      heading: 'Liability',
      paragraphs: [
        'We take responsibility for our own work, including a written workmanship warranty on every construction project. We are not liable for losses arising from information supplied to us that turns out to be false, or from decisions you take against our written advice.',
      ],
    },
    {
      heading: 'Governing law',
      paragraphs: [
        'These terms are governed by the laws of the Republic of Rwanda, and any dispute falls to the jurisdiction of the Rwandan courts.',
      ],
    },
  ],
}

export default function LegalPage() {
  const { pathname } = useLocation()
  const isPrivacy = pathname.startsWith('/privacy')
  const doc = isPrivacy ? PRIVACY : TERMS

  return (
    <>
      <Seo
        title={isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        description={doc.intro}
        path={isPrivacy ? '/privacy' : '/terms'}
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          {
            name: isPrivacy ? 'Privacy' : 'Terms',
            path: isPrivacy ? '/privacy' : '/terms',
          },
        ])}
      />

      <PageHero
        eyebrow={doc.eyebrow}
        title={doc.title}
        accent={doc.accent}
        description={doc.intro}
        crumbs={[{ label: isPrivacy ? 'Privacy' : 'Terms' }]}
        compact
      />

      <section className="bg-canvas py-16 lg:py-24">
        <div className="container-page">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            {/* contents */}
            <aside className="lg:col-span-4">
              <div className="sticky top-24 space-y-5">
                <div className="rounded-3xl border border-line bg-surface p-7">
                  <p className="text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
                    On this page
                  </p>
                  <ol className="mt-4 space-y-2.5">
                    {doc.sections.map((section, i) => (
                      <li key={section.heading} className="flex items-start gap-3">
                        <span className="mt-0.5 font-display text-[0.8125rem] font-bold text-gold-500 tabular-nums">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <a
                          href={`#s-${i}`}
                          className="text-[0.9375rem] leading-snug text-ink-soft transition-colors hover:text-gold-600"
                        >
                          {section.heading}
                        </a>
                      </li>
                    ))}
                  </ol>

                  <p className="mt-6 border-t border-line pt-5 text-[0.8125rem] text-ink-muted">
                    Last updated {doc.updated}
                  </p>
                </div>

                <div className="rounded-3xl border border-line bg-surface p-7">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="size-5 text-emerald-600" strokeWidth={2.2} />
                    <p className="font-display text-[1.0625rem] font-semibold text-ink">
                      Questions about this?
                    </p>
                  </div>
                  <p className="mt-2.5 text-[0.875rem] leading-relaxed text-ink-soft">
                    Write to us and a person will answer — not a template.
                  </p>
                  <Button
                    href={`mailto:${SITE.email}`}
                    variant="outline"
                    className="mt-5 w-full"
                    leading={<Mail className="size-[1.05rem]" strokeWidth={2.2} />}
                  >
                    {SITE.email}
                  </Button>
                </div>
              </div>
            </aside>

            {/* body */}
            <motion.div
              {...revealProps}
              variants={stagger(0.06)}
              className="lg:col-span-8"
            >
              <div className="rounded-3xl border border-line bg-surface p-7 sm:p-10">
                {doc.sections.map((section, i) => (
                  <motion.section
                    key={section.heading}
                    id={`s-${i}`}
                    variants={fadeUp}
                    className="scroll-mt-36 border-b border-line pb-9 last:border-0 last:pb-0 [&+section]:pt-9"
                  >
                    <h2 className="font-display text-[1.5rem] leading-snug font-bold text-ink sm:text-[1.75rem]">
                      <span className="mr-3 text-gold-500 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {section.heading}
                    </h2>

                    {section.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="mt-4 text-[1rem] leading-[1.75] text-ink-soft"
                      >
                        {paragraph}
                      </p>
                    ))}

                    {section.bullets && (
                      <ul className="mt-5 space-y-3">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-3.5">
                            <span
                              aria-hidden
                              className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold-500"
                            />
                            <span className="text-[0.9375rem] leading-relaxed text-ink-soft">
                              {bullet}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.section>
                ))}
              </div>

              <p className="mt-6 text-[0.875rem] leading-relaxed text-ink-muted">
                {SITE.name} · {SITE.rdb} · {SITE.address}
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
