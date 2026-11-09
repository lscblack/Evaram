import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronLeft } from 'lucide-react'

export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  back?: { to: string; label: string }
  meta?: ReactNode
}) {
  return (
    <div className="mb-5 sm:mb-6">
      {back ? (
        <Link
          to={back.to}
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">{actions}</div> : null}
      </div>
    </div>
  )
}
