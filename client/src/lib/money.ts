/**
 * Helpers for money fields that group as you type — `1000000` reads as
 * `1,000,000`, so a mistyped zero is visible before it is submitted.
 *
 * Everything here works on the *raw* string (digits, optionally one decimal
 * point). Formatting is only ever a display concern; what leaves the form and
 * reaches the API stays unformatted.
 */

/** Strip anything that is not part of a number. Keeps at most one point. */
export function sanitiseAmount(text: string, allowDecimal = false): string {
  let out = text.replace(allowDecimal ? /[^\d.]/g : /\D/g, '')
  if (allowDecimal) {
    const first = out.indexOf('.')
    if (first !== -1) {
      out = out.slice(0, first + 1) + out.slice(first + 1).replace(/\./g, '')
    }
  }
  return out
}

/** `1234567` → `1,234,567`. Only the whole part is grouped. */
export function groupAmount(raw: string): string {
  if (!raw) return ''
  const [whole, ...rest] = raw.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return rest.length ? `${grouped}.${rest.join('')}` : grouped
}

/**
 * Where the caret belongs after reformatting.
 *
 * Grouping shifts every character to the right of an inserted separator, so
 * the caret is restored by counting *digits* rather than characters — type a
 * `0` in the middle of `1,000` and it stays put instead of jumping to the end.
 */
export function caretAfterDigits(formatted: string, digits: number): number {
  if (digits <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i += 1) {
    if (formatted[i] !== ',') seen += 1
    if (seen === digits) return i + 1
  }
  return formatted.length
}

const SCALES: [number, string][] = [
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
]

/**
 * `1500000` → `1.5 million`. The grouped digits say how many; this says how
 * much, which is the part people actually read back to check.
 */
export function amountInWords(value: number): string {
  if (!Number.isFinite(value) || value === 0) return ''
  const abs = Math.abs(value)
  for (const [size, name] of SCALES) {
    if (abs >= size) {
      const scaled = value / size
      const text =
        scaled % 1 === 0 ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, '')
      return `${text} ${name}`
    }
  }
  return groupAmount(String(value))
}
