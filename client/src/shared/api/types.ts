/**
 * Named API types, generated from the backend OpenAPI schema.
 * Regenerate with `pnpm api:types` after changing backend schemas.
 */
import type { components } from './schema'

type S = components['schemas']

export type Page<T> = { items: T[]; total: number; page: number; page_size: number }
export type CurrencyAmount = { currency: string; amount: string }
export type Currency = 'RWF' | 'USD'

export type Me = S['MeOut']
export type TokenOut = S['TokenOut']
export type UserOut = S['UserOut']
export type RoleOut = S['RoleOut']
export type PermissionOut = S['PermissionOut']

export type PropertyOut = S['PropertyOut']
export type PropertyDetail = S['PropertyDetail']
export type PropertyCreate = S['PropertyCreate']
export type PropertyUpdate = S['PropertyUpdate']
export type UnitOut = S['UnitOut']
export type UnitDetail = S['UnitDetail']
export type UnitCreate = S['UnitCreate']
export type UnitUpdate = S['UnitUpdate']
export type ImageOut = S['ImageOut']
export type HistoryEntry = S['HistoryEntry']
export type UnitCounts = S['UnitCounts']
export type AvailabilitySummary = S['AvailabilitySummary']

export type TenantOut = S['TenantOut']
export type TenantDetail = S['TenantDetail']
export type TenantCreate = S['TenantCreate']
export type TenantUpdate = S['TenantUpdate']

export type AgreementOut = S['AgreementOut']
export type AgreementDetail = S['AgreementDetail']
export type AgreementCreate = S['AgreementCreate']
export type DepositOut = S['DepositOut']

export type InvoiceOut = S['InvoiceOut']
export type InvoiceDetail = S['InvoiceDetail']
export type PaymentOut = S['PaymentOut']
export type PaymentMethodOut = S['PaymentMethodOut']
export type GenerateOut = S['GenerateOut']

export type NotificationOut = S['NotificationOut']
export type SettingOut = S['SettingOut']
export type AuditOut = S['AuditOut']
export type InquiryOut = S['InquiryOut']

export type PublicListing = S['PublicListing']
export type PublicListingDetail = S['PublicListingDetail']

export type UnitStatus = 'available' | 'reserved' | 'occupied' | 'turnover' | 'maintenance' | 'off_market'
export type AgreementStatus = 'draft' | 'active' | 'expired' | 'terminated'
export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'void'
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'reversed'

/** Shape of GET /dashboard (assembled server-side; not a Pydantic model). */
export interface DashboardData {
  generated_at: string
  portfolio: {
    properties: number
    units: number
    unit_status: Record<UnitStatus, number>
    available_units: number
    occupied_units: number
    occupancy_rate: number
    publicly_listed: number
    active_tenants: number
    awaiting_move_out: number
  }
  occupancy_by_property: {
    property_id: number
    code: string
    name: string
    units: number
    occupied: number
    available: number
    occupancy_rate: number
  }[]
  finance?: {
    expected_monthly_rent: CurrencyAmount[]
    collected_this_month: CurrencyAmount[]
    billed_this_month: CurrencyAmount[]
    collected_all_time: CurrencyAmount[]
    pending_approvals: { count: number; amounts: CurrencyAmount[] }
    outstanding: CurrencyAmount[]
    overdue: { count: number; amounts: CurrencyAmount[] }
  }
  revenue_series?: { month: string; collected: Record<string, string>; billed: Record<string, string> }[]
  recent_payments?: PaymentOut[]
  pending_payments?: PaymentOut[]
  overdue_invoices?: InvoiceOut[]
  upcoming_expirations?: AgreementOut[]
  recent_activity: { at: string; action: string; summary: string; actor: string }[]
}

export interface PublicFilters {
  locations: string[]
  unit_types: string[]
  currencies: { currency: Currency; min: string; max: string; count: number }[]
  max_bedrooms: number
  total_available: number
}

export type PublicSettings = Record<string, string | number | boolean>

export interface PaymentReport {
  totals: { currency: string; status: string; amount: string; count: number }[]
  by_method: { method_code: string; currency: string; amount: string; count: number }[]
  by_property: { code: string; name: string; currency: string; amount: string; count: number }[]
}

export interface InvoiceReport {
  by_currency: {
    currency: string
    count: number
    charged: string
    credited: string
    paid: string
    outstanding: string
    collection_rate: number
    by_status: Record<string, number>
  }[]
}

export interface OutstandingRow {
  tenant_id: number
  tenant_name: string
  phone: string
  currency: string
  invoices: number
  total: string
  current: string
  d1_30: string
  d31_60: string
  d61_90: string
  d90_plus: string
  oldest_due: string
  units: string[]
}

export type MonthlyRow = { month: string; collected: Record<string, string>; billed: Record<string, string> }

export type PlaceholderOut = S['PlaceholderOut']
export type AgreementTemplateOut = S['TemplateOut']
export type AgreementDocumentSummary = S['DocumentSummary']
export type AgreementDocumentOut = S['DocumentOut']
export type DocumentSignature = S['SignatureOut']
export type PublicVerifyOut = S['PublicVerifyOut']
