import { useState } from 'react'
import { Eye, EyeOff, Star, Trash2 } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorNote,
  Loading,
  PageHeader,
  Panel,
  Table,
  Td,
  Th,
} from '@/components/admin/ui'
import { api } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { formatDate } from '@/lib/utils'
import type { ApiInsightCard, Page } from '@/types/api'

interface AdminInsight extends ApiInsightCard {
  is_published?: boolean
  view_count?: number
}

/** Publish, feature and retire articles. Writing happens in the editor below. */
export default function InsightsAdminPage() {
  const { data, loading, refetch } = useQuery<Page<AdminInsight>>('/admin/insights?per_page=48', {
    ttl: 0,
  })
  const rows = data?.items ?? []
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (id: string, work: () => Promise<unknown>) => {
    setBusyId(id)
    setError(null)
    try {
      await work()
      invalidate('/public/insights')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That change was not saved.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Insights"
        description="Market reports and guides. What is published here is what the public reads."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <Panel>
        {loading && rows.length === 0 ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No articles yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Article</Th>
                <Th>Category</Th>
                <Th>Published</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-canvas-alt">
                  <Td>
                    <div className="flex items-center gap-3">
                      {row.cover_url && (
                        <img
                          src={row.cover_url}
                          alt=""
                          aria-hidden
                          loading="lazy"
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <a
                          href={`/insights/${row.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-semibold text-ink hover:text-gold-600"
                        >
                          {row.title}
                        </a>
                        <p className="truncate text-[0.75rem] text-ink-muted">
                          {row.author_name ?? '—'} · {row.read_time} min read
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge>{row.category}</Badge>
                  </Td>
                  <Td className="text-[0.8125rem] text-ink-muted">
                    {row.published_at ? formatDate(row.published_at) : 'Not published'}
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() =>
                          run(row.id, () =>
                            api.patch(`/admin/insights/${row.id}`, {
                              is_featured: !row.is_featured,
                            }),
                          )
                        }
                        aria-label={row.is_featured ? 'Unfeature' : 'Feature'}
                        className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                      >
                        <Star
                          className={
                            row.is_featured
                              ? 'size-3.5 fill-gold-500 text-gold-500'
                              : 'size-3.5'
                          }
                          strokeWidth={2.2}
                        />
                      </button>

                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() =>
                          run(row.id, () =>
                            api.patch(`/admin/insights/${row.id}`, {
                              is_published: !(row.is_published ?? true),
                            }),
                          )
                        }
                        aria-label={row.is_published === false ? 'Publish' : 'Unpublish'}
                        className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-50"
                      >
                        {row.is_published === false ? (
                          <EyeOff className="size-3.5" strokeWidth={2.2} />
                        ) : (
                          <Eye className="size-3.5" strokeWidth={2.2} />
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => {
                          if (!window.confirm(`Delete "${row.title}"?`)) return
                          void run(row.id, () => api.delete(`/admin/insights/${row.id}`))
                        }}
                        aria-label="Delete"
                        className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2.2} />
                      </button>
                    </div>
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
