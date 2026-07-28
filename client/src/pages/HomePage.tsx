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
import { HOME_FAQS } from '@/data/content'
import { SITE } from '@/data/site'

export default function HomePage() {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/properties?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <>
      <Seo
        title="Evaramu Group Ltd — Real Estate, Construction & Property Wealth in Kigali"
        description="Buy verified land and property in Rwanda, build with our construction division, earn rental income and grow from one property to a portfolio. Every title verified at RLA. Book a free consultation."
        path="/"
        keywords={[
          'Evaramu Group Ltd',
          'wealth cycle Rwanda',
          'verified land Kigali',
          'Kigali property investment',
          'build wealth through property Rwanda',
        ]}
        jsonLd={[websiteJsonLd, faqJsonLd(HOME_FAQS)]}
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
      <FaqSection faqs={HOME_FAQS} />
    </>
  )
}
