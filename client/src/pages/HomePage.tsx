import { Seo } from '@/components/Seo'
import { Hero } from '@/components/sections/Hero'
import { ServicesGrid } from '@/components/sections/ServicesGrid'
import { FeaturedProperties } from '@/components/sections/FeaturedProperties'
import { WhyEvaramu } from '@/components/sections/WhyEvaramu'
import { useBlock } from '@/lib/queries'
import { useSite } from '@/lib/siteConfig'

/**
 * The front door, not the whole house.
 *
 * Four things, in the order a visitor needs them: what this is, what is for
 * sale, what else we do, why us. Everything that used to follow — market
 * statistics, testimonials, the wealth cycle, diaspora, construction, careers,
 * articles, FAQs — has its own page reached from the navigation. Stacked here it
 * made the homepage six screens tall and buried the listings under claims a
 * visitor had no way to check.
 */
export default function HomePage() {
  const seo = useBlock('home', 'seo', {
    title: 'Evaramu Group Ltd — Real Estate & Construction in Kigali',
    body: 'Land, houses and commercial property in Rwanda, with titles checked at the National Land Authority before listing. Build with our construction division. Book a consultation.',
  })
  const seoKeywords = (seo.items as { text: string }[]).map((k) => k.text)
  const site = useSite()

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
        jsonLd={[websiteJsonLd]}
      />

      <Hero />
      <FeaturedProperties />
      <ServicesGrid />
      <WhyEvaramu />
    </>
  )
}
