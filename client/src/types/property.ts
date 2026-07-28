/**
 * Front-end mirror of the Evaramu property domain model.
 * Field names intentionally match the backend SQLAlchemy models so that
 * swapping the static data source for a real API is a drop-in change.
 */

export type PropertyStatus =
  | 'draft'
  | 'pending_review'
  | 'available'
  | 'reserved'
  | 'under_offer'
  | 'sold'
  | 'rented'

export type UploaderType = 'agency' | 'broker' | 'seller'

export type ListingIntent = 'sale' | 'rent'

/** Mirrors `property_categories` */
export interface PropertyCategory {
  id: number
  name: string
  label: string
  /** Lucide icon name */
  icon?: string
}

/** Mirrors `property_subcategories` */
export interface PropertySubCategory {
  id: number
  category_id: number
  name: string
  label: string
}

/** Mirrors `property_images` */
export interface PropertyImage {
  id: number
  property_id: number
  url: string
  caption?: string
  is_cover?: boolean
}

/** Mirrors the `parcel_information` JSONB payload returned by LAIS/NLA */
export interface ParcelInformation {
  upi: string
  province?: string
  district?: string
  sector?: string
  cell?: string
  village?: string
  land_use?: string
  parcel_size?: number
  tenure?: string
  lease_period?: string
  verified_on?: string
  registrar?: string
}

/** Mirrors `properties` */
export interface Property {
  id: number
  upi: string
  owner_id: string
  owner_name?: string
  category_id: number
  subcategory_id: number
  parcel_id?: string
  size?: number
  location?: string
  district?: string
  sector?: string
  cell?: string
  village?: string
  land_use?: string
  status: PropertyStatus
  estimated_amount?: number
  latitude?: number
  longitude?: number
  /** All dynamic form fields produced by FORM_CONFIG */
  details?: Record<string, unknown>
  parcel_information?: ParcelInformation
  right_type?: string
  gis_coordinates?: string
  amount_paid?: number
  new_owner_id?: number
  video_link?: string
  uploaded_by_user_id: number
  uploader_type: UploaderType
  created_at: string
  updated_at: string
  images: PropertyImage[]

  /* ---- presentation-layer fields (front-end only) ---- */
  title: string
  summary: string
  intent: ListingIntent
  /** Monthly figure when `intent === 'rent'` */
  rent_amount?: number
  currency: 'RWF' | 'USD'
  is_verified: boolean
  is_featured: boolean
  /** Projected annual yield %, used by the Wealth Cycle tooling */
  projected_yield?: number
  /** Projected annual appreciation % in this corridor */
  appreciation?: number
  tags: string[]
  agent_id: string
}
