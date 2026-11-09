import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Archive, Eye, FilePlus2, PencilLine, Save, Star } from 'lucide-react'
import { api } from '@/shared/api/client'
import type { AgreementTemplateOut, PlaceholderOut } from '@/shared/api/types'
import { formatDateTime } from '@/shared/lib/format'
import { useApiMutation } from '@/shared/lib/useApiMutation'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardHeader } from '@/shared/ui/Card'
import { ConfirmDialog } from '@/shared/ui/Dialog'
import { EmptyState, ErrorState } from '@/shared/ui/EmptyState'
import { Field, FormError, Input, Textarea } from '@/shared/ui/Form'
import { Tabs } from '@/shared/ui/Misc'
import { PageHeader } from '@/shared/ui/PageHeader'
import { SkeletonRows } from '@/shared/ui/Spinner'
import { cn } from '@/shared/ui/cn'
import { usePlaceholders } from './DocumentPage'

type Draft = { name: string; description: string; title: string; body: string }
const EMPTY: Draft = { name: '', description: '', title: '', body: '' }

export default function TemplatesPage() {
  const list = useQuery({ queryKey: ['agreement-templates'], queryFn: () => api.get<AgreementTemplateOut[]>('/agreement-templates') })
  const [selected, setSelected] = useState<number | 'new' | null>(null)

  useEffect(() => {
    if (selected === null && list.data?.length) setSelected(list.data[0].id)
  }, [list.data, selected])

  const current = selected === 'new' ? null : list.data?.find((t) => t.id === selected) ?? null

  return (
    <>
      <PageHeader
        title="Agreement templates"
        description="The wording used to draw up agreement documents. Changes apply to new documents; signed documents never change."
        actions={
          <Button icon={FilePlus2} onClick={() => setSelected('new')}>
            New template
          </Button>
        }
      />
      {list.error ? (
        <Card><ErrorState error={list.error} onRetry={list.refetch} /></Card>
      ) : !list.data ? (
        <Card padded={false}><SkeletonRows /></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-4 xl:col-span-3">
            <Card padded={false}>
              {list.data.length ? (
                <ul className="divide-y divide-slate-100">
                  {list.data.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(t.id)}
                        className={cn(
                          'flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                          selected === t.id && 'bg-brand-50/60 hover:bg-brand-50/60',
                        )}
                      >
                        <span className="flex w-full items-center justify-between gap-2">
                          <span className="min-w-0 truncate font-medium text-slate-900">{t.name}</span>
                          {t.is_default ? <Badge tone="gold">Default</Badge> : null}
                        </span>
                        <span className="text-xs text-slate-500">
                          v{t.version} · {t.documents} document{t.documents === 1 ? '' : 's'} · {formatDateTime(t.updated_at)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FilePlus2} title="No templates" description="Create one to draw up agreement documents." />
              )}
            </Card>
          </div>
          <div className="min-w-0 lg:col-span-8 xl:col-span-9">
            {selected === 'new' || current ? (
              <Editor key={selected ?? 'none'} template={current} onSaved={(t) => setSelected(t.id)} />
            ) : null}
          </div>
        </div>
      )}
    </>
  )
}

function Editor({ template, onSaved }: { template: AgreementTemplateOut | null; onSaved: (t: AgreementTemplateOut) => void }) {
  const isNew = !template
  const [v, setV] = useState<Draft>(template ? { name: template.name, description: template.description, title: template.title, body: template.body } : EMPTY)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [archiving, setArchiving] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const placeholders = usePlaceholders()
  const dirty = isNew ? !!(v.name || v.body) : v.name !== template.name || v.description !== template.description || v.title !== template.title || v.body !== template.body

  const preview = useDebouncedPreview(v.title, v.body)
  const canSave = dirty && v.name.trim().length >= 2 && v.title.trim().length >= 2 && v.body.trim().length >= 10
  const save = useApiMutation(
    () => (isNew ? api.post<AgreementTemplateOut>('/agreement-templates', v) : api.patch<AgreementTemplateOut>(`/agreement-templates/${template.id}`, v)),
    { success: isNew ? 'Template created' : 'Template saved', invalidate: [['agreement-templates']], onSuccess: onSaved },
  )
  const makeDefault = useApiMutation(() => api.post<AgreementTemplateOut>(`/agreement-templates/${template!.id}/default`), {
    success: 'Default template updated',
    invalidate: [['agreement-templates']],
  })
  const archive = useApiMutation(() => api.post<AgreementTemplateOut>(`/agreement-templates/${template!.id}/archive`), {
    success: 'Template archived',
    invalidate: [['agreement-templates']],
    onSuccess: () => setArchiving(false),
  })

  const insert = (key: string) => {
    const el = bodyRef.current
    const token = `{{${key}}}`
    if (!el) return setV((d) => ({ ...d, body: d.body + token }))
    const start = el.selectionStart ?? v.body.length
    const end = el.selectionEnd ?? start
    const body = v.body.slice(0, start) + token + v.body.slice(end)
    setV((d) => ({ ...d, body }))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const grouped = useMemo(() => {
    const out: Record<string, PlaceholderOut[]> = {}
    placeholders.data?.forEach((p) => (out[p.group] ??= []).push(p))
    return out
  }, [placeholders.data])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={isNew ? 'New template' : template.name}
          description={isNew ? 'Write the agreement text. Use placeholders for details that change per tenant.' : `Version ${template.version}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={Save} disabled={!canSave} loading={save.isPending} onClick={() => save.mutate(undefined)}>
                {isNew ? 'Create template' : 'Save template'}
              </Button>
              {!isNew ? (
              <>
                {!template.is_default ? (
                  <Button size="sm" variant="outline" icon={Star} loading={makeDefault.isPending} onClick={() => makeDefault.mutate(undefined)}>
                    Make default
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" icon={Archive} onClick={() => setArchiving(true)}>
                  Archive
                </Button>
              </>
              ) : null}
            </div>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Template name" required>
            <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. Commercial unit lease (Kinyarwanda)" />
          </Field>
          <Field label="Description">
            <Input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
          </Field>
          <Field label="Document title" required className="sm:col-span-2">
            <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="AMASEZERANO Y'UBUKODE…" />
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
        <Card padded={false} className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 pt-3 sm:px-5">
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'edit', label: <span className="inline-flex items-center gap-1.5"><PencilLine className="size-4" /> Text</span> },
                { value: 'preview', label: <span className="inline-flex items-center gap-1.5"><Eye className="size-4" /> Preview</span> },
              ]}
            />
          </div>
          <div className="p-4 sm:p-5">
            {tab === 'edit' ? (
              <Field label="Agreement text" hint="Blank line = new paragraph · **bold** · - bullet · 1. numbered list · {{placeholder}} is filled per document">
                <Textarea
                  ref={bodyRef}
                  rows={24}
                  value={v.body}
                  onChange={(e) => setV({ ...v, body: e.target.value })}
                  className="font-mono text-[13px] leading-relaxed"
                />
              </Field>
            ) : (
              <div className="rounded-lg bg-slate-100 p-3 sm:p-6">
                <article className="mx-auto max-w-[210mm] rounded-lg bg-white px-5 py-7 shadow-sm sm:px-10">
                  {preview.html ? (
                    <div className="doc-sheet" dangerouslySetInnerHTML={{ __html: preview.html }} />
                  ) : (
                    <p className="text-sm text-slate-500">{preview.error || 'Rendering preview…'}</p>
                  )}
                </article>
                <p className="mt-2 text-center text-xs text-slate-500">Preview uses sample tenant and unit details.</p>
              </div>
            )}
            <FormError message={save.errorText} />
          </div>
        </Card>

        <Card className="min-w-0 self-start xl:sticky xl:top-20">
          <CardHeader title="Placeholders" description="Click to insert at the cursor." className="mb-3" />
          <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      title={`{{${p.key}}}${p.source === 'manual' ? ' — typed in per document' : ' — filled automatically'}`}
                      onClick={() => {
                        setTab('edit')
                        insert(p.key)
                      }}
                      className={cn(
                        'rounded-md border px-2 py-1 text-xs transition-colors',
                        p.source === 'manual'
                          ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">Amber items are typed in per document (e.g. amounts in words).</p>
        </Card>
      </div>

      {!isNew ? (
        <ConfirmDialog
          open={archiving}
          onClose={() => setArchiving(false)}
          onConfirm={() => archive.mutate(undefined)}
          loading={archive.isPending}
          title={`Archive “${template.name}”?`}
          description="It will no longer be offered for new documents. Documents already drawn up from it are unaffected."
          confirmLabel="Archive template"
          tone="danger"
        />
      ) : null}
    </div>
  )
}

function useDebouncedPreview(title: string, body: string) {
  const [state, setState] = useState<{ html: string; error: string | null }>({ html: '', error: null })
  useEffect(() => {
    if (body.trim().length < 1) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      api
        .post<{ html: string }>('/agreement-templates/preview', { title, body })
        .then((r) => !ctrl.signal.aborted && setState({ html: r.html, error: null }))
        .catch((e: Error) => !ctrl.signal.aborted && setState({ html: '', error: e.message }))
    }, 350)
    return () => {
      ctrl.abort()
      clearTimeout(t)
    }
  }, [title, body])
  return state
}
