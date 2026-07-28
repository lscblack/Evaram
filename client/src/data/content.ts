/** Testimonials, insights articles and FAQs. */

export interface Testimonial {
  id: string
  quote: string
  name: string
  role: string
  location: string
  photo: string
  /** Where the client sits in the Wealth Cycle */
  milestone: string
  rating: number
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't-01',
    quote:
      'I bought a plot in Kanombe with everything I had saved. Evaramu did not stop there — they built two rental units on it, found the tenants, and told me exactly when to sell. I own three properties now. I still cannot quite believe it.',
    name: 'Jean-Paul Habyarimana',
    role: 'Teacher',
    location: 'Kicukiro, Kigali',
    photo:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    milestone: 'Completed one full cycle · 3 properties',
    rating: 5,
  },
  {
    id: 't-02',
    quote:
      'I live in Brussels. I had been burned once before by a broker who took a deposit and disappeared. Claudine sent me a video walking the boundary with the UPI on screen, then the RLA verification, then the contract. I signed from my kitchen table.',
    name: 'Yvette Mukamana',
    role: 'Nurse · Diaspora client',
    location: 'Brussels, Belgium',
    photo:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    milestone: 'Remote purchase · Kigali plot',
    rating: 5,
  },
  {
    id: 't-03',
    quote:
      'Our house shell had been sitting unfinished for four years. Every contractor gave a price then changed it. Evaramu gave a fixed price with the contingency written down and stuck to it. We moved in eleven days ahead of schedule.',
    name: 'Emmanuel & Grace Niyonzima',
    role: 'Homeowners',
    location: 'Kimironko, Kigali',
    photo:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    milestone: 'Premium Finish package · 240 sqm',
    rating: 5,
  },
  {
    id: 't-04',
    quote:
      'What I value is the honesty. I wanted to sell at the end of last year and they told me to wait eight months. I waited. I got eleven million more than the offer I nearly took.',
    name: 'Diane Uwimana',
    role: 'Business owner',
    location: 'Nyarutarama, Kigali',
    photo:
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    milestone: 'Sold at peak · reinvested into 2 plots',
    rating: 5,
  },
  {
    id: 't-05',
    quote:
      'I send money home every month and never really knew where it went. Now I get a report on the first of each month with photos, the rent collected and what was spent on maintenance. That is all I ever wanted.',
    name: 'Olivier Rwema',
    role: 'Engineer · Diaspora client',
    location: 'Toronto, Canada',
    photo:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    milestone: 'Property management · 2 units',
    rating: 5,
  },
]

export interface Insight {
  slug: string
  title: string
  excerpt: string
  category: 'Market Report' | 'Wealth Education' | 'Construction' | 'Diaspora' | 'Rwanda News'
  readTime: number
  publishedAt: string
  author: string
  authorRole: string
  cover: string
  featured: boolean
  tags: string[]
  /** Simple block content — enough for a real reading experience. */
  body: { type: 'p' | 'h2' | 'quote' | 'list'; text?: string; items?: string[] }[]
}

export const INSIGHTS: Insight[] = [
  {
    slug: 'kigali-land-price-report-2026',
    title: 'Kigali land prices: which corridors actually moved in 2026',
    excerpt:
      'Not every neighbourhood appreciates equally. We pulled our own transaction data across seven sectors to show where land genuinely gained value this year — and where the headline numbers are misleading.',
    category: 'Market Report',
    readTime: 8,
    publishedAt: '2026-07-02',
    author: 'Aline Uwase',
    authorRole: 'Head of Real Estate',
    cover:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80',
    featured: true,
    tags: ['Land prices', 'Kigali', 'Market data'],
    body: [
      {
        type: 'p',
        text: 'Rwanda’s residential market is worth roughly USD 84.85 billion of a total USD 95.70 billion property market, and is projected to reach USD 110.10 billion by 2029. Those are national numbers. They tell you almost nothing about whether the specific plot you are considering will appreciate.',
      },
      { type: 'h2', text: 'The corridors that moved' },
      {
        type: 'p',
        text: 'Across the transactions we handled and tracked this year, three corridors consistently outperformed the 15–20% national headline for strategic land: the Bugesera airport approach, the Kabuga–Rwamagana road frontage, and the ridgelines around Rebero where supply is genuinely finite.',
      },
      {
        type: 'list',
        items: [
          'Bugesera / Nyamata — 22% year on year, driven entirely by the 2027–28 airport timeline',
          'Kabuga trading centre — 16%, road frontage plots only; interior plots moved far less',
          'Rebero ridge — 13%, but from a much higher base, so the absolute gain is larger',
          'Kanombe — 18%, the most reliable middle-market entry point we track',
        ],
      },
      { type: 'h2', text: 'Where the headline numbers mislead' },
      {
        type: 'p',
        text: 'A sector-level average hides the difference between a plot with road frontage and one 300 metres behind it, reached by a track that floods. We have seen those two plots, in the same cell, diverge by 40% in value over three years. Averages are not a buying strategy.',
      },
      {
        type: 'quote',
        text: 'The question is never "is Kigali land going up". It is "will this parcel, at this price, with this access, beat what else I could do with the money".',
      },
      { type: 'h2', text: 'What this means if you are buying now' },
      {
        type: 'p',
        text: 'If your horizon is three years or more, the airport corridor still offers the best risk-adjusted entry — you are buying before the infrastructure lands, which is the only time the discount exists. If your horizon is shorter, buy something that can be built on and tenanted quickly, because rental yield of 8–12% will carry you while you wait for the appreciation.',
      },
    ],
  },
  {
    slug: 'one-property-to-five-in-three-years',
    title: 'How a client went from one plot to five properties in three years',
    excerpt:
      'The full arithmetic of the Wealth Cycle, using a real client journey that started with RWF 8 million in savings and no property at all.',
    category: 'Wealth Education',
    readTime: 11,
    publishedAt: '2026-06-18',
    author: 'Aline Uwase',
    authorRole: 'Head of Real Estate',
    cover:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80',
    featured: true,
    tags: ['Wealth Cycle', 'Portfolio', 'Case study'],
    body: [
      {
        type: 'p',
        text: 'Most people assume building a property portfolio requires capital they do not have. It usually requires something more ordinary: buying the right first asset, improving it, and then being disciplined about what you do with the proceeds.',
      },
      { type: 'h2', text: 'Year 0 — the first plot' },
      {
        type: 'p',
        text: 'The client had RWF 8 million saved and no property. We sourced a verified plot in Kanombe, negotiated, and closed. Valued at RWF 10 million on completion. Nothing dramatic — but it was clean title, road access and services at the boundary, which is what makes everything afterwards possible.',
      },
      { type: 'h2', text: 'Year 0–1 — build something that earns' },
      {
        type: 'p',
        text: 'Land that sits idle costs you the appreciation you could have had elsewhere. We built a simple two-unit rental for RWF 18 million. The property was then worth about RWF 35 million — the build added more value than it cost, which is the entire point of an integrated construction division.',
      },
      { type: 'h2', text: 'Year 1–2 — let it pay you' },
      {
        type: 'p',
        text: 'Tenants placed, RWF 400,000 a month arriving, and our management fee of 10% only earning when the property does. Twenty-four months of that is close to RWF 9.6 million before the asset is sold at all.',
      },
      { type: 'h2', text: 'Year 2 — sell at the right moment' },
      {
        type: 'p',
        text: 'This is the step almost everyone gets wrong, because nobody is advising them. We recommended selling. It went for RWF 40 million — a RWF 14 million gain on top of two years of rent.',
      },
      { type: 'h2', text: 'Year 2–3 — reinvest into more than one thing' },
      {
        type: 'p',
        text: 'With roughly RWF 54 million, the client bought three properties simultaneously rather than one larger one. Diversified across two districts, all three appreciating, two of them earning rent from month one.',
      },
      {
        type: 'quote',
        text: 'From one plot to five properties in three years. Not because the market was extraordinary, but because nothing was left idle and nothing was sold at the wrong time.',
      },
    ],
  },
  {
    slug: 'buying-property-in-rwanda-from-abroad',
    title: 'Buying property in Rwanda from abroad without getting burned',
    excerpt:
      'Title verification, remote payment, power of attorney and the specific documents you should refuse to proceed without. A practical checklist for the diaspora.',
    category: 'Diaspora',
    readTime: 9,
    publishedAt: '2026-05-27',
    author: 'Claudine Ingabire',
    authorRole: 'Diaspora Relations Lead',
    cover:
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80',
    featured: true,
    tags: ['Diaspora', 'Title verification', 'Checklist'],
    body: [
      {
        type: 'p',
        text: 'The diaspora is the highest-value and most poorly served segment in Rwandan real estate. The reason is simple: distance makes fraud easy, and most operators have no system for closing that distance.',
      },
      { type: 'h2', text: 'Never move on a UPI you have not seen verified' },
      {
        type: 'p',
        text: 'Every parcel in Rwanda has a Unique Parcel Identifier. Ask for it before anything else. Then ask for the Rwanda Land Authority verification against that UPI — the owner name on the title must match the person you are dealing with, or their written mandate.',
      },
      { type: 'h2', text: 'The documents to insist on' },
      {
        type: 'list',
        items: [
          'The UPI and a current RLA title search dated within 30 days',
          'A video walking the parcel boundary with the UPI visible on screen',
          'The seller’s national ID matched against the registered owner name',
          'A written, priced sale agreement — never a verbal figure',
          'Receipts for every payment, issued the same day the money moves',
        ],
      },
      { type: 'h2', text: 'On deposits' },
      {
        type: 'p',
        text: 'Never send a deposit to an individual’s personal mobile money account for a land purchase. If the party you are dealing with cannot receive funds into a registered company account and issue a receipt, that is the end of the conversation.',
      },
      {
        type: 'quote',
        text: 'We would rather lose a transaction than hand a client a title dispute. Every deal we do is documented, and every title is verified before a franc moves.',
      },
    ],
  },
  {
    slug: 'what-finishing-a-house-actually-costs',
    title: 'What finishing a house in Kigali actually costs in 2026',
    excerpt:
      'Real per-square-metre numbers for Standard, Premium and Luxury finishes — and why the quote that looks cheapest almost always ends up costing the most.',
    category: 'Construction',
    readTime: 7,
    publishedAt: '2026-05-08',
    author: 'Patrick Habimana',
    authorRole: 'Head of Construction',
    cover:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1400&q=80',
    featured: false,
    tags: ['Construction', 'Budgeting', 'Renovation'],
    body: [
      {
        type: 'p',
        text: 'The most common question we get is some version of "what will it cost per square metre". The honest answer has a range, and anyone who gives you a single number without seeing the site is guessing or underquoting deliberately.',
      },
      { type: 'h2', text: 'The three bands' },
      {
        type: 'list',
        items: [
          'Standard finish — around RWF 320,000/sqm. Cement block, iron sheet roof, screed floors with tiles in wet areas.',
          'Premium finish — around RWF 520,000/sqm. Brick or concrete, tiled roof, full tiling, joinery and landscaping.',
          'Luxury finish — around RWF 850,000/sqm. Architect-led, specified materials, smart wiring, pool and garden design.',
        ],
      },
      { type: 'h2', text: 'Why the cheapest quote costs the most' },
      {
        type: 'p',
        text: 'An underquoted contract does not stay underquoted. It gets revised at the point where you are committed and cannot easily replace the contractor. Construction cost overrun is the single highest-likelihood, highest-impact risk in this business, which is why we quote fixed prices with a 15% contingency stated openly at signature rather than discovered at month four.',
      },
      {
        type: 'quote',
        text: 'A fixed price with an honest contingency written into it beats a low price with an open end, every single time.',
      },
    ],
  },
  {
    slug: 'rental-yields-by-kigali-neighbourhood',
    title: 'Rental yields by Kigali neighbourhood: where the numbers hold up',
    excerpt:
      'Apartments in prime areas yield 8–12% and villas 7–10% — but the spread within a single sector is wider than the spread between sectors. Here is the detail.',
    category: 'Market Report',
    readTime: 6,
    publishedAt: '2026-04-14',
    author: 'Eric Mugisha',
    authorRole: 'Senior Property Consultant',
    cover:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
    featured: false,
    tags: ['Rental yield', 'Investment', 'Kigali'],
    body: [
      {
        type: 'p',
        text: 'Prime rental yields in Kigali run 8–12% a year on apartments and 7–10% on villas. Those are good numbers by regional standards. They are also averages, and averages hide the two things that actually determine your yield: what you paid, and how long the unit sits empty between tenants.',
      },
      { type: 'h2', text: 'Void periods matter more than rent' },
      {
        type: 'p',
        text: 'A unit renting at RWF 800,000 that is empty three months a year earns less than one at RWF 700,000 that never sits empty. Corporate and NGO tenants sign longer, pay on time and take better care of the property — which is why we target them specifically.',
      },
      { type: 'h2', text: 'The neighbourhoods holding up best' },
      {
        type: 'list',
        items: [
          'Nyarutarama & Kacyiru — strongest corporate demand, shortest void periods',
          'Kimironko & Remera — slightly lower headline yield, far steadier occupancy',
          'Kanombe — best yield per franc invested in the middle market',
          'Vision City — premium rents, but service charges eat into the net figure',
        ],
      },
      {
        type: 'p',
        text: 'Kimironko and Remera deliver slightly lower headline yields but far more consistent occupancy across the year, which for most owners is the better outcome.',
      },
    ],
  },
  {
    slug: 'bugesera-airport-what-it-means-for-land',
    title: 'Bugesera airport: what it actually means for land values',
    excerpt:
      'A new international airport opening in 2027–28 creates a genuine sub-market. It also creates a lot of speculative nonsense. How to tell the difference.',
    category: 'Rwanda News',
    readTime: 7,
    publishedAt: '2026-03-22',
    author: 'Eric Mugisha',
    authorRole: 'Senior Property Consultant',
    cover:
      'https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1400&q=80',
    featured: false,
    tags: ['Bugesera', 'Infrastructure', 'Land'],
    body: [
      {
        type: 'p',
        text: 'Bugesera International Airport opens new residential and hospitality sub-markets by 2027–28. That is real, and it is already priced into some parcels. The question is which ones.',
      },
      { type: 'h2', text: 'Proximity is not the variable people think it is' },
      {
        type: 'p',
        text: 'Land directly adjacent to an airport is rarely the land that appreciates most. Noise corridors and approach paths constrain what can be built. The value accrues along the access routes and in the service settlements six to fifteen kilometres out.',
      },
      { type: 'h2', text: 'What we look for' },
      {
        type: 'list',
        items: [
          'Confirmed tarmac access, not a promised road',
          'Land use classification that permits residential or hospitality development',
          'Clean freehold or long leasehold title, verified at RLA',
          'A price that still makes sense if the timeline slips two years — because timelines slip',
        ],
      },
      {
        type: 'quote',
        text: 'Buy on the infrastructure that exists and the classification that is written down. Everything else is a story.',
      },
    ],
  },
]

export const getInsight = (slug: string): Insight | undefined =>
  INSIGHTS.find((i) => i.slug === slug)

export const INSIGHT_CATEGORIES = [
  'All',
  'Market Report',
  'Wealth Education',
  'Construction',
  'Diaspora',
  'Rwanda News',
] as const

export interface Faq {
  question: string
  answer: string
}

export const HOME_FAQS: Faq[] = [
  {
    question: 'How do you verify that a property title is clean?',
    answer:
      'Every parcel we list is checked at the Rwanda Land Authority against its UPI before it appears on the platform. We confirm the registered owner, the tenure type, the parcel size and any encumbrances. If the title is not clean, the listing does not go live — and we will not proceed with a transaction on it.',
  },
  {
    question: 'What is the Wealth Cycle, in plain terms?',
    answer:
      'It is our commitment to stay with you after the sale. We help you buy the right first property, build or renovate it to raise its value, place tenants so it earns, advise you on when to sell, and then reinvest the proceeds into two or three more. Clients who follow it typically go from one property to four or five within three years.',
  },
  {
    question: 'Can I buy from abroad without travelling to Rwanda?',
    answer:
      'Yes — this is a large part of what we do. You receive video walkthroughs with the UPI visible, independent RLA title verification before any deposit, digital contracts you can sign from anywhere, and monthly photo reporting throughout any build. Payments go to a registered company account and every one is receipted.',
  },
  {
    question: 'How much does your construction division charge?',
    answer:
      'We work in three fixed-price bands: Standard Finish from RWF 320,000/sqm, Premium Finish from RWF 520,000/sqm and Luxury Finish from RWF 850,000/sqm. Every contract states a 15% contingency openly at signature, with milestone payments so you never pay ahead of completed work.',
  },
  {
    question: 'What commission do you charge to sell my property?',
    answer:
      'Commission is agreed in writing before any work begins, and it is only earned on completion. The valuation visit, the pricing strategy, the professional photography and the drone video are all included — you are never billed for marketing that did not produce a sale.',
  },
  {
    question: 'Do you manage properties after the purchase?',
    answer:
      'Yes. Our management fee is 10% of collected rent, so we only earn when your property does. That covers tenant sourcing and screening, rent collection, arrears follow-up, maintenance coordination and a monthly statement sent to your inbox.',
  },
]
