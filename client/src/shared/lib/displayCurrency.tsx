import { useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import { cn } from '@/shared/ui/cn'
import { formatMoney } from './format'

/**
 * Website currency switch. Prices show in RWF by default; visitors may switch
 * to USD. Homes listed in the other currency are converted at the server's
 * USD -> RWF rate (display only: rent is charged in the listed currency).
 */
export type DisplayCurrency = 'RWF' | 'USD'
export const DISPLAY_CURRENCIES: DisplayCurrency[] = ['RWF', 'USD']

const KEY = 'evaramu.display-currency'
const listeners = new Set<() => void>()

function read(): DisplayCurrency {
  try {
    return localStorage.getItem(KEY) === 'USD' ? 'USD' : 'RWF'
  } catch {
    return 'RWF'
  }
}

export function setDisplayCurrency(c: DisplayCurrency) {
  try {
    localStorage.setItem(KEY, c)
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  current = c
  listeners.forEach((l) => l())
}

let current: DisplayCurrency = read()

export function useDisplayCurrency(): DisplayCurrency {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => 'RWF',
  )
}

export type ExchangeRate = { base: string; quote: string; rate: string | null; source: string | null; updated_at: string | null; is_override: boolean }

export function useExchangeRate() {
  return useQuery({
    queryKey: ['public', 'exchange-rate'],
    queryFn: () => api.publicGet<ExchangeRate>('/public/exchange-rate'),
    staleTime: 60 * 60 * 1000,
  })
}

export type ShownPrice = {
  /** Text in the visitor's chosen currency (or the listed one when no rate is known). */
  text: string
  value: number
  currency: string
  /** True when converted from another currency (an estimate). */
  converted: boolean
  /** The price exactly as listed, e.g. "$950.00". */
  listed: string
}

/** Rounded so converted prices read as estimates: RWF to the nearest 1,000, USD to whole dollars. */
function roundConverted(value: number, to: DisplayCurrency) {
  if (to === 'USD') return Math.round(value)
  return value >= 10000 ? Math.round(value / 1000) * 1000 : Math.round(value / 100) * 100
}

function formatConverted(value: number, to: DisplayCurrency) {
  if (to === 'USD') return `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`
  return formatMoney(value, 'RWF')
}

export function convertPrice(amount: string | number, from: string, to: DisplayCurrency, rate: number | null): ShownPrice {
  const n = Number(amount)
  const listed = formatMoney(n, from)
  if (from === to || !rate) {
    const text = from === 'USD' && Number.isInteger(n) ? formatConverted(n, 'USD') : listed
    return { text, value: n, currency: from, converted: false, listed }
  }
  const raw = to === 'RWF' ? n * rate : n / rate
  const value = roundConverted(raw, to)
  return { text: formatConverted(value, to), value, currency: to, converted: true, listed }
}

/** Price helper bound to the visitor's chosen currency and the current rate. */
export function useMoney() {
  const currency = useDisplayCurrency()
  const fx = useExchangeRate()
  const rate = fx.data?.rate ? Number(fx.data.rate) : null
  return {
    currency,
    rate,
    fx: fx.data,
    show: (amount: string | number, from: string) => convertPrice(amount, from, currency, rate),
  }
}

/** RWF | USD segmented switch. */
export function CurrencySwitch({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const value = useDisplayCurrency()
  return (
    <div
      role="radiogroup"
      aria-label="Show prices in"
      className={cn(
        'inline-flex shrink-0 rounded-full p-1 text-xs font-semibold',
        tone === 'light' ? 'bg-slate-100 ring-1 ring-slate-200' : 'bg-white/10 ring-1 ring-white/15',
        className,
      )}
    >
      {DISPLAY_CURRENCIES.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          onClick={() => setDisplayCurrency(c)}
          className={cn(
            'h-8 min-w-12 rounded-full px-3 transition-colors',
            value === c
              ? tone === 'light'
                ? 'bg-white text-brand-900 shadow-sm'
                : 'bg-white text-brand-900'
              : tone === 'light'
                ? 'text-slate-500 hover:text-slate-800'
                : 'text-white/70 hover:text-white',
          )}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

/** Price in the chosen currency; converted prices get "≈" and show the listed price on hover. */
export function Price({ amount, currency, className, compact }: { amount: string | number; currency: string; className?: string; compact?: boolean }) {
  const { show } = useMoney()
  const p = show(amount, currency)
  // Compact (cards): the "RWF" code is set small so long amounts stay on one line.
  const code = compact && p.text.endsWith(' RWF')
  return (
    <span className={cn('whitespace-nowrap', className)} title={p.converted ? `Listed at ${p.listed} — converted estimate` : undefined}>
      {p.converted ? <span className="mr-0.5 font-normal opacity-70">≈</span> : null}
      {code ? p.text.slice(0, -4) : p.text}
      {code ? <span className="ml-1 text-[11px] font-semibold opacity-70">RWF</span> : null}
    </span>
  )
}
