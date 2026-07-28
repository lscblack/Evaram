import { SITE } from '@/data/site'

export interface SeoProps {
  title: string
  description: string
  /** Path only, e.g. `/properties`. Combined with SITE.url for the canonical. */
  path?: string
  image?: string
  /** `website` for landing pages, `article` for insights posts. */
  type?: 'website' | 'article' | 'product'
  keywords?: string[]
  noIndex?: boolean
  /** Additional JSON-LD blocks appended after the default Organization graph. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  publishedTime?: string
  author?: string
}

const DEFAULT_IMAGE = `${SITE.url}/brand/logo-horizontal.png`

const BASE_KEYWORDS = [
  'real estate Rwanda',
  'land for sale Kigali',
  'property for sale Rwanda',
  'houses for sale Kigali',
  'buy land Rwanda',
  'construction company Kigali',
  'property management Rwanda',
  'diaspora property investment Rwanda',
  'Evaramu Group',
]

/**
 * Document metadata for a page.
 *
 * Relies on React 19's native support for hoisting `<title>`, `<meta>` and
 * `<link>` out of the component tree into `<head>` — no helmet needed.
 */
export function Seo({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  type = 'website',
  keywords = [],
  noIndex = false,
  jsonLd,
  publishedTime,
  author,
}: SeoProps) {
  const fullTitle = title.includes(SITE.shortName) ? title : `${title} | ${SITE.name}`
  const canonical = `${SITE.url}${path === '/' ? '' : path}`
  const allKeywords = [...new Set([...keywords, ...BASE_KEYWORDS])].join(', ')

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE.url}#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: DEFAULT_IMAGE,
    image: DEFAULT_IMAGE,
    description: SITE.description,
    slogan: SITE.tagline,
    foundingDate: SITE.founded,
    email: SITE.email,
    telephone: SITE.phone,
    priceRange: 'RWF',
    areaServed: [
      { '@type': 'City', name: 'Kigali' },
      { '@type': 'Country', name: 'Rwanda' },
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'KG 11 Ave, Kimihurura',
      addressLocality: 'Kigali',
      addressRegion: 'Gasabo District',
      addressCountry: 'RW',
    },
    geo: { '@type': 'GeoCoordinates', latitude: -1.9441, longitude: 30.0619 },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '09:00',
        closes: '14:00',
      },
    ],
    sameAs: [
      'https://instagram.com/evaramugroup',
      'https://facebook.com/evaramugroup',
      'https://linkedin.com/company/evaramugroup',
      'https://youtube.com/@evaramugroup',
    ],
  }

  const extra = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : []

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />
      <meta name="author" content={author ?? SITE.name} />
      <link rel="canonical" href={canonical} />
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large" />
      )}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={`${SITE.name} — ${title}`} />
      <meta property="og:locale" content="en_RW" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content={SITE.handle} />

      {/* Geo */}
      <meta name="geo.region" content="RW-01" />
      <meta name="geo.placename" content="Kigali" />
      <meta name="geo.position" content="-1.9441;30.0619" />
      <meta name="ICBM" content="-1.9441, 30.0619" />

      <script type="application/ld+json">{JSON.stringify(organization)}</script>
      {extra.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </>
  )
}

/** Convenience builder for the breadcrumb JSON-LD block. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE.url}${item.path === '/' ? '' : item.path}`,
    })),
  }
}

/** Convenience builder for FAQ rich results. */
export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}
