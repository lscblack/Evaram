/** Formatting helpers. Money is always shown with its own currency. */

const MONEY_DIGITS: Record<string, number> = { RWF: 0, USD: 2 }

export function formatMoney(amount: string | number | null | undefined, currency: string): string {
  const n = typeof amount === 'string' ? Number(amount) : amount ?? 0
  const digits = MONEY_DIGITS[currency] ?? 2
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0)
  return currency === 'USD' ? `$${formatted}` : `${formatted} ${currency}`
}

/** Compact form for chart axes: 1.2M RWF, $3.4k */
export function formatMoneyCompact(amount: number, currency: string): string {
  const s = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)
  return currency === 'USD' ? `$${s}` : `${s}`
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatMonth(value: string): string {
  const [y, m] = value.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

export function relativeTime(value: string): string {
  const diff = (Date.now() - new Date(value).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d ago`
  return formatDate(value)
}

export function todayISO(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function currentPeriod(): string {
  return todayISO().slice(0, 7)
}

export function humanize(value: string | null | undefined): string {
  if (!value) return '—'
  const s = value.replace(/[_.]/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const UNIT_TYPE_LABEL: Record<string, string> = {
  house: 'House',
  apartment: 'Apartment',
  room: 'Room',
  studio: 'Studio',
  commercial: 'Shop room',
}

export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  building: 'Building',
  house: 'House',
}

export const USAGE_LABEL: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed: 'Mixed use',
}

export const TOILET_LABEL: Record<string, string> = {
  private: 'Own toilet',
  shared: 'Shared toilet',
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
