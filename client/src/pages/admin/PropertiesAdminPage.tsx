import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Banknote, Search, ShieldX, Star } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorNote,
  FIELD,
  Loading,
  PageHeader,
  Panel,
  STATUS_TONE,
  Table,
  Td,
  Th,
} from '@/components/admin/ui'
import { Button } from '@/components/ui/Button'
import { api, qs } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { formatCompactCurrency } from '@/lib/utils'
import type { ApiAdminPropertyCard, Page } from '@/types/api'

const STATUSES = [
  'all',
  'pending_review',
  'draft',
  'available',
  'reserved',
  'under_offer',
  'sold',
  'rented',
  'withdrawn',
]

export default function PropertiesAdminPage() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Typing shouldn't hit the API on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery(search)
      setPage(1)
    }, 280)
    return () => window.clearTimeout(id)
  }, [search])

  const path = useMemo(
    () =>
      `/admin/properties${qs({
        q: query || undefined,
        status: status === 'all' ? undefined : status,
        page,
        per_page: 20,
      })}`,
    [query, status, page],
  )

  const { data, loading, refetch } = useQuery<Page<ApiAdminPropertyCard>>(path, { ttl: 0 })

  const act = async (id: string, run: () => Promise<unknown>) => {
    setBusyId(id)
    setError(null)
    try {
      await run()
      invalidate('/admin/')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through.')
    } finally {
      setBusyId(null)
    }
  }

  const verify = (id: string, approve: boolean) =>
    act(id, () =>
      api.post(`/admin/properties/${id}/verify`, {
        approve,
        reason: approve ? null : 'Rejected from the console',
      }),
    )

  /**
   * Closing a listing out archives it and writes a sale record — which also
   * releases the reference and UPI so the parcel can be listed again later.
   */
  const sell = (id: string, reference: string) => {
    const price = window.prompt(
      `Record the sale of ${reference}.\n\nSale price in RWF (leave blank to use the asking price):`,
    )
    if (price === null) return
    const buyer = window.prompt('Buyer name (optional):') ?? ''
    return act(id, () =>
      api.post(`/admin/properties/${id}/sell`, {
        sold_price: price ? Number(price) : null,
        buyer_name: buyer || null,
      }),
    )
  }

  const setStatusOf = (id: string, next: string) =>
    act(id, () => api.post(`/admin/properties/${id}/status`, { status: next, reason: null }))

  const rows = data?.items ?? []

  return (
    <>
      <PageHeader
        title="Properties"
        description="Verify what sellers and agents file, then publish it to the marketplace."
        action={
          <Button to="/admin/properties/new" variant="gold" size="sm">
            Add property
          </Button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <Panel>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="prop-q" className="sr-only">
              Search listings
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={2}
            />
            <input
              id="prop-q"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Reference, UPI, title or district…"
              className={`${FIELD} pl-10`}
            />
          </div>

          <label htmlFor="prop-status" className="sr-only">
            Filter by status
          </label>
          <select
            id="prop-status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className={`${FIELD} sm:w-56`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'Every status' : s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty
            title="Nothing here"
            detail="No listing matches that filter. Try a different status or search."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Listing</Th>
                <Th>Reference</Th>
                <Th>Status</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-canvas-alt">
                  <Td>
                    <div className="flex items-center gap-3">
                      {row.cover_url ? (
                        <img
                          src={row.cover_url}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="size-11 shrink-0 rounded-lg bg-canvas-alt" aria-hidden />
                      )}
                      <div className="min-w-0">
                        <Link
                          to={`/properties/${row.slug}`}
                          target="_blank"
                          className="block truncate font-semibold text-ink hover:text-gold-600"
                        >
                          {row.title}
                        </Link>
                        <p className="truncate text-[0.75rem] text-ink-muted">
                          {row.category_label} · {row.district ?? '—'}
                          {row.is_featured && (
                            <Star
                              className="ml-1.5 inline size-3 fill-gold-500 text-gold-500"
                              strokeWidth={0}
                            />
                          )}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td className="font-mono text-[0.75rem] text-ink-muted">
                    {row.reference_number}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[row.status] ?? 'neutral'}>
                      {row.status.replace('_', ' ')}
                    </Badge>
                  </Td>
                  <Td className="text-right tabular-nums">
                    {formatCompactCurrency(
                      row.intent === 'rent' ? (row.rent_amount ?? 0) : (row.price ?? 0),
                      row.currency,
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {row.status === 'pending_review' ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => verify(row.id, true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[0.75rem] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            <BadgeCheck className="size-3.5" strokeWidth={2.4} />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => verify(row.id, false)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                          >
                            <ShieldX className="size-3.5" strokeWidth={2.4} />
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busyId === row.id}
                            onClick={() => sell(row.id, row.reference_number)}
                            title="Record the sale and close this listing out"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-gold-500 hover:text-gold-600 disabled:opacity-50"
                          >
                            <Banknote className="size-3.5" strokeWidth={2.4} />
                            Sold
                          </button>
                          <label htmlFor={`st-${row.id}`} className="sr-only">
                            Change status
                          </label>
                          <select
                            id={`st-${row.id}`}
                            value={row.status}
                            disabled={busyId === row.id}
                            onChange={(e) => setStatusOf(row.id, e.target.value)}
                            className="h-8 rounded-lg border border-line bg-canvas px-2 text-[0.75rem] text-ink focus:border-gold-500 focus:outline-none disabled:opacity-50"
                          >
                            {STATUSES.filter((s) => s !== 'all' && s !== 'pending_review').map(
                              (s) => (
                                <option key={s} value={s}>
                                  {s.replace('_', ' ')}
                                </option>
                              ),
                            )}
                          </select>
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3.5">
            <p className="text-[0.8125rem] text-ink-muted">
              Page {data.page} of {data.pages} · {data.total} listings
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={data.page <= 1}
                className="rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={data.page >= data.pages}
                className="rounded-lg border border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-line-strong disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Panel>
    </>
  )
}
