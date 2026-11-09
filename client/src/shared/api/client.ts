/**
 * HTTP client for the Evaramu API.
 *
 * - Every call goes to the backend named by VITE_API_URL (required; there is
 *   no built-in default), under /api/v1. Uploaded files (/media/...) are
 *   resolved against the same origin.
 * - The short-lived access token lives only in memory (never localStorage).
 * - On a 401 the client performs ONE refresh (httpOnly cookie, rotated by the
 *   server) shared by all concurrent requests, then retries once.
 */

/** Backend origin from VITE_API_URL, without a trailing slash. */
export const API_ORIGIN = String(import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '')
if (!API_ORIGIN) throw new Error('VITE_API_URL is not set: add it to client/.env (e.g. VITE_API_URL=https://api.example.com)')
export const API_BASE = `${API_ORIGIN}/api/v1`

/** Absolute URL for an uploaded file path returned by the API ("/media/..."). */
export function mediaUrl<T extends string | null | undefined>(path: T): T {
  return (typeof path === 'string' && path.startsWith('/media/') ? `${API_ORIGIN}${path}` : path) as T
}

/** Point every "/media/..." string in an API response at the backend origin. */
function resolveMedia(value: unknown): unknown {
  if (typeof value === 'string') return mediaUrl(value)
  if (Array.isArray(value)) return value.map(resolveMedia)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = resolveMedia(v)
    return out
  }
  return value
}

export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, unknown>
  errors?: { field: string; message: string }[]

  constructor(status: number, body: { detail?: string; code?: string; details?: Record<string, unknown>; errors?: { field: string; message: string }[] }) {
    super(body.detail || `Request failed (${status})`)
    this.status = status
    this.code = body.code || 'error'
    this.details = body.details
    this.errors = body.errors
  }
}

let accessToken: string | null = null
let refreshing: Promise<boolean> | null = null
let onSessionLost: (() => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setSessionLostHandler(fn: (() => void) | null) {
  onSessionLost = fn
}

type RefreshResult = { access_token: string; user: unknown }
let refreshListener: ((r: RefreshResult) => void) | null = null
export function setRefreshListener(fn: ((r: RefreshResult) => void) | null) {
  refreshListener = fn
}

let inflightRefresh: Promise<RefreshResult | null> | null = null

/**
 * Exchange the refresh cookie for a new access token. Concurrent callers
 * (StrictMode double effects, parallel 401s) share one request, because the
 * server rotates the cookie on every use.
 */
export function refreshSession(): Promise<RefreshResult | null> {
  if (!inflightRefresh) {
    inflightRefresh = doRefresh().finally(() => {
      inflightRefresh = null
    })
  }
  return inflightRefresh
}

async function doRefresh(): Promise<RefreshResult | null> {
  let res: Response | null = null
  // A 429 means "slow down", not "signed out": the server rejects it before the
  // cookie is used, so waiting and retrying is safe. Many people behind one
  // office address can briefly hit the per-address limit.
  for (const wait of [0, 1500, 4000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'evaramu' },
    })
    if (res.status !== 429) break
  }
  if (!res || !res.ok) return null
  const body = (await res.json()) as RefreshResult
  accessToken = body.access_token
  refreshListener?.(body)
  return body
}

function singleFlightRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = refreshSession()
      .then((r) => !!r)
      .catch(() => false)
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export type Query = Record<string, string | number | boolean | null | undefined>

export function buildUrl(path: string, query?: Query) {
  const qs = new URLSearchParams()
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue
      qs.set(k, String(v))
    }
  }
  const s = qs.toString()
  return `${API_BASE}${path}${s ? `?${s}` : ''}`
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  form?: FormData
  auth?: boolean
  signal?: AbortSignal
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { 'X-Requested-With': 'evaramu' }
  let body: BodyInit | undefined
  if (opts.form) {
    body = opts.form
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.body)
  }
  if (opts.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`
  return fetch(buildUrl(path, opts.query), {
    method: opts.method || 'GET',
    headers,
    body,
    credentials: 'include',
    signal: opts.signal,
  })
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts)
  if (res.status === 401 && opts.auth !== false && !path.startsWith('/auth/')) {
    const ok = await singleFlightRefresh()
    if (ok) {
      res = await send(path, opts)
    } else {
      accessToken = null
      onSessionLost?.()
    }
  }
  if (!res.ok) {
    let payload: Record<string, unknown> = {}
    try {
      payload = await res.json()
    } catch {
      payload = { detail: res.status >= 500 ? 'The server is unavailable. Please try again.' : res.statusText }
    }
    throw new ApiError(res.status, payload as never)
  }
  if (res.status === 204) return undefined as T
  const type = res.headers.get('content-type') || ''
  if (type.includes('application/json')) return resolveMedia(await res.json()) as T
  return (await res.blob()) as T
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', form }),
  publicGet: <T>(path: string, query?: Query) => request<T>(path, { query, auth: false }),
  publicPost: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body, auth: false }),
}

/** Download an authenticated file (CSV export, payment evidence). */
export async function downloadFile(path: string, query: Query | undefined, filename: string) {
  const blob = await request<Blob>(path, { query })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Open an authenticated file (e.g. payment evidence) in a new tab. */
export async function openFile(path: string) {
  const win = window.open('', '_blank')
  const blob = await request<Blob>(path)
  const url = URL.createObjectURL(blob)
  if (win) win.location.href = url
  else window.location.href = url
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
