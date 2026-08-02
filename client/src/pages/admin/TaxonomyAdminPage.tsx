import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Plus, Save, Trash2 } from 'lucide-react'
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
import type { ApiCategory, ApiFormField, ApiSubCategory } from '@/types/api'

//: Mirrors the API's FieldType enum exactly — anything else is rejected.
const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'multiselect',
  'checkbox',
  'date',
  'section_header',
]

/**
 * Categories, the property types under them, and the form each type asks for.
 * This is the same taxonomy the public Sell page and the marketplace read, so
 * a field added here appears on both without a deploy.
 */
export default function TaxonomyAdminPage() {
  const { data, loading, refetch } = useQuery<ApiCategory[]>('/public/taxonomy', { ttl: 0 })
  const categories = data ?? []

  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [subId, setSubId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Keep a valid selection as the list loads or changes underneath us.
  useEffect(() => {
    if (categories.length === 0) return
    if (!categories.some((c) => c.id === categoryId)) setCategoryId(categories[0].id)
  }, [categories, categoryId])

  const category = categories.find((c) => c.id === categoryId)
  const subcategories = category?.subcategories ?? []

  useEffect(() => {
    if (subcategories.length === 0) {
      setSubId(null)
      return
    }
    if (!subcategories.some((s) => s.id === subId)) setSubId(subcategories[0].id)
  }, [subcategories, subId])

  const subcategory = subcategories.find((s) => s.id === subId)

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
      invalidate('/public/taxonomy')
      await refetch()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That change was not saved.')
    } finally {
      setBusy(false)
    }
  }

  const addCategory = () => {
    const label = window.prompt('Name the new category')
    if (!label) return
    void run(() =>
      api.post('/admin/taxonomy/categories', {
        slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        label,
        display_order: categories.length + 1,
        is_active: true,
      }),
    )
  }

  const addSubcategory = () => {
    if (!category) return
    const label = window.prompt(`Name the new property type under ${category.label}`)
    if (!label) return
    void run(() =>
      api.post(`/admin/taxonomy/categories/${category.id}/subcategories`, {
        slug: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        label,
        display_order: subcategories.length + 1,
        is_active: true,
      }),
    )
  }

  if (loading && categories.length === 0) return <Loading label="Reading the taxonomy…" />

  return (
    <>
      <PageHeader
        title="Categories & forms"
        description="What sellers can list, and exactly which questions each property type asks."
      />

      {error && (
        <div className="mb-4">
          <ErrorNote message={error} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-12">
        {/* ---- categories ---- */}
        <Panel
          title="Categories"
          className="lg:col-span-3"
          action={
            <button
              type="button"
              onClick={addCategory}
              aria-label="Add category"
              className="grid size-7 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <Plus className="size-3.5" strokeWidth={2.4} />
            </button>
          }
        >
          <ul className="max-h-[32rem] overflow-y-auto">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-[0.875rem] transition-colors',
                    c.id === categoryId
                      ? 'bg-canvas-alt font-semibold text-ink'
                      : 'text-ink-soft hover:bg-canvas-alt',
                  )}
                >
                  <span className="truncate">{c.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[0.75rem] text-ink-faint">{c.subcategories.length}</span>
                    <ChevronRight className="size-3.5 text-ink-faint" strokeWidth={2.2} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ---- property types ---- */}
        <Panel
          title="Property types"
          className="lg:col-span-3"
          action={
            <button
              type="button"
              onClick={addSubcategory}
              aria-label="Add property type"
              disabled={!category}
              className="grid size-7 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
            >
              <Plus className="size-3.5" strokeWidth={2.4} />
            </button>
          }
        >
          {subcategories.length === 0 ? (
            <Empty title="No types yet" detail="Add the first property type for this category." />
          ) : (
            <ul className="max-h-[32rem] overflow-y-auto">
              {subcategories.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSubId(s.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-[0.875rem] transition-colors',
                      s.id === subId
                        ? 'bg-canvas-alt font-semibold text-ink'
                        : 'text-ink-soft hover:bg-canvas-alt',
                    )}
                  >
                    <span className="truncate capitalize">{s.label.toLowerCase()}</span>
                    <span className="shrink-0 text-[0.75rem] text-ink-faint">
                      {s.fields.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---- fields ---- */}
        <div className="lg:col-span-6">
          {subcategory ? (
            <FieldEditor
              subcategory={subcategory}
              busy={busy}
              onChange={(work) => void run(work)}
            />
          ) : (
            <Panel title="Form fields">
              <Empty title="Pick a property type" detail="Its form appears here." />
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ fields */

function FieldEditor({
  subcategory,
  busy,
  onChange,
}: {
  subcategory: ApiSubCategory
  busy: boolean
  onChange: (work: () => Promise<unknown>) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  const addField = () => {
    const label = window.prompt('Label for the new field')
    if (!label) return
    onChange(() =>
      api.post(`/admin/taxonomy/subcategories/${subcategory.id}/fields`, {
        name: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        label,
        type: 'text',
        width: 'full',
        is_required: false,
        display_order: subcategory.fields.length + 1,
        is_active: true,
      }),
    )
  }

  return (
    <Panel
      title={`Form · ${subcategory.label}`}
      action={
        <button
          type="button"
          onClick={addField}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[0.75rem] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          <Plus className="size-3.5" strokeWidth={2.4} />
          Add field
        </button>
      }
    >
      {subcategory.fields.length === 0 ? (
        <Empty title="No questions yet" detail="Add the first field this property type asks for." />
      ) : (
        <ul className="max-h-[32rem] divide-y divide-line/70 overflow-y-auto">
          {subcategory.fields.map((field) => (
            <li key={field.id}>
              <button
                type="button"
                onClick={() => setOpenId(openId === field.id ? null : field.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-canvas-alt"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[0.875rem] font-medium text-ink">
                    {field.label}
                  </span>
                  <span className="block truncate font-mono text-[0.6875rem] text-ink-faint">
                    {field.name}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {field.is_required && <Badge tone="warn">required</Badge>}
                  <Badge>{field.type}</Badge>
                </span>
              </button>

              {openId === field.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="overflow-hidden border-t border-line/70 bg-canvas-alt"
                >
                  <FieldForm field={field} busy={busy} onChange={onChange} />
                </motion.div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function FieldForm({
  field,
  busy,
  onChange,
}: {
  field: ApiFormField
  busy: boolean
  onChange: (work: () => Promise<unknown>) => void
}) {
  const [draft, setDraft] = useState({
    label: field.label,
    type: field.type as string,
    width: field.width as string,
    unit: field.unit ?? '',
    help_text: field.help_text ?? '',
    placeholder: field.placeholder ?? '',
    options: (field.options ?? []).join('\n'),
    is_required: field.is_required,
    is_active: field.is_active,
  })

  const save = () =>
    onChange(() =>
      api.patch(`/admin/taxonomy/fields/${field.id}`, {
        label: draft.label,
        type: draft.type,
        width: draft.width,
        unit: draft.unit || null,
        help_text: draft.help_text || null,
        placeholder: draft.placeholder || null,
        options: draft.options
          ? draft.options.split('\n').map((o) => o.trim()).filter(Boolean)
          : null,
        is_required: draft.is_required,
        is_active: draft.is_active,
      }),
    )

  const remove = () => {
    if (!window.confirm(`Delete "${field.label}"? Existing listings keep their stored answer.`)) {
      return
    }
    onChange(() => api.delete(`/admin/taxonomy/fields/${field.id}`))
  }

  const needsOptions = draft.type === 'select' || draft.type === 'multiselect'

  return (
    <div className="space-y-3.5 p-5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Label">
          <input
            className={FIELD}
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          />
        </Field>
        <Field label="Type">
          <select
            className={FIELD}
            value={draft.type}
            onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Width">
          <select
            className={FIELD}
            value={draft.width}
            onChange={(e) => setDraft((d) => ({ ...d, width: e.target.value }))}
          >
            {['full', 'half', 'third'].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit" hint="Shown after the value, e.g. sqm">
          <input
            className={FIELD}
            value={draft.unit}
            onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
          />
        </Field>
      </div>

      <Field label="Placeholder">
        <input
          className={FIELD}
          value={draft.placeholder}
          onChange={(e) => setDraft((d) => ({ ...d, placeholder: e.target.value }))}
        />
      </Field>

      <Field label="Help text">
        <input
          className={FIELD}
          value={draft.help_text}
          onChange={(e) => setDraft((d) => ({ ...d, help_text: e.target.value }))}
        />
      </Field>

      {needsOptions && (
        <Field label="Options" hint="One per line">
          <textarea
            rows={5}
            className={`${FIELD} h-auto py-2.5`}
            value={draft.options}
            onChange={(e) => setDraft((d) => ({ ...d, options: e.target.value }))}
          />
        </Field>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
          <input
            type="checkbox"
            className="size-4 accent-gold-500"
            checked={draft.is_required}
            onChange={(e) => setDraft((d) => ({ ...d, is_required: e.target.checked }))}
          />
          Required
        </label>
        <label className="flex items-center gap-2 text-[0.875rem] text-ink-soft">
          <input
            type="checkbox"
            className="size-4 accent-gold-500"
            checked={draft.is_active}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
          />
          Shown on the form
        </label>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[0.8125rem] font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" strokeWidth={2.2} />
            Delete
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-[0.8125rem] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Save className="size-3.5" strokeWidth={2.2} />
            Save field
          </button>
        </div>
      </div>
    </div>
  )
}
