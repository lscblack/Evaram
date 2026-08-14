import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { FIELD } from '@/components/admin/ui'
import { useQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

export interface FilterRule {
  column: string
  operator: string
  value: string
}

interface FilterableColumn {
  column: string
  kind: 'str' | 'int' | 'float' | 'bool' | 'uuid' | 'date' | 'datetime'
  operators: string[]
}

/** Plain-English labels; the wire format stays terse. */
const OPERATOR_LABELS: Record<string, string> = {
  eq: 'is',
  ne: 'is not',
  gt: 'greater than',
  gte: 'at least',
  lt: 'less than',
  lte: 'at most',
  in: 'is one of',
  contains: 'contains',
  startswith: 'starts with',
  endswith: 'ends with',
  isnull: 'is empty',
}

/** `column:operator:value`, the shape the API parses. */
export const toQuery = (rules: FilterRule[]): string[] =>
  rules
    .filter((r) => r.column && r.operator)
    .map((r) => `${r.column}:${r.operator}:${r.value}`)

/**
 * Build filters over any column the API is willing to expose.
 *
 * The column list comes from `/admin/properties/filterable` rather than being
 * hardcoded here, so adding a filterable column server-side makes it appear in
 * this UI with no frontend change.
 */
export function FilterBuilder({
  endpoint,
  rules,
  onChange,
  match,
  onMatchChange,
}: {
  endpoint: string
  rules: FilterRule[]
  onChange: (rules: FilterRule[]) => void
  match: 'all' | 'any'
  onMatchChange: (match: 'all' | 'any') => void
}) {
  const [open, setOpen] = useState(false)
  const { data } = useQuery<{ columns: FilterableColumn[] }>(endpoint)
  const columns = data?.columns ?? []

  const columnFor = (name: string) => columns.find((c) => c.column === name)

  const add = () => {
    const first = columns[0]
    if (!first) return
    onChange([...rules, { column: first.column, operator: 'eq', value: '' }])
    setOpen(true)
  }

  const update = (index: number, patch: Partial<FilterRule>) => {
    const next = rules.map((r, i) => (i === index ? { ...r, ...patch } : r))
    // Changing column can strand an operator the new type does not support.
    if (patch.column) {
      const allowed = columnFor(patch.column)?.operators ?? []
      if (!allowed.includes(next[index].operator)) next[index].operator = 'eq'
    }
    onChange(next)
  }

  const remove = (index: number) => onChange(rules.filter((_, i) => i !== index))

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[0.875rem] font-semibold text-ink"
        >
          Filters{rules.length > 0 && <span className="ml-2 text-gold-600">{rules.length}</span>}
        </button>

        <div className="flex items-center gap-2">
          {rules.length > 1 && (
            <select
              value={match}
              onChange={(e) => onMatchChange(e.target.value as 'all' | 'any')}
              className="h-9 rounded-lg border border-line bg-canvas px-2 text-[0.8125rem] text-ink"
            >
              <option value="all">Match all</option>
              <option value="any">Match any</option>
            </select>
          )}
          {rules.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="h-9 rounded-lg border border-line px-3 text-[0.8125rem] font-semibold text-ink-soft hover:text-ink"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={add}
            disabled={columns.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3 text-[0.8125rem] font-semibold text-canvas disabled:opacity-50"
          >
            <Plus className="size-3.5" strokeWidth={2.6} />
            Add filter
          </button>
        </div>
      </header>

      {open && rules.length > 0 && (
        <div className="space-y-2 border-t border-line p-4">
          {rules.map((rule, index) => {
            const meta = columnFor(rule.column)
            const needsValue = rule.operator !== 'isnull'
            return (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={rule.column}
                  onChange={(e) => update(index, { column: e.target.value })}
                  className={cn(FIELD, 'h-10 w-auto min-w-44 flex-1')}
                >
                  {columns.map((c) => (
                    <option key={c.column} value={c.column}>
                      {c.column.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>

                <select
                  value={rule.operator}
                  onChange={(e) => update(index, { operator: e.target.value })}
                  className={cn(FIELD, 'h-10 w-auto min-w-36')}
                >
                  {(meta?.operators ?? ['eq']).map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op] ?? op}
                    </option>
                  ))}
                </select>

                {needsValue &&
                  (meta?.kind === 'bool' ? (
                    <select
                      value={rule.value || 'true'}
                      onChange={(e) => update(index, { value: e.target.value })}
                      className={cn(FIELD, 'h-10 w-auto min-w-32')}
                    >
                      <option value="true">yes</option>
                      <option value="false">no</option>
                    </select>
                  ) : (
                    <input
                      value={rule.value}
                      onChange={(e) => update(index, { value: e.target.value })}
                      type={
                        meta?.kind === 'date' || meta?.kind === 'datetime'
                          ? 'date'
                          : meta?.kind === 'int' || meta?.kind === 'float'
                            ? 'number'
                            : 'text'
                      }
                      placeholder={rule.operator === 'in' ? 'comma, separated, values' : 'value'}
                      className={cn(FIELD, 'h-10 min-w-44 flex-1')}
                    />
                  ))}

                <button
                  type="button"
                  onClick={() => remove(index)}
                  aria-label="Remove filter"
                  className="grid size-10 shrink-0 place-items-center rounded-xl border border-line text-ink-faint hover:border-red-300 hover:text-red-600"
                >
                  <X className="size-4" strokeWidth={2.4} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
