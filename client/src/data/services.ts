/**
 * Construction packages, service lines, wealth-cycle model and consultation
 * types. All figures come from the Evaramu Group Ltd Business Plan 2025–2028.
 */

/* ------------------------------------------------------------------ *
 *  Divisions & service lines
 * ------------------------------------------------------------------ */

export interface ServiceLine {
  id: string
  title: string
  division: 'Realty' | 'Construction' | 'Group'
  tagline: string
  description: string
  icon: string
  bullets: string[]
  href: string
}

export const SERVICE_LINES: ServiceLine[] = [
  {
    id: 'buy',
    title: 'Buy land & property',
    division: 'Realty',
    tagline: 'Verified before it reaches you',
    description:
      'Every parcel we list is checked at the Rwanda Land Authority before it appears on the platform. You see the UPI, the tenure, the size and the coordinates — not a blurry photo in a WhatsApp group.',
    icon: 'Search',
    bullets: [
      'Title verified at RLA before listing',
      'UPI, parcel size and GIS coordinates published',
      'Negotiation handled by your assigned consultant',
      'Digital contract, receipts and transfer support',
    ],
    href: '/properties',
  },
  {
    id: 'sell',
    title: 'Sell or list your property',
    division: 'Realty',
    tagline: 'Marketed properly, sold faster',
    description:
      'Drone video, professional photography and a mapped online listing — instead of phone snapshots. We qualify buyers before they ever visit your site.',
    icon: 'Upload',
    bullets: [
      'Free valuation and pricing strategy',
      'Drone video and professional photography',
      'Buyer qualification before every viewing',
      'Commission agreed in writing up front',
    ],
    href: '/sell',
  },
  {
    id: 'build',
    title: 'Construction & renovation',
    division: 'Construction',
    tagline: 'One company brokers and builds',
    description:
      'Fixed-price contracts, a 15% contingency buffer and weekly cost tracking. A site supervisor on every project, and a vetted sub-contractor network behind them.',
    icon: 'HardHat',
    bullets: [
      'Fixed-price client contracts',
      'Weekly cost tracking and photo reports',
      'Vetted masons, electricians, plumbers and tilers',
      'Remote supervision available for diaspora clients',
    ],
    href: '/construction',
  },
  {
    id: 'manage',
    title: 'Property management',
    division: 'Realty',
    tagline: 'Passive income, actively protected',
    description:
      'We place tenants, collect rent, handle maintenance and send you a monthly report. Our management fee is 10% — and it only earns when your property does.',
    icon: 'KeyRound',
    bullets: [
      'Tenant sourcing and screening',
      'Rent collection and arrears follow-up',
      'Maintenance coordination and inspections',
      'Monthly statement to your inbox',
    ],
    href: '/services#management',
  },
  {
    id: 'diaspora',
    title: 'Diaspora services',
    division: 'Group',
    tagline: 'Invest home without flying home',
    description:
      'The most underserved segment in Rwanda. Video updates, verified titles, digital contracts and a monthly Kigali Market Report so you always know what your money is doing.',
    icon: 'Globe2',
    bullets: [
      'Video walkthroughs of every shortlisted property',
      'Independent title verification before deposit',
      'Digital contracts signed from anywhere',
      'Monthly build diary and photo reporting',
    ],
    href: '/services#diaspora',
  },
  {
    id: 'wealth',
    title: 'The Wealth Cycle',
    division: 'Group',
    tagline: 'From one property to a portfolio',
    description:
      'Our signature model. We stay with you through buy, build, earn, sell and reinvest — so a single plot compounds into four or five properties within three years.',
    icon: 'RefreshCw',
    bullets: [
      'Portfolio plan built around your budget',
      'Timing advice on when to sell, not just what to buy',
      'Proceeds redirected into 2–3 new assets',
      'Ongoing management as the portfolio grows',
    ],
    href: '/wealth-cycle',
  },
]

/* ------------------------------------------------------------------ *
 *  The Wealth Cycle — six steps
 * ------------------------------------------------------------------ */

export interface CycleStep {
  step: number
  title: string
  action: string
  outcome: string
  icon: string
}

export const WEALTH_CYCLE: CycleStep[] = [
  {
    step: 1,
    title: 'Find',
    action: 'We source verified land or property matching your budget and goals.',
    outcome: 'You buy your first property with full guidance.',
    icon: 'Search',
  },
  {
    step: 2,
    title: 'Build / Improve',
    action: 'We renovate, finish or construct to increase the value.',
    outcome: 'Property value increases 20–50%.',
    icon: 'HardHat',
  },
  {
    step: 3,
    title: 'Earn',
    action: 'We place tenants and manage the property for passive income.',
    outcome: 'Monthly rental income starts flowing.',
    icon: 'Wallet',
  },
  {
    step: 4,
    title: 'Sell at Peak',
    action: 'We advise on the right time to sell and market it professionally.',
    outcome: 'You capture appreciation plus the rental gains.',
    icon: 'TrendingUp',
  },
  {
    step: 5,
    title: 'Reinvest',
    action: 'We redirect the proceeds into 2–3 new properties.',
    outcome: 'You now own multiple assets. The cycle repeats.',
    icon: 'RefreshCw',
  },
  {
    step: 6,
    title: 'Repeat',
    action: 'The cycle continues with a larger portfolio each round.',
    outcome: 'From 1 property to 4–5 within 3 years.',
    icon: 'Layers',
  },
]

/** The worked example from the business plan. */
export interface CycleYear {
  year: string
  situation: string
  action: string
  outcome: string
  portfolioValue: number
}

export const CYCLE_TIMELINE: CycleYear[] = [
  {
    year: 'Year 0',
    situation: 'Client has RWF 8M savings. No property.',
    action: 'We source a verified plot in Kanombe. We negotiate. We close.',
    outcome: 'Client buys first land, valued at RWF 10M.',
    portfolioValue: 10_000_000,
  },
  {
    year: 'Year 0–1',
    situation: 'Land sitting idle.',
    action: 'We build a simple 2-unit rental on the plot.',
    outcome: 'Construction cost RWF 18M. Property now worth RWF 35M.',
    portfolioValue: 35_000_000,
  },
  {
    year: 'Year 1–2',
    situation: 'Property completed.',
    action: 'We find tenants and charge a 10% management fee monthly.',
    outcome: 'Client earns RWF 400,000/month passive income.',
    portfolioValue: 38_000_000,
  },
  {
    year: 'Year 2',
    situation: 'Client wants to grow.',
    action: 'We advise: time to sell. We list and market professionally.',
    outcome: 'Sold for RWF 40M — a RWF 14M gain plus 24 months of income.',
    portfolioValue: 40_000_000,
  },
  {
    year: 'Year 2–3',
    situation: 'Client has RWF 54M total.',
    action: 'We reinvest into 2–3 properties simultaneously.',
    outcome: 'Client now owns 3 properties. The cycle repeats.',
    portfolioValue: 54_000_000,
  },
  {
    year: 'Year 3+',
    situation: 'Portfolio of 4–5 properties.',
    action: 'We manage all properties; Evaramu earns ongoing management fees.',
    outcome: 'Multiple income streams and a compounding portfolio.',
    portfolioValue: 96_000_000,
  },
]

/* ------------------------------------------------------------------ *
 *  Construction packages
 * ------------------------------------------------------------------ */

export interface ConstructionPackage {
  id: string
  name: string
  tier: 'Standard' | 'Premium' | 'Luxury'
  tagline: string
  pricePerSqm: number
  currency: 'RWF'
  duration: string
  popular: boolean
  description: string
  includes: string[]
  finishes: { label: string; value: string }[]
}

export const CONSTRUCTION_PACKAGES: ConstructionPackage[] = [
  {
    id: 'pkg-standard',
    name: 'Standard Finish',
    tier: 'Standard',
    tagline: 'Solid, honest, built to last',
    pricePerSqm: 320_000,
    currency: 'RWF',
    duration: '3–5 months',
    popular: false,
    description:
      'The right package for a first rental unit or a family home built to a clear budget. Nothing decorative, nothing cut short.',
    includes: [
      'Fixed-price contract with 15% contingency stated up front',
      'Dedicated site supervisor on every visit',
      'Weekly photo report and running cost sheet',
      'Vetted sub-contractors only — no casual labour',
      '12-month workmanship warranty',
    ],
    finishes: [
      { label: 'Walls', value: 'Cement blocks, plastered and painted' },
      { label: 'Roof', value: 'Corrugated iron sheets on treated timber' },
      { label: 'Floors', value: 'Sand cement screed with ceramic tiles in wet areas' },
      { label: 'Windows', value: 'Powder-coated aluminium, clear glazing' },
      { label: 'Fittings', value: 'Standard-grade sanitary ware and switchgear' },
    ],
  },
  {
    id: 'pkg-premium',
    name: 'Premium Finish',
    tier: 'Premium',
    tagline: 'Where most Wealth Cycle builds land',
    pricePerSqm: 520_000,
    currency: 'RWF',
    duration: '5–8 months',
    popular: true,
    description:
      'The package that reliably lifts a property 20–50% in value. Built to rent well to corporate tenants and to sell well at the peak.',
    includes: [
      'Everything in Standard Finish',
      'Architectural drawings and structural certification',
      'Full tiling, ceiling and joinery package',
      'Landscaping and boundary wall included',
      'Quantity surveyor cost review at each milestone',
      '24-month workmanship warranty',
    ],
    finishes: [
      { label: 'Walls', value: 'Clay burnt brick or reinforced concrete, skim finish' },
      { label: 'Roof', value: 'Tiled double-pitch on engineered trusses' },
      { label: 'Floors', value: 'Large-format porcelain tiles throughout' },
      { label: 'Windows', value: 'Thermally broken aluminium, tinted glazing' },
      { label: 'Fittings', value: 'Imported sanitary ware, branded switchgear' },
    ],
  },
  {
    id: 'pkg-luxury',
    name: 'Luxury Finish',
    tier: 'Luxury',
    tagline: 'For villas, ridges and headline addresses',
    pricePerSqm: 850_000,
    currency: 'RWF',
    duration: '8–14 months',
    popular: false,
    description:
      'Architect-led builds on the plots that deserve them — Rebero, Nyarutarama, Kiyovu. Detailed, specified and supervised to the millimetre.',
    includes: [
      'Everything in Premium Finish',
      'Named architect and interior designer on the project',
      '3D visualisation and material sample board before build',
      'Smart home wiring, solar and backup power provision',
      'Pool, garden design and outdoor lighting',
      '36-month workmanship warranty',
    ],
    finishes: [
      { label: 'Walls', value: 'Reinforced concrete frame, natural stone accents' },
      { label: 'Roof', value: 'Concrete flat roof or specified architectural tile' },
      { label: 'Floors', value: 'Engineered hardwood and stone' },
      { label: 'Windows', value: 'Full-height glazing systems, sliding stacks' },
      { label: 'Fittings', value: 'Designer specification throughout' },
    ],
  },
]

export interface RenovationService {
  id: string
  title: string
  description: string
  from: number
  icon: string
}

export const RENOVATION_SERVICES: RenovationService[] = [
  {
    id: 'ren-finishing',
    title: 'Finishing an unfinished build',
    description:
      'The most common request we get. A shell that has sat for years, brought to a lettable standard on a fixed price.',
    from: 8_000_000,
    icon: 'PaintRoller',
  },
  {
    id: 'ren-kitchen',
    title: 'Kitchen & bathroom renovation',
    description:
      'The two rooms that decide a rental price. Full strip-out, replumb, retile and refit.',
    from: 4_500_000,
    icon: 'Bath',
  },
  {
    id: 'ren-roof',
    title: 'Roofing & waterproofing',
    description:
      'Re-roofing, gutter replacement and flat-roof waterproofing with a written guarantee.',
    from: 3_200_000,
    icon: 'Home',
  },
  {
    id: 'ren-extension',
    title: 'Extensions & extra units',
    description:
      'Adding a second rental unit to an existing plot — the fastest route to a second income stream.',
    from: 12_000_000,
    icon: 'Blocks',
  },
  {
    id: 'ren-compound',
    title: 'Compound, fencing & paving',
    description:
      'Boundary walls, gates, cabro paving and drainage. Often the difference between a viewing and an offer.',
    from: 2_800_000,
    icon: 'Fence',
  },
  {
    id: 'ren-remote',
    title: 'Remote build supervision',
    description:
      'For diaspora clients building with their own contractor. We inspect, photograph, report and verify every payment request.',
    from: 450_000,
    icon: 'Globe2',
  },
]

export const BUILD_PROCESS = [
  {
    step: '01',
    title: 'Site visit & brief',
    description:
      'We walk the plot with you, confirm the UPI and land use, and write down exactly what you want built.',
    icon: 'MapPinned',
  },
  {
    step: '02',
    title: 'Fixed quotation',
    description:
      'A priced bill of quantities with a 15% contingency stated openly. No moving numbers once signed.',
    icon: 'FileText',
  },
  {
    step: '03',
    title: 'Contract & 30–40% deposit',
    description:
      'A written contract with a milestone payment schedule. You never pay ahead of completed work.',
    icon: 'FileSignature',
  },
  {
    step: '04',
    title: 'Build with weekly reporting',
    description:
      'A site supervisor daily, a photo report weekly, and a running cost sheet you can open any time.',
    icon: 'HardHat',
  },
  {
    step: '05',
    title: 'Snagging & handover',
    description:
      'We walk the finished build with you, fix the snag list, and hand over keys with the warranty in writing.',
    icon: 'KeyRound',
  },
  {
    step: '06',
    title: 'Tenant or list',
    description:
      'The moment it is finished, our Realty division can tenant it or list it — the Wealth Cycle continues.',
    icon: 'RefreshCw',
  },
] as const

/* ------------------------------------------------------------------ *
 *  Consultations
 * ------------------------------------------------------------------ */

export interface ConsultationType {
  id: string
  title: string
  duration: number
  mode: string[]
  price: string
  description: string
  icon: string
  /** Days of the week this consultation is offered — 0 = Sunday */
  availableDays: number[]
  slots: string[]
}

export const CONSULTATION_TYPES: ConsultationType[] = [
  {
    id: 'discovery',
    title: 'Free discovery call',
    duration: 30,
    mode: ['Phone', 'WhatsApp video', 'Google Meet'],
    price: 'Free',
    description:
      'Tell us your budget and what you are trying to achieve. We will tell you honestly whether we can help and what it would cost.',
    icon: 'Phone',
    availableDays: [1, 2, 3, 4, 5],
    slots: ['08:30', '09:30', '10:30', '11:30', '14:00', '15:00', '16:00', '17:00'],
  },
  {
    id: 'viewing',
    title: 'Property viewing',
    duration: 90,
    mode: ['On site', 'Live video walkthrough'],
    price: 'Free',
    description:
      'Walk a shortlisted property with your consultant. Diaspora clients get the same viewing as a live video call with the UPI on screen.',
    icon: 'MapPinned',
    availableDays: [1, 2, 3, 4, 5, 6],
    slots: ['09:00', '11:00', '14:00', '16:00'],
  },
  {
    id: 'wealth-plan',
    title: 'Wealth Cycle planning session',
    duration: 60,
    mode: ['Office', 'Google Meet'],
    price: 'Free for clients',
    description:
      'We map your capital against a three-year portfolio plan: what to buy first, what to build on it, when to sell and what to reinvest into.',
    icon: 'RefreshCw',
    availableDays: [1, 2, 3, 4, 5],
    slots: ['09:00', '10:30', '14:00', '15:30'],
  },
  {
    id: 'construction',
    title: 'Construction consultation',
    duration: 60,
    mode: ['On site', 'Office'],
    price: 'RWF 25,000 — credited to your build',
    description:
      'Bring your plot or your drawings. Our Head of Construction will scope the work and give you an indicative price per square metre.',
    icon: 'HardHat',
    availableDays: [2, 3, 4, 6],
    slots: ['08:00', '10:00', '13:00', '15:00'],
  },
  {
    id: 'diaspora',
    title: 'Diaspora investment briefing',
    duration: 45,
    mode: ['Google Meet', 'Zoom'],
    price: 'Free',
    description:
      'Scheduled across time zones. Title verification, remote payment, transfer of ownership and how our monthly reporting works.',
    icon: 'Globe2',
    availableDays: [1, 3, 5, 6],
    slots: ['07:00', '08:00', '17:00', '18:00', '19:00', '20:00'],
  },
  {
    id: 'valuation',
    title: 'Seller valuation visit',
    duration: 60,
    mode: ['On site'],
    price: 'Free',
    description:
      'We visit your property, assess it against recent comparable sales in the sector, and give you a realistic asking price.',
    icon: 'Calculator',
    availableDays: [1, 2, 3, 4, 5],
    slots: ['09:00', '11:00', '14:00', '16:00'],
  },
]

export const getConsultationType = (id: string): ConsultationType | undefined =>
  CONSULTATION_TYPES.find((c) => c.id === id)

/**
 * Static availability model. Deterministic so the calendar renders the same
 * on every load — replace with an API call when the backend lands.
 */
export const FULLY_BOOKED_DATES = [
  '2026-08-05',
  '2026-08-13',
  '2026-08-21',
  '2026-09-02',
  '2026-09-17',
]

/** Public holidays in Rwanda when the office is closed. */
export const CLOSED_DATES = [
  '2026-08-01',
  '2026-08-15',
  '2026-09-25',
  '2026-12-25',
  '2026-12-26',
]
