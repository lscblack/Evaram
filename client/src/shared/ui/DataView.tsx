import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from './cn'
import { SkeletonRows } from './Spinner'
import { EmptyState, ErrorState } from './EmptyState'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'right'
}

/**
 * Responsive data presentation: a real table from the `md` breakpoint, and a
 * stacked card list on phones (rendered by `mobile`). Rows can link to a
 * detail page.
 */
export function DataView<T>({
  rows,
  columns,
  mobile,
  rowKey,
  rowHref,
  onRowClick,
  loading,
  error,
  onRetry,
  empty,
  footer,
}: {
  rows: T[] | undefined
  columns: Column<T>[]
  mobile: (row: T) => ReactNode
  rowKey: (row: T) => string | number
  rowHref?: (row: T) => string
  /** Alternative to rowHref: run an action (e.g. open a dialog) on row tap. */
  onRowClick?: (row: T) => void
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  empty?: ReactNode
  footer?: ReactNode
}) {
  const navigate = useNavigate()
  const activate = rowHref ? (row: T) => navigate(rowHref(row)) : onRowClick
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (loading && !rows) return <SkeletonRows />
  if (!rows || rows.length === 0) return <>{empty ?? <EmptyState title="Nothing here yet" />}</>
  return (
    <div className={cn(loading && 'opacity-60 transition-opacity')}>
      {/* Phones and small tablets */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            {activate ? (
              <button
                type="button"
                onClick={() => activate(row)}
                className="block w-full px-4 py-3.5 text-left active:bg-slate-50"
              >
                {mobile(row)}
              </button>
            ) : (
              <div className="px-4 py-3.5">{mobile(row)}</div>
            )}
          </li>
        ))}
      </ul>
      {/* Tablets landscape and desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500',
                    c.align === 'right' && 'text-right',
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={activate ? () => activate(row) : undefined}
                className={cn(activate && 'cursor-pointer hover:bg-slate-50')}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn('px-4 py-3 align-middle text-slate-700', c.align === 'right' && 'text-right tabular', c.className)}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) {
    return total ? <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">{total} result{total === 1 ? '' : 's'}</p> : null
  }
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-sm text-slate-500 tabular">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-2 text-sm text-slate-600 tabular">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          aria-label="Next page"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  )
}
