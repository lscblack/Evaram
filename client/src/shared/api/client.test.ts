import { ApiError, api, setAccessToken, setSessionLostHandler } from './client'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setAccessToken(null)
    setSessionLostHandler(null)
  })

  it('sends the bearer token and the CSRF header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, { ok: true }))
    setAccessToken('abc')
    await api.get('/units', { status: 'available', empty: '' })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/v1/units?status=available')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer abc')
    expect((init!.headers as Record<string, string>)['X-Requested-With']).toBe('evaramu')
  })

  it('refreshes once for concurrent 401s and retries', async () => {
    setAccessToken('expired')
    let refreshes = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/auth/refresh')) {
        refreshes++
        return json(200, { access_token: 'fresh', user: {} })
      }
      const auth = (init!.headers as Record<string, string>).Authorization
      return auth === 'Bearer fresh' ? json(200, { url }) : json(401, { detail: 'expired' })
    })
    const results = await Promise.all([api.get<{ url: string }>('/a'), api.get<{ url: string }>('/b'), api.get<{ url: string }>('/c')])
    expect(results.map((r) => r.url)).toEqual(['/api/v1/a', '/api/v1/b', '/api/v1/c'])
    expect(refreshes).toBe(1)
  })

  it('reports a lost session when refresh fails', async () => {
    const lost = vi.fn()
    setSessionLostHandler(lost)
    setAccessToken('expired')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).endsWith('/auth/refresh') ? json(401, { detail: 'no' }) : json(401, { detail: 'expired' }),
    )
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError)
    expect(lost).toHaveBeenCalledOnce()
  })

  it('surfaces the server message and code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(409, { detail: 'Unit R101 cannot be let', code: 'unit_unavailable' }))
    const err = (await api.post('/agreements', {}).catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('Unit R101 cannot be let')
    expect(err.code).toBe('unit_unavailable')
    expect(err.status).toBe(409)
  })
})
