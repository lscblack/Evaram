import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Handshake } from 'lucide-react'
import { Seo, breadcrumbJsonLd, faqJsonLd } from '@/components/Seo'
import { PageHero } from '@/components/layout/PageHero'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { FaqSection } from '@/components/sections/FaqSection'
import { SellerIntakeForm } from '@/components/ui/SellerIntakeForm'
import type { ApiCategory, ApiFaq } from '@/types/api'
import { useBlockItems, useBlock, useQuery } from '@/lib/queries'

import { fadeUp, revealProps, stagger } from '@/lib/motion'



/** Fallback for `sell` → `why_list_items` — the shipped copy. */
const WHY_LIST_FALLBACK: { body: string; icon: string; title: string }[] = [
  {
    icon: 'Camera',
    title: 'Marketed properly',
    body: 'Drone video, professional photography and a mapped online listing — instead of phone snapshots in a WhatsApp group.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Buyers qualified first',
    body: 'We check that a buyer can actually fund the purchase before they set foot on your property. Fewer viewings, better ones.',
  },
  {
    icon: 'FileCheck2',
    title: 'Documented throughout',
    body: 'Digital contracts, receipts for every payment and a written record of every offer. No verbal deals, no disputes.',
  },
  {
    icon: 'Handshake',
    title: 'Commission in writing',
    body: 'Agreed before any work begins and only earned when the sale completes. You are never billed for marketing that did not sell.',
  },
]

export default function SellPage() {
  const seo = useBlock('sell', 'seo', {
    title: "Sell or List Your Property in Rwanda",
    body: "List your land, house or commercial property with Evaramu. Free valuation, drone video and professional photography included, buyers qualified before viewing, and commission agreed in writing before we start.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const whyList = useBlockItems(
    'sell',
    'why_list_items',
    WHY_LIST_FALLBACK,
  )
  const heroBlock = useBlock('sell', 'hero', {
    eyebrow: "Sell with Evaramu",
    title: "Your property deserves better than",
    accent: "a blurry photo in a group chat.",
    body: "Tell us about it below and we will come back within two working hours with a valuation appointment. No listing fee, no exclusivity trap, and commission agreed in writing before anything begins.",
  })
  const whyListBlock = useBlock('sell', 'why_list', {
    eyebrow: "Why list with us",
    title: "Professionalism is the",
    accent: "entire differentiator.",
    body: "There are more than 200 informal brokers in Rwanda. What almost none of them offer is documentation, marketing that works and a buyer who has actually been qualified.",
  })
  const listFormBlock = useBlock('sell', 'list_form', {
    eyebrow: "List your property",
    title: "Tell us about it.",
    accent: "We do the rest.",
    body: "A consultant visits, verifies the title at the Land Authority, and writes the listing with you — which is why every reference number and UPI on our marketplace can be trusted.",
  })
  const afterSubmitBlock = useBlock('sell', 'after_submit', {
    eyebrow: "After you submit",
    title: "What actually happens",
    accent: "next.",
  })
  const { data: faqData } = useQuery<ApiFaq[]>('/public/faqs?page=sell')
  const faqs = faqData ?? []

  const { data: taxonomy } = useQuery<ApiCategory[]>('/public/taxonomy')
  const categories = useMemo(() => taxonomy ?? [], [taxonomy])

  const totalForms = categories.reduce((n, c) => n + c.subcategories.length, 0)

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/sell"
        keywords={seoKeywords}
        jsonLd={[
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Sell a property', path: '/sell' },
          ]),
        ]}
      />

      <PageHero
        eyebrow={heroBlock.eyebrow}
        title={heroBlock.title}
        accent={heroBlock.accent}
        description="Tell us about it below and we will come back within two working hours with a valuation appointment. No listing fee, no exclusivity trap, and commission agreed in writing before anything begins."
        crumbs={[{ label: 'Sell a property' }]}
        image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=2000&q=80"
        stats={[
          { value: 'Free', label: 'Valuation and marketing' },
          { value: `${totalForms}`, label: 'Property types we handle' },
          { value: '2h', label: 'Response to every submission' },
          { value: '0', label: 'Upfront cost to you' },
        ]}
      />

      {/* ---------------- why list with us ---------------- */}
      <section className="bg-canvas py-16 lg:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow={whyListBlock.eyebrow}
            title={whyListBlock.title}
            accent={whyListBlock.accent}
            description="There are more than 200 informal brokers in Rwanda. What almost none of them offer is documentation, marketing that works and a buyer who has actually been qualified."
          />

          <motion.div
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {whyList.map((item) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className="group rounded-3xl border border-line bg-surface p-7 transition-all duration-500 ease-brand hover:-translate-y-1.5 hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-gold-400 transition-colors duration-500 group-hover:bg-gold-500 group-hover:text-white">
                  <Icon name={item.icon} className="size-[1.35rem]" strokeWidth={2} />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-ink">{item.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{item.body}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------------- listing wizard ---------------- */}
      <section id="list" className="bg-surface py-16 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow={listFormBlock.eyebrow}
            title={listFormBlock.title}
            accent={listFormBlock.accent}
            description={listFormBlock.body}
            align="center"
          />

          <motion.div
            {...revealProps}
            variants={fadeUp}
            className="mx-auto mt-12 max-w-3xl"
          >
            <SellerIntakeForm />
          </motion.div>
        </div>
      </section>

      {/* ---------------- what happens next ---------------- */}
      <section className="relative overflow-hidden bg-navy-950 py-20 text-white lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-blueprint opacity-60" />
        <div className="container-page relative">
          <SectionHeading
            tone="light"
            eyebrow={afterSubmitBlock.eyebrow}
            title={afterSubmitBlock.title}
            accent={afterSubmitBlock.accent}
          />

          <motion.ol
            {...revealProps}
            variants={stagger(0.08)}
            className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              {
                step: '01',
                title: 'We call within 2 hours',
                body: 'A consultant confirms the details and books the valuation visit.',
              },
              {
                step: '02',
                title: 'Title search at NLA',
                body: 'We verify the UPI and the registered owner before anything is published.',
              },
              {
                step: '03',
                title: 'Valuation & photography',
                body: 'We price it against real comparable sales, then shoot it properly.',
              },
              {
                step: '04',
                title: 'Listed and marketed',
                body: 'Live on the platform, pushed across our channels, buyers qualified before viewing.',
              },
            ].map((item) => (
              <motion.li
                key={item.step}
                variants={fadeUp}
                className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm"
              >
                <span className="font-display text-2xl font-semibold text-gold-400">{item.step}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-white/60">{item.body}</p>
              </motion.li>
            ))}
          </motion.ol>

          <motion.div {...revealProps} variants={fadeUp} className="mt-12">
            <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-gold-500/25 bg-gold-500/10 p-8 lg:flex-row lg:items-center">
              <div className="flex items-start gap-4">
                <Handshake className="mt-0.5 size-6 shrink-0 text-gold-400" strokeWidth={2} />
                <div className="max-w-2xl">
                  <h3 className="font-display text-lg font-semibold text-white">
                    Selling to reinvest, not to cash out?
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/65">
                    Tell your consultant. Selling at the right moment and redirecting the proceeds
                    into two or three properties is step five of the Wealth Cycle — and it is
                    where most of our clients' growth actually comes from.
                  </p>
                </div>
              </div>
              <Button to="/wealth-cycle" variant="gold" className="shrink-0">
                See the cycle
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        eyebrow="Seller questions"
        title="What sellers ask"
        accent="before they list."
        description="Fees, timelines, titles and what happens if you change your mind."
      />
    </>
  )
}


