import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Gavel, Lock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/queries'
import { useFormErrors } from '@/lib/formErrors'
import { useT } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import type { ApiPropertyDetail, BidSummary } from '@/types/api'

/**
 * Offers on a listing.
 *
 * The public only ever sees the leading figure and how many people are in —
 * never who they are or what each of them offered. Placing an offer requires an
 * account, so every bid an agent chases has a verified name behind it.
 */
export function BiddingPanel({ property }: { property: ApiPropertyDetail }) {
  const t = useT()
  const { user } = useAuth()
  const location = useLocation()

  const { data: summary, refetch } = useQuery<BidSummary>(
    property.allow_bidding ? `/public/properties/${property.id}/bids` : null,
    { ttl: 15_000 },
  )

  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const errors = useFormErrors(['amount', 'message'])
  const [placed, setPlaced] = useState(false)

  if (!property.allow_bidding) return null

  const live = summary ?? property.bidding
  const floor = Math.max(property.min_bid ?? 0, (live?.highest ?? 0) + (live?.highest ? 1 : 0))
  const isOpen = live?.is_open ?? false

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    errors.clear()
    try {
      await api.post(`/public/properties/${property.id}/bids`, {
        amount: Number(amount),
        message: message || null,
      })
      setPlaced(true)
      setAmount('')
      setMessage('')
      refetch()
    } catch (err) {
      errors.capture(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      <header className="flex items-center gap-2.5 border-b border-line bg-navy-950 px-5 py-4 text-white">
        <Gavel className="size-4 text-gold-400" strokeWidth={2.2} />
        <h2 className="font-display text-[1rem] font-semibold">Open to offers</h2>
        {!isOpen && (
          <span className="ml-auto rounded-full bg-white/10 px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide uppercase">
            Closed
          </span>
        )}
      </header>

      {/* ---- the public figure ---- */}
      <div className="border-b border-line px-5 py-5">
        <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-muted uppercase">
          {live?.highest ? 'Leading offer' : 'No offers yet'}
        </p>
        <p className="mt-1.5 font-display text-[1.75rem] leading-none font-semibold text-ink tabular-nums">
          {live?.highest
            ? formatCurrency(live.highest, live.currency)
            : property.min_bid
              ? `${formatCurrency(property.min_bid, property.currency)}+`
              : '—'}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
          <TrendingUp className="size-3.5" strokeWidth={2.2} />
          {live?.count ?? 0} {live?.count === 1 ? 'person has' : 'people have'} bid
          {live?.closes_at && (
            <span className="ml-auto">
              closes {new Date(live.closes_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          )}
        </p>
      </div>

      {/* ---- the form ---- */}
      <div className="p-5">
        {!isOpen ? (
          <p className="text-[0.875rem] leading-relaxed text-ink-muted">
            This property is no longer taking offers. Talk to the consultant listed above about
            anything similar coming up.
          </p>
        ) : placed ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="flex items-center gap-2 text-[0.9375rem] font-semibold text-emerald-700">
              <Check className="size-4" strokeWidth={2.6} />
              Your offer is in
            </p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-muted">
              The consultant handling this property will be in touch. You can raise your offer at
              any time while bidding is open.
            </p>
            <button
              type="button"
              onClick={() => setPlaced(false)}
              className="mt-4 text-[0.875rem] font-semibold text-gold-600 hover:text-gold-700"
            >
              Place a higher offer
            </button>
          </motion.div>
        ) : !user ? (
          <div>
            <p className="flex items-center gap-2 text-[0.875rem] font-medium text-ink">
              <Lock className="size-3.5 text-ink-muted" strokeWidth={2.2} />
              Sign in to place an offer
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
              Offers carry a name and a verified contact, so sellers know they are real.
            </p>
            <Button
              to={`/account?next=${encodeURIComponent(location.pathname)}`}
              variant="primary"
              className="mt-4 w-full"
            >
              Sign in or create an account
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label
                htmlFor="bid-amount"
                className="mb-1.5 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
              >
                Your offer ({property.currency})
              </label>
              <input
                id="bid-amount"
                type="number"
                required
                min={floor || undefined}
                step={100000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={floor ? String(floor) : 'Amount'}
                className="h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] tabular-nums text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
              />
              {errors.for('amount') ? (
                <p className="mt-1.5 text-[0.75rem] text-red-600">{errors.for('amount')}</p>
              ) : (
                floor > 0 && (
                  <p className="mt-1.5 text-[0.75rem] text-ink-faint">
                    Minimum {formatCurrency(floor, property.currency)}
                  </p>
                )
              )}
            </div>

            <div>
              <label htmlFor="bid-message" className="sr-only">
                Anything to add
              </label>
              <textarea
                id="bid-message"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('bid.notePlaceholder')}
                className="w-full resize-y rounded-2xl border border-line bg-canvas px-4 py-3 text-[0.875rem] text-ink transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none"
              />
            </div>

            {errors.general && (
              <p
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[0.8125rem] text-red-700"
              >
                {errors.general}
              </p>
            )}

            <Button type="submit" variant="gold" className="w-full" disabled={busy}>
              {busy ? 'Placing…' : 'Place offer'}
            </Button>

            <p className="text-center text-[0.75rem] text-ink-faint">
              Signed in as {user.full_name}. Your name is shared with the seller, not the public.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
