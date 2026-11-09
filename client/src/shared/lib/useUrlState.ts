import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * List-page state (page, search, filters) kept in the URL so it survives
 * refreshes, back/forward navigation and can be shared as a link.
 */
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => {
    const out: Record<string, string> = { ...defaults }
    for (const key of Object.keys(defaults)) {
      const v = params.get(key)
      if (v !== null) out[key] = v
    }
    out.page = params.get('page') ?? '1'
    return out as T & { page: string }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const set = useCallback(
    (patch: Partial<T> & { page?: string }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '' || v === (defaults as Record<string, string>)[k]) next.delete(k)
            else next.set(k, String(v))
          }
          // Any filter change returns to page 1.
          if (!('page' in patch)) next.delete('page')
          if (next.get('page') === '1') next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  )

  return [state, set] as const
}
