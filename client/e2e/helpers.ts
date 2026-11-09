import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@example.com'
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'E2e!Admin-Passw0rd'

export async function loginUI(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin/)
}

/** Authenticated API helper for seeding (talks to the backend through the Vite proxy). */
export class Api {
  constructor(private request: APIRequestContext, private token: string) {}

  static async login(request: APIRequestContext) {
    const r = await request.post('/api/v1/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
    expect(r.ok(), await r.text()).toBeTruthy()
    return new Api(request, (await r.json()).access_token)
  }

  private h() {
    return { Authorization: `Bearer ${this.token}` }
  }

  async get(path: string) {
    const r = await this.request.get(`/api/v1${path}`, { headers: this.h() })
    expect(r.ok(), await r.text()).toBeTruthy()
    return r.json()
  }

  async post(path: string, data?: unknown) {
    const r = await this.request.post(`/api/v1${path}`, { headers: this.h(), data })
    expect(r.ok(), `${path}: ${await r.text()}`).toBeTruthy()
    return r.json()
  }

  async multipart(path: string, multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>) {
    const r = await this.request.post(`/api/v1${path}`, { headers: this.h(), multipart })
    expect(r.ok(), `${path}: ${await r.text()}`).toBeTruthy()
    return r.json()
  }

  async unit(propertyId: number, code: string, rent: string, currency = 'RWF', extra: Record<string, unknown> = {}) {
    const u = await this.post('/units', {
      property_id: propertyId, code, name: extra.name ?? `Unit ${code}`, unit_type: extra.unit_type ?? 'room',
      monthly_rent: rent, currency, bedrooms: extra.bedrooms ?? 1, bathrooms: 1, ...extra,
    })
    await this.post(`/units/${u.id}/status`, { status: 'available' })
    await this.post(`/units/${u.id}/publish`, { is_published: true })
    return u
  }
}

/** Minimal valid PNG (solid colour) generated without extra dependencies. */
export function pngBuffer(w = 96, h = 64, rgb: [number, number, number] = [3, 42, 78]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (b: Buffer) => {
    let c = 0xffffffff
    for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data])
    const c = Buffer.alloc(4)
    c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => rgb).flat())])
  const raw = Buffer.concat(Array.from({ length: h }, () => row))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const { scroll, inner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    inner: window.innerWidth,
  }))
  expect(scroll, `${label}: page is ${scroll}px wide in a ${inner}px viewport`).toBeLessThanOrEqual(inner + 1)
}

export function todayISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Wait until the page has rendered its data (no skeletons / spinners left). */
export async function settle(page: Page) {
  await page.waitForLoadState('load')
  await expect(page.locator('[aria-busy="true"], [aria-label="Loading"]')).toHaveCount(0, { timeout: 15_000 })
  await page.waitForTimeout(250)
}
