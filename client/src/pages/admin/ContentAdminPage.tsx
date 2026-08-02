import { useEffect, useMemo, useState } from 'react'
import { Check, Save } from 'lucide-react'
import {
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
import type { ContentBlock } from '@/types/api'

/**
 * Page copy. Every heading, sub-heading and paragraph the marketing site shows
 * lives here, grouped by the page it belongs to.
 */
export default function ContentAdminPage() {
  const { data, loading, refetch } = useQuery<ContentBlock[]>('/admin/content-blocks', {
    ttl: 0,
  })
  const blocks = useMemo(() => data ?? [], [data])

  const [page, setPage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pages = useMemo(
    () => [...new Set(blocks.map((b) => b.page))].sort(),
    [blocks],
  )

  useEffect(() => {
    if (pages.length && !pages.includes(page ?? '')) setPage(pages[0])
  }, [pages, page])

  if (loading && blocks.length === 0) return <Loading label="Reading page copy…" />

  const visible = blocks.filter((b) => b.page === page)

  return (
    <>
      <PageHeader
        title="Page copy"
        description="The words on every marketing page. Saving publishes immediately."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="mb-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPage(p)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors',
              p === page
                ? 'border-ink bg-ink text-canvas'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink',
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Panel>
          <Empty title="Nothing on this page yet" />
        </Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {visible.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              onSaved={() => {
                invalidate('/public/content')
                void refetch()
              }}
              onError={setError}
            />
          ))}
        </div>
      )}
    </>
  )
}

function BlockEditor({
  block,
  onSaved,
  onError,
}: {
  block: ContentBlock
  onSaved: () => void
  onError: (message: string) => void
}) {
  const [draft, setDraft] = useState({
    eyebrow: block.eyebrow ?? '',
    title: block.title ?? '',
    accent: block.accent ?? '',
    body: block.body ?? '',
    cta_label: block.cta_label ?? '',
    cta_href: block.cta_href ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await api.patch(`/admin/content-blocks/${block.id}`, {
        eyebrow: draft.eyebrow || null,
        title: draft.title || null,
        accent: draft.accent || null,
        body: draft.body || null,
        cta_label: draft.cta_label || null,
        cta_href: draft.cta_href || null,
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'That block was not saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title={block.label ?? block.key}
      action={
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[0.75rem] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saved ? (
            <Check className="size-3.5" strokeWidth={2.6} />
          ) : (
            <Save className="size-3.5" strokeWidth={2.2} />
          )}
          {saved ? 'Saved' : 'Save'}
        </button>
      }
    >
      <div className="space-y-3.5 p-5">
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Eyebrow">
            <input
              className={FIELD}
              value={draft.eyebrow}
              onChange={(e) => setDraft((d) => ({ ...d, eyebrow: e.target.value }))}
            />
          </Field>
          <Field label="Title">
            <input
              className={FIELD}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </Field>
          <Field label="Accent" hint="The gold half of the heading">
            <input
              className={FIELD}
              value={draft.accent}
              onChange={(e) => setDraft((d) => ({ ...d, accent: e.target.value }))}
            />
          </Field>
        </div>

        <Field label="Body">
          <textarea
            rows={4}
            className={cn(FIELD, 'h-auto py-2.5')}
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          />
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Button label">
            <input
              className={FIELD}
              value={draft.cta_label}
              onChange={(e) => setDraft((d) => ({ ...d, cta_label: e.target.value }))}
            />
          </Field>
          <Field label="Button link">
            <input
              className={FIELD}
              value={draft.cta_href}
              onChange={(e) => setDraft((d) => ({ ...d, cta_href: e.target.value }))}
            />
          </Field>
        </div>
      </div>
    </Panel>
  )
}
