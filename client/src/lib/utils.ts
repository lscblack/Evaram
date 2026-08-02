/** Tiny class-name joiner — avoids pulling in clsx/tailwind-merge. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const RWF_COMPACT = [
  { limit: 1_000_000_000, suffix: 'B', divisor: 1_000_000_000 },
  { limit: 1_000_000, suffix: 'M', divisor: 1_000_000 },
  { limit: 1_000, suffix: 'K', divisor: 1_000 },
]

/** `42000000` → `RWF 42M` */
export function formatCompactCurrency(value: number, currency = 'RWF'): string {
  const abs = Math.abs(value)
  for (const { limit, suffix, divisor } of RWF_COMPACT) {
    if (abs >= limit) {
      const n = value / divisor
      const rounded = n >= 100 ? Math.round(n) : Math.round(n * 10) / 10
      return `${currency} ${rounded}${suffix}`
    }
  }
  return `${currency} ${value.toLocaleString('en-RW')}`
}

/** `42000000` → `RWF 42,000,000` */
export function formatCurrency(value: number, currency = 'RWF'): string {
  return `${currency} ${Math.round(value).toLocaleString('en-RW')}`
}

/** `812` → `812 sqm`, `42000` → `4.2 ha` */
export function formatArea(sqm?: number | null): string {
  if (!sqm && sqm !== 0) return '—'
  if (sqm >= 10_000) return `${(sqm / 10_000).toFixed(1)} ha`
  return `${sqm.toLocaleString('en-RW')} sqm`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Local (not UTC) `YYYY-MM-DD` — keeps calendar dates stable across zones. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}

/** Deterministic pseudo-random in [0,1) from a string — used for static data. */
export function seededRandom(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10_000) / 10_000
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
