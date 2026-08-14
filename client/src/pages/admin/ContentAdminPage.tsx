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
  /** The four fields worth translating. Links are not language-specific. */
  const TRANSLATABLE = ['eyebrow', 'title', 'accent', 'body'] as const
  type Locale = 'en' | 'rw' | 'fr'

  const [locale, setLocale] = useState<Locale>('en')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  // One draft per language. English is the row's own columns; rw and fr live in
  // the `translations` blob, so a save has to write both shapes back.
  const [draft, setDraft] = useState(() => ({
    en: {
      eyebrow: block.eyebrow ?? '',
      title: block.title ?? '',
      accent: block.accent ?? '',
      body: block.body ?? '',
    },
    rw: readLocale(block, 'rw'),
    fr: readLocale(block, 'fr'),
    cta_label: block.cta_label ?? '',
    cta_href: block.cta_href ?? '',
  }))

  const set = (field: string, value: string) =>
    setDraft((d) => ({ ...d, [locale]: { ...d[locale], [field]: value } }))

  const current = draft[locale]

  /** Which languages have anything filled in — shown as a dot on the tab. */
  const filled = (l: Locale) => TRANSLATABLE.some((f) => draft[l][f].trim())

  const save = async () => {
    setBusy(true)
    try {
      // Empty translation fields are dropped rather than stored as "", so a
      // blank means "not translated" and the merge falls through to English.
      const packLocale = (l: Locale) => {
        const entries = TRANSLATABLE.map((f) => [f, draft[l][f].trim()]).filter(([, v]) => v)
        return entries.length ? Object.fromEntries(entries) : undefined
      }
      const translations: Record<string, unknown> = {}
      const rw = packLocale('rw')
      const fr = packLocale('fr')
      if (rw) translations.rw = rw
      if (fr) translations.fr = fr

      await api.patch(`/admin/content-blocks/${block.id}`, {
        eyebrow: draft.en.eyebrow || null,
        title: draft.en.title || null,
        accent: draft.en.accent || null,
        body: draft.en.body || null,
        cta_label: draft.cta_label || null,
        cta_href: draft.cta_href || null,
        translations: Object.keys(translations).length ? translations : null,
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
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-line p-0.5">
            {(['en', 'rw', 'fr'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-[0.75rem] font-bold uppercase transition-colors',
                  locale === l ? 'bg-ink text-canvas' : 'text-ink-soft hover:text-ink',
                )}
              >
                {l}
                {l !== 'en' && filled(l) && (
                  <span className="ml-1 inline-block size-1.5 rounded-full bg-gold-500 align-middle" />
                )}
              </button>
            ))}
          </div>
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
        </div>
      }
    >
      <div className="space-y-3.5 p-5">
        {locale !== 'en' && (
          <p className="rounded-xl border border-line bg-canvas-alt px-3.5 py-2.5 text-[0.8125rem] text-ink-muted">
            Anything left blank falls back to the English. Saving writes every language at once, so
            update this tab whenever you change the English.
          </p>
        )}

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Eyebrow">
            <input className={FIELD} value={current.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
          </Field>
          <Field label="Title">
            <input className={FIELD} value={current.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Accent" hint="The gold half of the heading">
            <input className={FIELD} value={current.accent} onChange={(e) => set('accent', e.target.value)} />
          </Field>
        </div>

        <Field label="Body">
          <textarea
            rows={4}
            className={cn(FIELD, 'h-auto py-2.5')}
            value={current.body}
            onChange={(e) => set('body', e.target.value)}
          />
        </Field>

        {locale === 'en' && (
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
        )}
      </div>
    </Panel>
  )
}


/** Pull one locale's overrides out of the `translations` blob. */
function readLocale(block: ContentBlock, locale: string) {
  const found = (block.translations?.[locale] ?? {}) as Record<string, unknown>
  const text = (key: string) => (typeof found[key] === 'string' ? (found[key] as string) : '')
  return {
    eyebrow: text('eyebrow'),
    title: text('title'),
    accent: text('accent'),
    body: text('body'),
  }
}
