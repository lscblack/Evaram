import { Check } from 'lucide-react'
import type { ApiFormField } from '@/types/api'
import { cn } from '@/lib/utils'

export type FieldValue = string | number | string[] | boolean | undefined
export type FormValues = Record<string, FieldValue>

const WIDTHS: Record<string, string> = {
  full: 'sm:col-span-6',
  half: 'sm:col-span-3',
  third: 'sm:col-span-2',
}

const INPUT =
  'h-12 w-full rounded-2xl border border-line bg-canvas px-4 text-[0.9375rem] text-ink ' +
  'transition-colors placeholder:text-ink-faint focus:border-gold-500 focus:bg-surface focus:outline-none'

/**
 * Renders one FORM_CONFIG field. Every field type in the config is handled —
 * section headers become visual dividers rather than inputs.
 */
export function DynamicField({
  field,
  value,
  onChange,
}: {
  field: ApiFormField
  value: FieldValue
  onChange: (name: string, value: FieldValue) => void
}) {
  const span = WIDTHS[field.width ?? 'full'] ?? WIDTHS.full

  if (field.type === 'section_header') {
    return (
      <div className={cn(span, 'col-span-full pt-4 first:pt-0')}>
        <div className="flex items-center gap-4">
          <h3 className="font-display text-[1.0625rem] font-semibold whitespace-nowrap text-ink">
            {field.label}
          </h3>
          <span aria-hidden className="h-px flex-1 bg-navy-100" />
        </div>
      </div>
    )
  }

  const labelNode = (
    <label
      htmlFor={field.name}
      className="mb-2 block text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase"
    >
      {field.label}
      {field.is_required && <span className="ml-1 text-gold-600">*</span>}
    </label>
  )

  switch (field.type) {
    case 'select':
      return (
        <div className={span}>
          {labelNode}
          <select
            id={field.name}
            required={field.is_required}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={INPUT}
          >
            <option value="">Select…</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )

    case 'radio':
      return (
        <fieldset className={span}>
          <legend className="mb-2 text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
            {field.label}
            {field.is_required && <span className="ml-1 text-gold-600">*</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => {
              const active = value === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(field.name, active ? undefined : option)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-5 py-2.5 text-[0.9375rem] font-medium transition-colors',
                    active
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-line bg-canvas text-ink-soft hover:border-ink-faint',
                  )}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </fieldset>
      )

    case 'multiselect': {
      const selected = Array.isArray(value) ? value : []
      return (
        <fieldset className={span}>
          <legend className="mb-2 text-[0.75rem] font-bold tracking-wide text-ink-muted uppercase">
            {field.label}
            {field.is_required && <span className="ml-1 text-gold-600">*</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {field.options?.map((option) => {
              const active = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    onChange(
                      field.name,
                      active ? selected.filter((s) => s !== option) : [...selected, option],
                    )
                  }
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[0.875rem] font-medium transition-colors',
                    active
                      ? 'border-gold-500 bg-gold-500 text-white'
                      : 'border-line bg-canvas text-ink-soft hover:border-ink-faint',
                  )}
                >
                  {active && <Check className="size-3.5" strokeWidth={3} />}
                  {option}
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <p className="mt-2 text-[0.8125rem] text-ink-muted">{selected.length} selected</p>
          )}
        </fieldset>
      )
    }

    case 'checkbox':
      return (
        <div className={span}>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-canvas p-4 transition-colors hover:border-ink-faint">
            <input
              type="checkbox"
              id={field.name}
              checked={Boolean(value)}
              onChange={(e) => onChange(field.name, e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-gold-500"
            />
            <span className="text-[0.9375rem] font-medium text-ink">{field.label}</span>
          </label>
        </div>
      )

    case 'number':
      return (
        <div className={span}>
          {labelNode}
          <input
            id={field.name}
            type="number"
            inputMode="decimal"
            required={field.is_required}
            value={(value as number | string) ?? ''}
            onChange={(e) =>
              onChange(field.name, e.target.value === '' ? undefined : Number(e.target.value))
            }
            className={INPUT}
          />
        </div>
      )

    default:
      return (
        <div className={span}>
          {labelNode}
          <input
            id={field.name}
            type="text"
            required={field.is_required}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={INPUT}
          />
        </div>
      )
  }
}
