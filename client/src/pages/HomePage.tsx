import { Seo, faqJsonLd } from '@/components/Seo'
import { Hero } from '@/components/sections/Hero'
import { MarketStats } from '@/components/sections/MarketStats'
import { ServicesGrid } from '@/components/sections/ServicesGrid'
import { FeaturedProperties } from '@/components/sections/FeaturedProperties'
import { WealthCycleSection } from '@/components/sections/WealthCycleSection'
import { WhyEvaramu } from '@/components/sections/WhyEvaramu'
import { ConstructionPreview } from '@/components/sections/ConstructionPreview'
import { DiasporaSection } from '@/components/sections/DiasporaSection'
import { Testimonials } from '@/components/sections/Testimonials'
import { JoinTeaser } from '@/components/sections/JoinTeaser'
import { InsightsPreview } from '@/components/sections/InsightsPreview'
import { FaqSection } from '@/components/sections/FaqSection'
import { useBlock, useQuery } from '@/lib/queries'
import { useSite } from '@/lib/siteConfig'
import type { ApiFaq } from '@/types/api'

export default function HomePage() {
  const seo = useBlock('home', 'seo', {
    title: "Evaramu Group Ltd — Real Estate, Construction & Property Wealth in Kigali",
    body: "Buy verified land and property in Rwanda, build with our construction division, earn rental income and grow from one property to a portfolio. Every title verified at NLA. Book a free consultation.",
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const site = useSite()
  const { data: faqData } = useQuery<ApiFaq[]>('/public/faqs?page=home')
  const faqs = faqData ?? []

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${site.url}/properties?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <Seo
        title={seo.title}
        description={seo.body ?? ''}
        path="/"
        keywords={seoKeywords}
        jsonLd={[websiteJsonLd, faqJsonLd(faqs)]}
      />

      <Hero />
      <MarketStats />
      <ServicesGrid />
      <FeaturedProperties />
      <WealthCycleSection />
      <WhyEvaramu />
      <ConstructionPreview />
      <DiasporaSection />
      <Testimonials />
      <JoinTeaser />
      <InsightsPreview />
      <FaqSection faqs={faqs} />
    </>
  )
}
