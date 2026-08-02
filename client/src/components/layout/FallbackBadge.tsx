import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { currentFallbacks, onFallbackChange } from '@/lib/queries'

/**
 * Development-only badge listing the sections rendering compiled copy instead
 * of database rows — usually because the API is down, or a block is missing.
 *
 * Without it the shipped fallbacks are invisible, and the site looks fine while
 * nothing is actually reaching Postgres. Never rendered in a production build.
 */
export function FallbackBadge() {
  const [refs, setRefs] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const sync = () => setRefs(currentFallbacks())
    sync()
    return onFallbackChange(sync)
  }, [])

  if (!import.meta.env.DEV || refs.length === 0 || dismissed) return null

  return (
    <div className="fixed bottom-4 left-4 z-[100] max-w-sm font-mono text-[0.75rem]">
      <div className="overflow-hidden rounded-xl border border-amber-500/40 bg-amber-950/95 text-amber-100 shadow-lift backdrop-blur-sm">
        <div className="flex items-center gap-2 px-3 py-2">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-400" strokeWidth={2.4} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex-1 text-left font-semibold"
          >
            {refs.length} section{refs.length > 1 ? 's' : ''} on fallback copy
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="grid size-5 place-items-center rounded text-amber-300/70 hover:text-amber-100"
          >
            <X className="size-3.5" strokeWidth={2.4} />
          </button>
        </div>

        {open && (
          <ul className="max-h-64 overflow-y-auto border-t border-amber-500/25 px-3 py-2">
            {refs.map((ref) => (
              <li key={ref} className="py-0.5 text-amber-200/80">
                {ref}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
