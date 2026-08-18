import { useState } from 'react'
import { Check, Search, Wallet, X } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorNote,
  FIELD,
  Loading,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/admin/ui'
import { api } from '@/lib/api'
import { invalidate, useLiveQuery, useQuery } from '@/lib/queries'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { ApiAdminBid, ApiSaleRecord, ApiSaleRecordDetail, Page } from '@/types/api'

const BID_TONE: Record<string, 'good' | 'warn' | 'bad' | 'info' | 'neutral'> = {
  pending: 'warn',
  accepted: 'good',
  rejected: 'bad',
  withdrawn: 'neutral',
  outbid: 'info',
}

/** Offers across every listing, and the record of what has already sold. */
export default function OffersAdminPage() {
  const [tab, setTab] = useState<'offers' | 'history'>('offers')

  return (
    <>
      <PageHeader
        title="Offers & sales"
        description="Every bid buyers have placed, and the parcels we have already sold."
      />

      <div className="mb-5 flex gap-2">
        {(
          [
            ['offers', 'Offers'],
            ['history', 'Sale history'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors',
              tab === id
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'offers' ? <OfferList /> : <SaleHistory />}
    </>
  )
}

function OfferList() {
  const { data, loading, refetch } = useLiveQuery<Page<ApiAdminBid>>(
    '/admin/properties/bids/inbox?per_page=48',
    20_000,
  )
  const rows = data?.items ?? []
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const decide = async (id: string, decision: 'accept' | 'reject') => {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/admin/properties/bids/${id}/${decision}`, { note: null })
      invalidate('/admin/')
      refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && rows.length === 0) return <Loading />

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}
      <Panel>
        {rows.length === 0 ? (
          <Empty
            title="No offers yet"
            detail="Offers appear here the moment a signed-in buyer bids on a listing that accepts them."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Property</Th>
                <Th>Bidder</Th>
                <Th className="text-right">Offer</Th>
                <Th>Status</Th>
                <Th className="text-right">Placed</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((bid) => (
                <tr key={bid.id} className="transition-colors hover:bg-canvas-alt">
                  <Td>
                    <p className="font-semibold text-ink">{bid.property_title ?? '—'}</p>
                    <p className="font-mono text-[0.75rem] text-ink-muted">
                      {bid.property_reference}
                    </p>
                  </Td>
                  <Td>
                    <p className="font-medium text-ink">{bid.bidder_name}</p>
                    <p className="text-[0.75rem] text-ink-muted">
                      {bid.bidder_phone ?? bid.bidder_email}
                    </p>
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">
                    {formatCurrency(bid.amount, bid.currency)}
                  </Td>
                  <Td>
                    <Badge tone={BID_TONE[bid.status] ?? 'neutral'}>{bid.status}</Badge>
                  </Td>
                  <Td className="text-right text-[0.8125rem] whitespace-nowrap text-ink-muted">
                    {formatDate(bid.created_at)}
                  </Td>
                  <Td className="text-right">
                    {bid.status === 'pending' ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === bid.id}
                          onClick={() => decide(bid.id, 'accept')}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[0.75rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          <Check className="size-3.5" strokeWidth={2.6} />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busyId === bid.id}
                          onClick={() => decide(bid.id, 'reject')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                        >
                          <X className="size-3.5" strokeWidth={2.6} />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[0.75rem] text-ink-faint">
                        {bid.decided_at ? formatDate(bid.decided_at) : '—'}
                      </span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  )
}

function SaleHistory() {
  const [q, setQ] = useState('')
  const [openSale, setOpenSale] = useState<ApiSaleRecord | null>(null)
  const { data, loading } = useQuery<Page<ApiSaleRecord>>(
    `/admin/properties/history/records?per_page=48${q ? `&q=${encodeURIComponent(q)}` : ''}`,
    { ttl: 0 },
  )
  const rows = data?.items ?? []

  return (
    <Panel>
      <div className="border-b border-line p-4">
        <div className="relative">
          <label htmlFor="sale-q" className="sr-only">
            Search past sales
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
            strokeWidth={2}
          />
          <input
            id="sale-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Reference, UPI, title or owner…"
            className={`${FIELD} pl-10`}
          />
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty
          title="Nothing sold yet"
          detail="Closing a listing out records it here — and frees its reference and UPI for a future re-listing."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Property</Th>
              <Th>UPI</Th>
              <Th>Owner</Th>
              <Th>Buyer</Th>
              <Th className="text-right">Sold for</Th>
              <Th className="text-right">Date</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => setOpenSale(row)}
                className="cursor-pointer transition-colors hover:bg-canvas-alt"
              >
                <Td>
                  <p className="font-semibold text-ink">{row.title}</p>
                  <p className="font-mono text-[0.75rem] text-ink-muted">{row.reference_number}</p>
                </Td>
                <Td className="font-mono text-[0.75rem] text-ink-muted">{row.upi ?? '—'}</Td>
                <Td>{row.owner_name ?? '—'}</Td>
                <Td>{row.buyer_name ?? '—'}</Td>
                <Td className="text-right font-semibold tabular-nums">
                  {row.sold_price ? formatCurrency(row.sold_price, row.currency) : '—'}
                </Td>
                <Td className="text-right text-[0.8125rem] whitespace-nowrap text-ink-muted">
                  {formatDate(row.sold_at)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {openSale && <SaleDetail record={openSale} onClose={() => setOpenSale(null)} />}
    </Panel>
  )
}

/** What a sold plot earned — opened by clicking its row. */
function SaleDetail({ record, onClose }: { record: ApiSaleRecord; onClose: () => void }) {
  const { data, loading } = useQuery<ApiSaleRecordDetail>(
    `/admin/properties/history/records/${record.id}`,
  )
  const commissions = data?.commissions ?? []
  const earned = commissions.reduce((n, c) => n + c.amount, 0)

  return (
    <div
      className="fixed inset-0 z-60 flex justify-end bg-navy-950/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto border-l border-line bg-surface"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-[1.0625rem] font-semibold text-ink">
              {record.title}
            </h2>
            <p className="mt-0.5 font-mono text-[0.75rem] text-ink-muted">
              {record.reference_number}
              {record.upi ? ` · ${record.upi}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-canvas-alt hover:text-ink"
          >
            <X className="size-4" strokeWidth={2.2} />
          </button>
        </header>

        <dl className="divide-y divide-line/70">
          {[
            ['Sold for', record.sold_price ? formatCurrency(record.sold_price, record.currency) : '—'],
            ['Sold on', formatDate(record.sold_at)],
            ['Seller', record.owner_name ?? '—'],
            ['Buyer', record.buyer_name ?? '—'],
            ['Where', [record.sector, record.district].filter(Boolean).join(', ') || '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-5 py-3">
              <dt className="text-[0.875rem] text-ink-muted">{label}</dt>
              <dd className="text-[0.875rem] font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="border-t border-line">
          <h3 className="flex items-center gap-2 bg-canvas-alt px-5 py-3 text-[0.75rem] font-bold tracking-[0.14em] text-ink-soft uppercase">
            <Wallet className="size-3.5 text-gold-600" strokeWidth={2.2} />
            Commission earned
          </h3>

          {loading ? (
            <Loading />
          ) : commissions.length === 0 ? (
            <p className="px-5 py-8 text-center text-[0.875rem] text-ink-muted">
              No commission was booked against this sale.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-line/70">
                {commissions.map((c) => (
                  <li key={c.id} className="px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-ink">{c.agent_name ?? 'Unassigned'}</p>
                      <p className="font-display text-[1.0625rem] font-semibold text-gold-600 tabular-nums">
                        {formatCurrency(c.amount, c.currency)}
                      </p>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-ink-muted">
                      <span>
                        {c.basis === 'percent' && c.rate != null
                          ? `${c.rate}% of ${c.base_amount ? formatCurrency(c.base_amount, c.currency) : 'the sale'}`
                          : 'Fixed fee'}
                      </span>
                      <Badge tone={c.status === 'received' ? 'good' : 'warn'}>{c.status}</Badge>
                      <span>earned {formatDate(c.earned_on)}</span>
                    </p>
                  </li>
                ))}
              </ul>

              {commissions.length > 1 && (
                <p className="flex items-baseline justify-between gap-3 border-t border-line px-5 py-3.5">
                  <span className="text-[0.875rem] font-semibold text-ink">Total</span>
                  <span className="font-display text-[1.0625rem] font-semibold text-ink tabular-nums">
                    {formatCurrency(earned, commissions[0].currency)}
                  </span>
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
