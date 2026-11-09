/**
 * Sign-in without a password (emailed code, passkey via Chrome's virtual
 * authenticator) and invoice PDFs (download, WhatsApp share link).
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { ADMIN_EMAIL, API_URL, Api, loginUI, todayISO } from './helpers'

async function latestCode(): Promise<string> {
  const dir = process.env.E2E_OUTBOX!
  for (let i = 0; i < 20; i++) {
    const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.eml')).sort()
    if (files.length) {
      const raw = await readFile(join(dir, files[files.length - 1]!), 'utf8')
      const m = raw.match(/sign-in code is: (\d{6})/)
      if (m) return m[1]!
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('No sign-in email arrived')
}

test('sign in with an emailed code', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click()
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByRole('button', { name: 'Email me a code' }).click()
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await page.getByLabel('Sign-in code').fill(await latestCode()) // submits on the 6th digit
  await expect(page).toHaveURL(/\/admin/)
})

test('add a passkey, then sign in with it', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  })

  await loginUI(page)
  await page.goto('/admin/account')
  await page.getByLabel('Name (optional)').fill('E2E laptop')
  await page.getByRole('button', { name: 'Add a passkey' }).click()
  await expect(page.getByText('E2E laptop')).toBeVisible()

  // Drop the session (refresh cookie + in-memory token), then use the passkey.
  await context.clearCookies()
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click()
  await expect(page).toHaveURL(/\/admin/)
  await page.goto('/admin/account')
  await expect(page.getByText(/last used/)).toBeVisible()
})

test('download an invoice PDF and send it on WhatsApp', async ({ page, request }) => {
  const api = await Api.login(request)
  const stamp = Date.now().toString().slice(-5)
  const prop = await api.post('/properties', { code: `INV${stamp}`, name: 'Invoice House', property_type: 'house', district: 'Gasabo' })
  const unit = await api.unit(prop.id, `INV${stamp}-1`, '300000')
  const tenant = await api.post('/tenants', { full_name: `Uwase Claudine ${stamp}`, phone: '0788123456' })
  await api.post('/agreements', { tenant_id: tenant.id, unit_id: unit.id, start_date: `${todayISO().slice(0, 8)}01`, due_day: 28, activate: true })
  await api.post('/invoices/generate', { period: todayISO().slice(0, 7) })
  const invoices = await api.get(`/invoices?tenant_id=${tenant.id}`)
  const inv = invoices.items[0]

  await loginUI(page)
  await page.goto(`/admin/finance/invoices/${inv.id}`)
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).click()])
  expect(download.suggestedFilename()).toBe(`invoice-${inv.invoice_number}.pdf`)
  expect((await readFile((await download.path())!)).subarray(0, 4).toString()).toBe('%PDF')

  await page.getByRole('button', { name: 'Send on WhatsApp' }).click()
  const dialog = page.getByRole('dialog')
  const open = dialog.getByRole('link', { name: /Open WhatsApp/ })
  await expect(open).toHaveAttribute('href', /^https:\/\/wa\.me\/250788123456\?text=/)
  const href = (await open.getAttribute('href'))!
  const text = decodeURIComponent(href.split('text=')[1]!)
  expect(text).toContain(inv.invoice_number)
  const link = text.match(/https?:\/\/\S+invoice-pdf\/\S+/)![0]
  expect(link.startsWith(`${API_URL}/api/v1/public/invoice-pdf/`)).toBeTruthy()
  const pdf = await request.get(link) // no sign-in
  expect(pdf.ok()).toBeTruthy()
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF')
})
