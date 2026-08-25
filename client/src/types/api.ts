/** Response contracts, mirroring the FastAPI schemas. */

export interface Page<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

/* ---------------------------------------------------------------- taxonomy */
export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'multiselect'
  | 'section_header'
  | 'date'
  | 'textarea'

export interface ApiFormField {
  id: string
  name: string
  label: string
  label_rw: string | null
  label_fr: string | null
  help_text: string | null
  placeholder: string | null
  type: FieldType
  width: 'full' | 'half' | 'third'
  options: string[] | null
  is_required: boolean
  conditional: { field: string; value: unknown } | null
  min_value: number | null
  max_value: number | null
  unit: string | null
  display_order: number
  is_active: boolean
}

export interface ApiSubCategory {
  id: string
  slug: string
  label: string
  label_rw: string | null
  label_fr: string | null
  description: string | null
  icon: string | null
  is_land: boolean
  display_order: number
  is_active: boolean
  fields: ApiFormField[]
}

export interface ApiCategory {
  id: string
  slug: string
  label: string
  label_rw: string | null
  label_fr: string | null
  description: string | null
  icon: string | null
  cover_image_url: string | null
  display_order: number
  is_active: boolean
  subcategories: ApiSubCategory[]
}

export interface CategorySummary {
  id: string
  slug: string
  label: string
  icon: string | null
  display_order: number
  property_count: number
}

/* ---------------------------------------------------------------- property */
export type PropertyStatus =
  | 'draft'
  | 'pending_review'
  | 'available'
  | 'reserved'
  | 'under_offer'
  | 'sold'
  | 'rented'
  | 'withdrawn'
  | 'rejected'

export type ListingIntent = 'sale' | 'rent' | 'both'

export interface ApiMedia {
  id: string
  kind: string
  url: string
  thumbnail_url: string | null
  caption: string | null
  alt_text: string | null
  is_cover: boolean
  display_order: number
  meta: Record<string, unknown> | null
}

export interface ApiPropertyCard {
  id: string
  reference_number: string
  slug: string
  title: string
  summary: string | null
  category_id: string
  subcategory_id: string
  category_label: string | null
  subcategory_label: string | null
  location: string | null
  district: string | null
  sector: string | null
  status: PropertyStatus
  intent: ListingIntent
  currency: string
  price: number | null
  rent_amount: number | null
  size: number | null
  built_area: number | null
  bedrooms: number | null
  bathrooms: number | null
  projected_yield: number | null
  appreciation: number | null
  is_verified: boolean
  is_featured: boolean
  tags: string[] | null
  cover_url: string | null
  second_image_url: string | null
  has_vr_tour: boolean
  has_360_video: boolean
  created_at: string
}

export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'outbid'

export interface BidSummary {
  highest: number | null
  count: number
  currency: string
  closes_at: string | null
  is_open: boolean
}

export interface ApiBid {
  id: string
  property_id: string
  amount: number
  currency: string
  message: string | null
  status: BidStatus
  created_at: string
  decided_at: string | null
  decision_note: string | null
}

/** Console only — carries the bidder's identity. */
export interface ApiAdminBid extends ApiBid {
  bidder_name: string | null
  bidder_email: string | null
  bidder_phone: string | null
  property_reference: string | null
  property_title: string | null
}

/** Console listing shape — carries what the public API withholds. */
export interface ApiAdminPropertyCard extends ApiPropertyCard {
  upi: string | null
  show_on_public: boolean
  show_owner_info: boolean
  allow_bidding: boolean
  is_archived: boolean
}

export interface ApiSaleRecord {
  id: string
  property_id: string | null
  reference_number: string
  upi: string | null
  title: string
  category_id: string | null
  subcategory_id: string | null
  location: string | null
  district: string | null
  sector: string | null
  size: number | null
  sold_price: number | null
  currency: string
  sold_at: string
  owner_name: string | null
  owner_contact: string | null
  buyer_name: string | null
  buyer_contact: string | null
  notes: string | null
  created_at: string
}

export interface ApiSaleCommission {
  id: string
  agent_id: string | null
  agent_name: string | null
  basis: string
  rate: number | null
  base_amount: number | null
  amount: number
  currency: string
  status: string
  earned_on: string
  received_on: string | null
}

export interface ApiSaleRecordDetail extends ApiSaleRecord {
  /** What we earned on the sale, and which agent closed it. */
  commissions: ApiSaleCommission[]
  /** The full listing at the moment of sale — used to prefill a re-listing. */
  snapshot: Record<string, unknown> | null
}

export interface ApiPropertyDetail extends ApiPropertyCard {
  description: string | null
  province: string | null
  cell: string | null
  village: string | null
  latitude: number | null
  longitude: number | null
  gis_coordinates: string | null
  boundary_geojson: Record<string, unknown> | null
  boundary_points: number[][] | null
  boundary_area_sqm: number | null
  parcel_id: string | null
  land_use: string | null
  right_type: string | null
  master_plan_zone: string | null
  master_plan_note: string | null
  master_plan_doc_url: string | null
  amount_paid: number | null
  is_negotiable: boolean
  details: Record<string, unknown> | null
  parcel_information: Record<string, string | number> | null
  amenities: string[] | null
  video_link: string | null
  video_360_url: string | null
  vr_tour_url: string | null
  vr_tour_provider: string | null
  show_owner_info: boolean
  show_on_map: boolean
  allow_directions: boolean
  owner_contact: string | null
  allow_bidding: boolean
  min_bid: number | null
  bidding_closes_at: string | null
  bidding: BidSummary | null
  panorama_scenes: { url: string; title?: string; hotspots?: unknown[] }[] | null
  drone_footage_url: string | null
  owner_name: string | null
  uploader_type: string
  verified_at: string | null
  published_at: string | null
  view_count: number
  seo_title: string | null
  seo_description: string | null
  media: ApiMedia[]
  agent: ApiAgent | null
  updated_at: string
}

/** Console detail — the UPI, the owner's contact and the commission. */
export interface ApiAdminPropertyDetail extends ApiPropertyDetail {
  upi: string | null
  show_on_public: boolean
  is_archived: boolean
  rejection_reason: string | null
  seller_client_id: string | null
  owner_price: number | null
  commission_basis: string | null
  commission_rate: number | null
  commission_amount: number | null
  commission_in_price: boolean
}

export interface ApiAgent {
  id: string
  full_name: string
  job_title: string | null
  email: string
  phone: string | null
  photo_url: string | null
  rating: number | null
  deals_closed: number
  languages: string[] | null
}

/* ---------------------------------------------------------------- content */
export interface Bootstrap {
  settings: Record<string, string | null>
  setting_types: Record<string, string>
  strings: Record<string, { en: string; rw: string; fr: string }>
  navigation: ApiNavItem[]
  districts: string[]
}

export interface ApiNavItem {
  id: string
  menu: string
  label: string
  translation_key: string | null
  href: string
  icon: string | null
  description: string | null
  children: Omit<ApiNavItem, 'menu' | 'children'>[]
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
}

export interface ContentBlock {
  id: string
  page: string
  key: string
  label: string
  eyebrow: string | null
  title: string | null
  accent: string | null
  body: string | null
  items: Record<string, unknown>[] | null
  image_url: string | null
  cta_label: string | null
  cta_href: string | null
  translations: Record<string, Record<string, string>> | null
  display_order: number
  is_active: boolean
}

export interface ApiTestimonial {
  id: string
  quote: string
  author_name: string
  author_role: string | null
  location: string | null
  photo_url: string | null
  milestone: string | null
  rating: number
  display_order: number
  is_published: boolean
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
}

export interface ApiTeamMember {
  id: string
  full_name: string
  job_title: string | null
  division: string | null
  bio: string | null
  photo_url: string | null
  email: string
  phone: string | null
  languages: string[] | null
  specialties: string[] | null
  covers: string[] | null
  linkedin_url: string | null
  joined_year: string | null
  rating: number | null
  deals_closed: number
  display_order: number
}

export interface ApiServiceLine {
  id: string
  slug: string
  title: string
  tagline: string | null
  description: string | null
  division: string
  icon: string | null
  bullets: string[] | null
  href: string | null
  display_order: number
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
  /** Hidden rows still come back from the admin list. */
  is_active: boolean
}

export interface ApiPackage {
  id: string
  slug: string
  name: string
  tier: string
  tagline: string | null
  description: string | null
  /** Withheld unless the package publishes its rate. */
  price_per_sqm: number | null
  show_price: boolean
  price_note: string | null
  suited_to: string | null
  currency: string
  duration: string | null
  includes: string[] | null
  finishes: { label: string; value: string }[] | null
  is_popular: boolean
  display_order: number
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
}

export interface ApiCycleStep {
  id: string
  step: number
  title: string
  action: string
  outcome: string
  icon: string | null
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
}

export interface ApiMarketStat {
  id: string
  key: string
  value: string
  label: string
  detail: string | null
  icon: string | null
  source: string | null
  display_order: number
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
  /** Hidden rows still come back from the admin list. */
  is_active: boolean
}

export interface ApiFaq {
  id: string
  page: string
  question: string
  answer: string
  display_order: number
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
}

export interface ApiInsightCard {
  id: string
  slug: string
  title: string
  excerpt: string | null
  category: string
  cover_url: string | null
  read_time: number
  tags: string[] | null
  author_name: string | null
  author_role: string | null
  is_featured: boolean
  published_at: string | null
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
}

export interface ApiInsightDetail extends ApiInsightCard {
  body: { type: 'p' | 'h2' | 'quote' | 'list'; text?: string; items?: string[] }[] | null
  seo_title: string | null
  seo_description: string | null
  view_count: number
  updated_at: string
}

export interface ApiConsultationType {
  id: string
  slug: string
  title: string
  description: string | null
  duration_minutes: number
  price_label: string
  icon: string | null
  modes: string[] | null
  available_days: number[] | null
  slots: string[] | null
  display_order: number
  /** Per-locale field overrides; see lib/localize.ts. */
  translations?: Record<string, Record<string, unknown>> | null
}

export interface AvailabilityDay {
  date: string
  state: 'available' | 'full' | 'closed' | 'unavailable'
  open_slots: string[]
}

/* ---------------------------------------------------------------- auth */
export type UserRole = 'user' | 'agent' | 'admin' | 'super_admin'

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  status: string
  phone: string | null
  job_title: string | null
  division: string | null
  photo_url: string | null
  email_verified: boolean
  last_login_at: string | null
  created_at: string
}

export interface LoginChallenge {
  status: string
  pre_auth_token: string
  sent_to: string
  expires_in: number
  delivery_failed: boolean
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

export interface Captcha {
  token: string
  prompt: string
  image_svg: string
  expires_in: number
}

/* ---------------------------------------------------------------- admin */
export interface DashboardStats {
  properties: { total: number; available: number; pending_review: number }
  users: { total: number; agents: number }
  inbox: {
    contact_new: number
    enquiries_new: number
    applications_new: number
    bookings_pending: number
  }
  newsletter_subscribers: number
  trend: { date: string; count: number }[]
  recent: { kind: string; title: string; detail: string; at: string }[]
  generated_at: string
}

export interface SiteSetting {
  id: string
  key: string
  label: string
  description: string | null
  group: string
  value: string | null
  value_type: string
  /** Choices when `value_type` is `select`. */
  options: { value: string; label: string }[] | null
  is_public: boolean
  is_protected: boolean
  display_order: number
}

export interface AuditEntry {
  id: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  summary: string | null
  changes: Record<string, [unknown, unknown]> | null
  ip_address: string | null
  created_at: string
}


/* ------------------------------------------------- seller & buyer requests */

export type SellerSubmissionStatus = 'new' | 'reviewing' | 'accepted' | 'rejected'

export interface ApiSubmissionOwner {
  id: string
  full_name: string
  phone: string
  email: string | null
  national_id: string | null
  is_primary: boolean
}

/** An owner asking us to sell for them. */
export interface ApiSellerSubmission {
  id: string
  reference: string
  upi: string
  district: string | null
  sector: string | null
  location: string | null
  property_type: string | null
  asking_price: number | null
  size: number | null
  notes: string | null
  status: SellerSubmissionStatus
  review_note: string | null
  property_id: string | null
  created_at: string
  owners: ApiSubmissionOwner[]
}

export type PropertyRequestStatus = 'open' | 'matched' | 'fulfilled' | 'closed'

/** A buyer describing what they want when nothing listed matches. */
export interface ApiPropertyRequest {
  id: string
  reference: string
  full_name: string
  email: string | null
  phone: string
  intent: 'sale' | 'rent'
  category_id: string | null
  subcategory_id: string | null
  district: string | null
  sector: string | null
  preferred_areas: string | null
  budget_min: number | null
  budget_max: number | null
  currency: string
  size_min: number | null
  bedrooms_min: number | null
  timeline: string | null
  notes: string | null
  status: PropertyRequestStatus
  review_note: string | null
  matched_property_id: string | null
  created_at: string
}

export interface PropertyRequestReceipt {
  id: string
  reference: string
  detail: string
}


/** A staff profile as the console sees it — every field the team page uses. */
export interface AdminUser extends AuthUser {
  bio: string | null
  languages: string[] | null
  specialties: string[] | null
  covers: string[] | null
  linkedin_url: string | null
  joined_year: string | null
  rating: number | null
  /** Derived from recorded sales; not editable by hand. */
  deals_closed: number
  is_public: boolean
  display_order: number
}


/* ------------------------------------------------------- clients & money */

export type ClientKind = 'individual' | 'company'

export interface ApiClient {
  id: string
  kind: ClientKind
  /** The company's name, or the person's — whichever applies. */
  display_name: string
  full_name: string | null
  national_id: string | null
  company_name: string | null
  tin: string | null
  registration_number: string | null
  contact_person: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  district: string | null
  country: string | null
  notes: string | null
  tags: string[] | null
  is_active: boolean
  created_by_id: string | null
  created_at: string
}

export interface ClientOption {
  id: string
  display_name: string
  kind: ClientKind
  phone: string | null
}

export interface ClientDealSummary {
  listings_total: number
  listings_live: number
  sold_count: number
  sold_value: number
  bought_count: number
  bought_value: number
  commission_total: number
  commission_received: number
  commission_pending: number
  invested_total: number
  first_deal_on: string | null
  last_deal_on: string | null
}

export interface ApiClientDetail extends ApiClient {
  summary: ClientDealSummary
}

export type CommissionStatus = 'pending' | 'invoiced' | 'received' | 'written_off'

export interface ApiCommission {
  id: string
  property_id: string | null
  sale_record_id: string | null
  client_id: string | null
  agent_id: string | null
  basis: 'percent' | 'fixed'
  rate: number | null
  base_amount: number | null
  amount: number
  currency: string
  status: CommissionStatus
  earned_on: string
  received_on: string | null
  reference: string | null
  notes: string | null
  created_at: string
  /** Resolved server-side so a list does not need extra requests. */
  client_name: string | null
  agent_name: string | null
  property_reference: string | null
}

export type InvestmentKind =
  | 'acquisition'
  | 'renovation'
  | 'construction'
  | 'fees'
  | 'marketing'
  | 'other'

export interface ApiInvestment {
  id: string
  property_id: string | null
  client_id: string | null
  kind: InvestmentKind
  label: string
  amount: number
  currency: string
  spent_on: string
  is_recovered: boolean
  reference: string | null
  notes: string | null
  created_at: string
  client_name: string | null
  property_reference: string | null
}

/* ------------------------------------------------------------------ the map */

export interface ParcelProperties {
  id: string
  slug: string
  reference_number: string
  title: string
  district: string | null
  sector: string | null
  status: PropertyStatus
  intent: ListingIntent
  currency: string
  price: number | null
  rent_amount: number | null
  size: number | null
  bedrooms: number | null
  cover_url: string | null
  is_featured: boolean
  is_verified: boolean
  latitude: number
  longitude: number
  has_outline: boolean
  issue_count: number
  allow_directions: boolean
  /** Present on `/map/nearby` results only. */
  distance_m?: number
  /** Added client-side for the map's price labels. */
  price_label?: string
}

export interface ParcelCollection {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    geometry: { type: 'Polygon' | 'Point'; coordinates: number[][][] | number[] }
    properties: ParcelProperties
  }[]
  truncated?: boolean
  /** Proximity search only — what was asked for, and what had to be dropped. */
  matched?: ProximityCriterion[]
  relaxed?: ProximityCriterion[]
  exact?: boolean
}

export interface ProximityCriterion {
  kind: string
  direction: 'within' | 'beyond'
  distance_m: number
}

export interface FacilityProperties {
  id: string
  name: string | null
  kind: string
  subkind: string | null
  is_constraint: boolean
}

export interface NearbyFacility {
  id: string
  name: string | null
  kind: string
  subkind: string | null
  distance_m: number
  walk_minutes: number | null
  latitude: number
  longitude: number
  is_constraint: boolean
}

export interface BoundaryIssue {
  code: string
  severity: 'error' | 'warning'
  message: string
  [extra: string]: unknown
}

export interface ParcelContext {
  slug: string
  location_withheld: boolean
  latitude?: number | null
  longitude?: number | null
  allow_directions?: boolean
  boundary: {
    geometry: { type: string; coordinates: number[][][] } | null
    area_sqm?: number | null
    declared_size?: number | null
    issues: BoundaryIssue[]
  }
  facilities: NearbyFacility[]
  summary?: Record<
    string,
    { name: string | null; distance_m: number; walk_minutes: number | null; is_constraint: boolean }
  >
  overlaps: {
    id: string
    reference_number: string
    title: string
    slug: string
    overlap_sqm: number
  }[]
}

export interface ComparisonRow {
  key: string
  label: string
  direction: 'lower' | 'higher'
  weight: number
  values: Record<string, number | null>
  winners: string[]
}

export interface ParcelComparison {
  parcels: {
    slug: string
    reference_number: string
    title: string
    district: string | null
    cover_url: string | null
    currency: string
    location_withheld: boolean
    facts: Record<string, number | null>
  }[]
  rows: ComparisonRow[]
  scores: Record<string, number>
  winner: string | null
  tied: boolean
}
