/**
 * The single door to the backend.
 *
 * Handles the ECDH handshake, seals every request body, unseals every response,
 * attaches the bearer token, and refreshes it once on a 401 before giving up.
 * Callers just `await api.get('/public/properties')` and receive plain objects.
 */

import {
  createKeyPair,
  deriveSessionKey,
  isCryptoAvailable,
  seal,
  unseal,
  type SecureSession,
} from '@/lib/crypto'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8011'
const PREFIX = '/api/v1'

const ACCESS_KEY = 'evaramu-access'
const REFRESH_KEY = 'evaramu-refresh'

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>
  code?: string

  constructor(
    status: number,
    message: string,
    fields?: Record<string, string>,
    code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.code = code
  }
}

/* ------------------------------------------------------------------ tokens */
export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/* ------------------------------------------------------------------ session */
let session: SecureSession | null = null
let handshakeInFlight: Promise<SecureSession | null> | null = null

async function negotiate(): Promise<SecureSession | null> {
  if (!isCryptoAvailable) {
    // Web Crypto needs a secure context. Fall back to plaintext rather than
    // breaking the site outright — the server accepts both.
    console.warn('[evaramu] Web Crypto unavailable; transport encryption is off')
    return null
  }

  const { pair, publicKey } = await createKeyPair()
  const response = await fetch(`${BASE}${PREFIX}/secure/handshake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ public_key: publicKey }),
  })
  if (!response.ok) throw new ApiError(response.status, 'Could not establish a secure session')

  const data = await response.json()
  const key = await deriveSessionKey(pair, data.public_key, data.salt)

  return {
    sessionId: data.session_id,
    key,
    // Renew a minute early so a request never races the expiry.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
}

async function getSession(force = false): Promise<SecureSession | null> {
  if (!force && session && session.expiresAt > Date.now()) return session
  // Concurrent callers share one handshake.
  if (!handshakeInFlight) {
    handshakeInFlight = negotiate()
      .then((s) => {
        session = s
        return s
      })
      .finally(() => {
        handshakeInFlight = null
      })
  }
  return handshakeInFlight
}

/** Warm the session during app boot so the first real call is not delayed. */
export function prewarm(): void {
  void getSession().catch(() => undefined)
}

/* ------------------------------------------------------------------ refresh */
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const data = await request<{ access_token: string; refresh_token: string }>(
          'POST',
          '/auth/refresh',
          { refresh_token: refresh },
          { skipAuthRetry: true },
        )
        tokens.set(data.access_token, data.refresh_token)
        return true
      } catch {
        tokens.clear()
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

/* ------------------------------------------------------------------ request */
interface Options {
  auth?: boolean
  skipAuthRetry?: boolean
  signal?: AbortSignal
  /** Retry once after re-handshaking if the session was dropped server-side. */
  retriedSession?: boolean
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: Options = {},
): Promise<T> {
  const active = await getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (active) headers['X-E2E-Session'] = active.sessionId

  const token = tokens.access
  if (token && options.auth !== false) headers.Authorization = `Bearer ${token}`

  let payload: string | undefined
  if (body !== undefined) {
    const json = JSON.stringify(body)
    payload = active ? JSON.stringify({ d: await seal(active.key, json) }) : json
  }

  const response = await fetch(`${BASE}${PREFIX}${path}`, {
    method,
    headers,
    body: payload,
    signal: options.signal,
  })

  const text = await response.text()
  let data: unknown = undefined
  if (text) {
    try {
      const parsed = JSON.parse(text)
      // A sealed body is `{d: "..."}` and nothing else.
      if (active && parsed && typeof parsed === 'object' && 'd' in parsed) {
        data = JSON.parse(await unseal(active.key, (parsed as { d: string }).d))
      } else {
        data = parsed
      }
    } catch {
      data = undefined
    }
  }

  if (!response.ok) {
    const detail = (data as { detail?: string })?.detail ?? response.statusText
    const code = (data as { code?: string })?.code

    // The server dropped our session (restart, TTL): re-handshake and retry once.
    if (response.status === 409 && code === 'e2e_session_expired' && !options.retriedSession) {
      await getSession(true)
      return request<T>(method, path, body, { ...options, retriedSession: true })
    }

    if (response.status === 401 && !options.skipAuthRetry && tokens.refresh) {
      if (await refreshSession()) {
        return request<T>(method, path, body, { ...options, skipAuthRetry: true })
      }
    }

    throw new ApiError(
      response.status,
      detail,
      (data as { fields?: Record<string, string> })?.fields,
      code,
    )
  }

  return data as T
}

/* ------------------------------------------------------------------ surface */
export const api = {
  get: <T>(path: string, options?: Options) => request<T>('GET', path, undefined, options),

  /**
   * Multipart upload.
   *
   * Deliberately skips the sealed channel: a file is a binary stream, and
   * base64-in-JSON would inflate it by a third and buffer the whole thing in
   * memory on both ends. The bytes are images that will be served publicly
   * anyway, so the transport gain would be nil. Auth still applies.
   */
  upload: async <T>(path: string, files: File[], fields: Record<string, string> = {}) => {
    const form = new FormData()
    for (const file of files) form.append('files', file)
    for (const [key, value] of Object.entries(fields)) form.append(key, value)

    const headers: Record<string, string> = {}
    const token = tokens.access
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${BASE}${PREFIX}${path}`, {
      method: 'POST',
      headers,
      body: form,
    })

    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : undefined
    } catch {
      data = undefined
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        (data as { detail?: string })?.detail ?? response.statusText,
        undefined,
        (data as { code?: string })?.code,
      )
    }
    return data as T
  },
  post: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: Options) => request<T>('DELETE', path, undefined, options),

  /** True once a session key has been agreed. */
  get secure() {
    return session !== null
  },
}

/** Builds a query string, dropping empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    search.set(key, String(value))
  }
  const out = search.toString()
  return out ? `?${out}` : ''
}
