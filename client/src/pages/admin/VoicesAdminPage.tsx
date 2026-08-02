import { useState } from 'react'
import { Plus, Save, Star, Trash2 } from 'lucide-react'
import {
  Badge,
  Empty,
  ErrorNote,
  FIELD,
  Field,
  Loading,
  PageHeader,
  Panel,
} from '@/components/admin/ui'
import { api } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'
import type { ApiFaq, ApiTestimonial } from '@/types/api'

/** Client quotes and page FAQs — the two lists staff edit most often. */
export default function VoicesAdminPage() {
  const [tab, setTab] = useState<'testimonials' | 'faqs'>('testimonials')
  const [error, setError] = useState<string | null>(null)

  return (
    <>
      <PageHeader
        title="Testimonials & FAQs"
        description="Client quotes and the questions each page answers."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mb-5 flex gap-2">
        {(['testimonials', 'faqs'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'rounded-full border px-4 py-2 text-[0.875rem] font-medium capitalize transition-colors',
              t === tab
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'testimonials' ? (
        <TestimonialList onError={setError} />
      ) : (
        <FaqList onError={setError} />
      )}
    </>
  )
}

/* ----------------------------------------------------------- testimonials */

function TestimonialList({ onError }: { onError: (m: string) => void }) {
  const { data, loading, refetch } = useQuery<ApiTestimonial[]>('/admin/testimonials', { ttl: 0 })
  const rows = data ?? []
  const [busyId, setBusyId] = useState<string | null>(null)

  const run = async (id: string | null, work: () => Promise<unknown>) => {
    setBusyId(id)
    try {
      await work()
      invalidate('/public/testimonials')
      await refetch()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'That change was not saved.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading && rows.length === 0) return <Loading />
  if (rows.length === 0) return <Panel><Empty title="No testimonials yet" /></Panel>

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {rows.map((row) => (
        <Panel
          key={row.id}
          title={row.author_name}
          action={
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                {Array.from({ length: row.rating }).map((_, i) => (
                  <Star key={i} className="size-3 fill-gold-500 text-gold-500" strokeWidth={0} />
                ))}
              </span>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => {
                  if (!window.confirm(`Remove the quote from ${row.author_name}?`)) return
                  void run(row.id, () => api.delete(`/admin/testimonials/${row.id}`))
                }}
                aria-label="Delete"
                className="grid size-7 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="size-3.5" strokeWidth={2.2} />
              </button>
            </span>
          }
        >
          <div className="p-5">
            <p className="text-[0.9375rem] leading-relaxed text-ink-soft">“{row.quote}”</p>
            <p className="mt-3 text-[0.8125rem] text-ink-muted">
              {row.author_role} · {row.location}
            </p>
            {row.milestone && (
              <p className="mt-2">
                <Badge tone="warn">{row.milestone}</Badge>
              </p>
            )}
          </div>
        </Panel>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- faqs */

function FaqList({ onError }: { onError: (m: string) => void }) {
  const { data, loading, refetch } = useQuery<ApiFaq[]>('/admin/faqs', { ttl: 0 })
  const rows = data ?? []
  const [busy, setBusy] = useState(false)

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await work()
      invalidate('/public/faqs')
      await refetch()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'That change was not saved.')
    } finally {
      setBusy(false)
    }
  }

  const add = () => {
    const page = window.prompt('Which page is this FAQ for? (home, sell, contact…)')
    if (!page) return
    const question = window.prompt('The question')
    if (!question) return
    const answer = window.prompt('The answer')
    if (!answer) return
    void run(() =>
      api.post('/admin/faqs', {
        page,
        question,
        answer,
        display_order: rows.filter((r) => r.page === page).length + 1,
      }),
    )
  }

  if (loading && rows.length === 0) return <Loading />

  const pages = [...new Set(rows.map((r) => r.page))].sort()

  return (
    <div className="space-y-5">
      <Panel
        title="All questions"
        action={
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <Plus className="size-3.5" strokeWidth={2.4} />
            Add FAQ
          </button>
        }
      >
        {rows.length === 0 ? (
          <Empty title="No FAQs yet" />
        ) : (
          <div className="divide-y divide-line/70">
            {pages.map((page) => (
              <div key={page}>
                <p className="bg-canvas-alt px-5 py-2 text-[0.6875rem] font-bold tracking-[0.14em] text-ink-faint uppercase">
                  {page}
                </p>
                {rows
                  .filter((r) => r.page === page)
                  .map((row) => (
                    <FaqRow key={row.id} faq={row} busy={busy} onChange={run} />
                  ))}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function FaqRow({
  faq,
  busy,
  onChange,
}: {
  faq: ApiFaq
  busy: boolean
  onChange: (work: () => Promise<unknown>) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ question: faq.question, answer: faq.answer })

  return (
    <div className="border-t border-line/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 text-left text-[0.875rem] font-medium text-ink transition-colors hover:bg-canvas-alt"
      >
        {faq.question}
      </button>

      {open && (
        <div className="space-y-3.5 bg-canvas-alt px-5 py-4">
          <Field label="Question">
            <input
              className={FIELD}
              value={draft.question}
              onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
            />
          </Field>
          <Field label="Answer">
            <textarea
              rows={4}
              className={cn(FIELD, 'h-auto py-2.5')}
              value={draft.answer}
              onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('Delete this FAQ?')) return
                onChange(() => api.delete(`/admin/faqs/${faq.id}`))
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" strokeWidth={2.2} />
              Delete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(() => api.patch(`/admin/faqs/${faq.id}`, draft))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[0.8125rem] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Save className="size-3.5" strokeWidth={2.2} />
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
