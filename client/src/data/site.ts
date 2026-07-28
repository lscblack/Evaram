/**
 * Single source of truth for company facts, navigation and contact details.
 * Everything here is drawn from the Evaramu Group Ltd Business Plan 2025–2028.
 */

export const SITE = {
  name: 'Evaramu Group Ltd',
  shortName: 'Evaramu',
  tagline: "We don't just sell property. We build wealth.",
  founded: '2025',
  city: 'Kigali',
  country: 'Rwanda',
  url: 'https://evaramu.rw',
  domain: 'evaramu.rw',
  email: 'hello@evaramu.rw',
  salesEmail: 'sales@evaramu.rw',
  phone: '+250 788 000 000',
  phoneHref: 'tel:+250788000000',
  whatsapp: '+250 788 000 000',
  whatsappHref: 'https://wa.me/250788000000',
  address: 'KG 11 Ave, Kimihurura, Gasabo District, Kigali, Rwanda',
  hours: 'Monday – Friday · 08:00 – 18:00',
  saturdayHours: 'Saturday · 09:00 – 14:00',
  handle: '@evaramugroup',
  rdb: 'Registered with the Rwanda Development Board (RDB)',
  description:
    'Evaramu Group Ltd is a full-cycle real estate, construction and property wealth company in Kigali, Rwanda. We find the property, help you buy it, build or renovate it, manage it, and when the time is right, help you sell and reinvest.',
} as const

export const SOCIALS = [
  { name: 'Instagram', href: 'https://instagram.com/evaramugroup', icon: 'Instagram' },
  { name: 'Facebook', href: 'https://facebook.com/evaramugroup', icon: 'Facebook' },
  { name: 'LinkedIn', href: 'https://linkedin.com/company/evaramugroup', icon: 'Linkedin' },
  { name: 'YouTube', href: 'https://youtube.com/@evaramugroup', icon: 'Youtube' },
] as const

export interface NavChild {
  label: string
  to: string
  description: string
  icon: string
}

export interface NavItem {
  label: string
  to: string
  /** Key into the translation table; `label` is the English fallback. */
  tKey: string
  children?: NavChild[]
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', tKey: 'nav.home', to: '/' },
  {
    label: 'Properties',
    tKey: 'nav.properties',
    to: '/properties',
    children: [
      {
        label: 'Browse all properties',
        to: '/properties',
        description: 'Verified land, homes and commercial space across Rwanda',
        icon: 'LayoutGrid',
      },
      {
        label: 'Land & plots',
        to: '/properties?category=residential',
        description: 'Residential and commercial plots in growth corridors',
        icon: 'MapPinned',
      },
      {
        label: 'Houses & apartments',
        to: '/properties?category=commercial',
        description: 'Family houses, condominium units and apartments',
        icon: 'Home',
      },
      {
        label: 'Commercial & industrial',
        to: '/properties?category=industrial',
        description: 'Offices, mixed-use buildings, warehouses and plots',
        icon: 'Building2',
      },
      {
        label: 'Sell or list a property',
        to: '/sell',
        description: 'List with the agency in a guided, documented process',
        icon: 'Upload',
      },
    ],
  },
  {
    label: 'Services',
    tKey: 'nav.services',
    to: '/services',
    children: [
      {
        label: 'The Wealth Cycle',
        to: '/wealth-cycle',
        description: 'Buy → build → earn → sell → reinvest. Our signature model',
        icon: 'RefreshCw',
      },
      {
        label: 'Construction & renovation',
        to: '/construction',
        description: 'Standard, Premium and Luxury finishing packages',
        icon: 'HardHat',
      },
      {
        label: 'Property management',
        to: '/services#management',
        description: 'Tenants, maintenance, rent collection, monthly reporting',
        icon: 'KeyRound',
      },
      {
        label: 'Diaspora services',
        to: '/services#diaspora',
        description: 'Buy and build from abroad with verified remote reporting',
        icon: 'Globe2',
      },
    ],
  },
  { label: 'Our Team', tKey: 'nav.team', to: '/team' },
  { label: 'Join Us', tKey: 'nav.join', to: '/join' },
  { label: 'About', tKey: 'nav.about', to: '/about' },
  { label: 'Insights', tKey: 'nav.insights', to: '/insights' },
  { label: 'Contact', tKey: 'nav.contact', to: '/contact' },
]

/** Headline numbers pulled from the business plan's market analysis. */
export const MARKET_STATS = [
  {
    value: '400,000+',
    label: 'National housing deficit',
    detail: 'Units short, and the gap widens every year',
    icon: 'Home',
  },
  {
    value: '15–20%',
    label: 'Annual land appreciation',
    detail: 'In strategic Kigali growth corridors',
    icon: 'TrendingUp',
  },
  {
    value: '8–12%',
    label: 'Prime rental yield',
    detail: 'Apartments per year · 7–10% on villas',
    icon: 'Wallet',
  },
  {
    value: '2×',
    label: 'Kigali demand by 2032',
    detail: '367,000 → 721,000 households',
    icon: 'Users',
  },
] as const

export const TRUST_POINTS = [
  {
    title: 'Every title verified at RLA',
    description:
      'No transaction moves forward without clean confirmation from the Rwanda Land Authority. We would rather lose a deal than hand you a dispute.',
    icon: 'ShieldCheck',
  },
  {
    title: 'Every deal documented',
    description:
      'Digital contracts, receipts and cost tracking on every engagement. No verbal-only agreements — inside or outside the company.',
    icon: 'FileCheck2',
  },
  {
    title: 'Response within 2 hours',
    description:
      'Speed is our differentiator. Competitors take days to return a call; we answer every lead the same working day.',
    icon: 'Timer',
  },
  {
    title: 'We stay after the sale',
    description:
      'Most agencies close and disappear. We build, tenant, manage and re-list — the relationship runs for years, not weeks.',
    icon: 'HeartHandshake',
  },
] as const
