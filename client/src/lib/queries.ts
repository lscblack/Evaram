/**
 * Data hooks.
 *
 * Deliberately dependency-free rather than pulling in TanStack Query: the
 * surface here is small, and a shared in-flight map plus a TTL cache gives us
 * dedup, caching and revalidation without another 40 KB in the bundle.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, api } from '@/lib/api'
import { useLocalize, useLocalizeAll, type Translatable } from '@/lib/localize'

interface Entry {
  value: unknown
  expiresAt: number
}

const cache = new Map<string, Entry>()
const inFlight = new Map<string, Promise<unknown>>()

const DEFAULT_TTL = 120_000

export function invalidate(prefix?: string): void {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

/** Fetch-once-and-share, so ten components asking for the same path make one call. */
export async function fetchCached<T>(path: string, ttl = DEFAULT_TTL): Promise<T> {
  const hit = cache.get(path)
  if (hit && hit.expiresAt > Date.now()) return hit.value as T

  const pending = inFlight.get(path)
  if (pending) return pending as Promise<T>

  const promise = api
    .get<T>(path)
    .then((value) => {
      cache.set(path, { value, expiresAt: Date.now() + ttl })
      return value
    })
    .finally(() => inFlight.delete(path))

  inFlight.set(path, promise)
  return promise
}

export interface QueryState<T> {
  data: T | undefined
  loading: boolean
  error: ApiError | null
  refetch: () => void
}

export function useQuery<T>(
  path: string | null,
  options: { ttl?: number; enabled?: boolean } = {},
): QueryState<T> {
  const { ttl = DEFAULT_TTL, enabled = true } = options
  const [data, setData] = useState<T | undefined>(() =>
    path ? (cache.get(path)?.value as T | undefined) : undefined,
  )
  const [loading, setLoading] = useState(Boolean(path) && enabled && data === undefined)
  const [error, setError] = useState<ApiError | null>(null)
  const [nonce, setNonce] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!path || !enabled) {
      setLoading(false)
      return
    }
    let cancelled = false

    const cached = cache.get(path)
    if (cached && cached.expiresAt > Date.now() && nonce === 0) {
      setData(cached.value as T)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetchCached<T>(path, ttl)
      .then((value) => {
        if (cancelled || !mounted.current) return
        setData(value)
        setError(null)
      })
      .catch((err: ApiError) => {
        if (cancelled || !mounted.current) return
        setError(err)
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [path, ttl, enabled, nonce])

  const refetch = useCallback(() => {
    if (path) cache.delete(path)
    setNonce((n) => n + 1)
  }, [path])

  return { data, loading, error, refetch }
}

/**
 * `useQuery` for a list of admin-authored content.
 *
 * Identical to `useQuery`, except each row is merged with the active locale's
 * fields before it reaches the component — so a section renders in Kinyarwanda
 * or French without any of its JSX knowing. Admin screens deliberately keep
 * using plain `useQuery`: an editor must see the English row it is editing,
 * plus the raw `translations` blob, not a merged view of the two.
 */
export function useLocalizedQuery<T extends Translatable>(
  path: string | null,
  options: { ttl?: number; enabled?: boolean } = {},
): QueryState<T[]> {
  const query = useQuery<T[]>(path, options)
  const localizeAll = useLocalizeAll()
  const { data } = query
  const localized = useMemo(
    () => (data === undefined ? undefined : localizeAll(data)),
    [data, localizeAll],
  )
  return { ...query, data: localized }
}

/**
 * Re-runs a query on an interval. Used by the admin dashboard so its counters
 * stay live without a websocket. Pauses while the tab is hidden.
 */
export function useLiveQuery<T>(path: string | null, intervalMs = 15_000): QueryState<T> {
  const query = useQuery<T>(path, { ttl: 0 })
  const refetch = query.refetch

  useEffect(() => {
    if (!path) return
    let timer: number | undefined

    const tick = () => {
      if (document.visibilityState === 'visible') refetch()
      timer = window.setTimeout(tick, intervalMs)
    }
    timer = window.setTimeout(tick, intervalMs)

    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [path, intervalMs, refetch])

  return query
}

/** For POST/PATCH/DELETE — tracks pending and error state for a form. */
export function useMutation<TBody, TResult>(
  fn: (body: TBody) => Promise<TResult>,
): {
  mutate: (body: TBody) => Promise<TResult | undefined>
  pending: boolean
  error: ApiError | null
  reset: () => void
} {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const mutate = useCallback(
    async (body: TBody) => {
      setPending(true)
      setError(null)
      try {
        return await fn(body)
      } catch (err) {
        setError(err as ApiError)
        return undefined
      } finally {
        setPending(false)
      }
    },
    [fn],
  )

  return { mutate, pending, error, reset: () => setError(null) }
}

/**
 * The `items` array of one content block, typed by the caller.
 *
 * Page copy lives in the database as blocks; the repeating lists inside them
 * (trust points, build stages, governance rows) are the block's `items`.
 * Pass the shipped copy as `fallback` so the section renders before the request
 * resolves and cannot go blank.
 */
export function useBlockItems<T>(page: string, key: string, fallback: T[] = []): T[] {
  const { data, loading } = useQuery<
    ({ key: string; items: unknown[] | null } & Translatable)[]
  >(`/public/content/${page}`)
  const localize = useLocalize()
  return useMemo(() => {
    const row = (data ?? []).find((b) => b.key === key)
    const items = row ? localize(row).items : undefined
    const live = Boolean(items && items.length)
    noteFallback(`${page}/${key}`, !live && !loading)
    // An admin emptying a list should not blank the section — fall back to the
    // shipped copy, exactly as `useBlock` does for headings.
    return live ? (items as T[]) : fallback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key, loading, localize])
}


/* ------------------------------------------------------- fallback tracking */

/**
 * Which content blocks are currently rendering compiled copy instead of
 * database rows. Development only — it is how you spot a section that never
 * reached the API, or a block an admin has emptied by accident.
 */
const fallbacksInUse = new Set<string>()
const fallbackListeners = new Set<() => void>()

function noteFallback(ref: string, active: boolean): void {
  if (!import.meta.env.DEV) return
  const had = fallbacksInUse.has(ref)
  if (active && !had) {
    fallbacksInUse.add(ref)
    console.warn(`[content] ${ref} — using compiled fallback, not the database`)
  } else if (!active && had) {
    fallbacksInUse.delete(ref)
  } else {
    return
  }
  // Called from inside a useMemo, so notifying synchronously would setState
  // during another component's render. Defer to the next microtask.
  queueMicrotask(() => {
    for (const listen of fallbackListeners) listen()
  })
}

/** Subscribe to the fallback set. Used by the dev badge. */
export function onFallbackChange(listener: () => void): () => void {
  fallbackListeners.add(listener)
  return () => fallbackListeners.delete(listener)
}

export function currentFallbacks(): string[] {
  return [...fallbacksInUse].sort()
}

export interface Block {
  eyebrow?: string
  title: string
  accent?: string
  body?: string
  items: unknown[]
  ctaLabel?: string
  ctaHref?: string
  imageUrl?: string
}

/**
 * One content block, with the shipped copy as a fallback.
 *
 * Headings, hero copy and section intros all live in the database. Passing the
 * original text as `fallback` means a page still renders correctly before the
 * request resolves, and cannot go blank if an admin clears a field by accident.
 */
export function useBlock(page: string, key: string, fallback: Partial<Block> = {}): Block {
  const query = useQuery<
    ({
      key: string
      eyebrow: string | null
      title: string | null
      accent: string | null
      body: string | null
      items: unknown[] | null
      cta_label: string | null
      cta_href: string | null
      image_url: string | null
    } & Translatable)[]
  >(`/public/content/${page}`)
  const loading = query.loading
  const data = query.data
  const localize = useLocalize()

  return useMemo(() => {
    const found = (data ?? []).find((b) => b.key === key)
    noteFallback(`${page}/${key}`, !found && !loading)
    const row = found ? localize(found) : undefined
    return {
      eyebrow: row?.eyebrow ?? fallback.eyebrow,
      title: row?.title ?? fallback.title ?? '',
      accent: row?.accent ?? fallback.accent,
      body: row?.body ?? fallback.body,
      items: row?.items ?? fallback.items ?? [],
      ctaLabel: row?.cta_label ?? fallback.ctaLabel,
      ctaHref: row?.cta_href ?? fallback.ctaHref,
      imageUrl: row?.image_url ?? fallback.imageUrl,
    }
    // The fallback is an inline literal at every call site; comparing it by
    // identity would recompute on every render for no benefit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, key, loading, localize])
}
