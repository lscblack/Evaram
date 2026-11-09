/**
 * Agreement documents in Chrome: draw up from the template, fill the blanks,
 * tenant and landlord sign on a signature pad, print view, public verification.
 */
import { expect, test, type Page } from '@playwright/test'
import { Api, loginUI, todayISO } from './helpers'

let agreementId: number

test.beforeAll(async ({ request }) => {
  const api = await Api.login(request)
  const stamp = Date.now().toString().slice(-5)
  const prop = await api.post('/properties', {
    code: `DOC${stamp}`, name: 'Gatenga Shops', property_type: 'building', usage: 'commercial', district: 'Kicukiro', sector: 'Gatenga',
    cell: 'Nyarurama', village: 'Bisambu',
  })
  const unit = await api.unit(prop.id, `DOC${stamp}-S1`, '250000', 'RWF', { unit_type: 'commercial', name: 'Shop 1' })
  const tenant = await api.post('/tenants', { full_name: `Mukamana Grace ${stamp}`, phone: `+25078${stamp}22`, id_type: 'national_id', id_number: '1199270011122233' })
  const ag = await api.post('/agreements', {
    tenant_id: tenant.id, unit_id: unit.id, start_date: `${todayISO().slice(0, 8)}01`, end_date: `${Number(todayISO().slice(0, 4)) + 1}-${todayISO().slice(5, 8)}01`,
    due_day: 5, activate: true,
  })
  agreementId = ag.id
})

async function sign(page: Page, party: 'Tenant' | 'Landlord') {
  const row = page.getByRole('listitem').filter({ hasText: `${party} signs` })
  await row.getByRole('button', { name: 'Sign' }).click()
  const dialog = page.getByRole('dialog')
  const box = (await dialog.getByRole('img', { name: /signature pad/i }).boundingBox())!
  await page.mouse.move(box.x + 30, box.y + 110)
  await page.mouse.down()
  for (const [x, y] of [[80, 50], [130, 120], [190, 60], [250, 115]]) await page.mouse.move(box.x + x, box.y + y, { steps: 5 })
  await page.mouse.up()
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Sign document' }).click()
  await expect(dialog).toBeHidden()
}

test('draw up, sign, print and verify an agreement document', async ({ page, context }) => {
  await loginUI(page)
  await page.goto(`/admin/agreements/${agreementId}`)
  await page.getByRole('button', { name: 'Draw up document' }).click()
  await expect(page).toHaveURL(/documents\/\d+$/)
  const docUrl = page.url()

  // Pre-filled from the records, in Frw.
  await expect(page.getByText('250,000').first()).toBeVisible()
  await expect(page.getByText('Bisambu').first()).toBeVisible()

  // Signing is blocked until the blanks are filled.
  await expect(page.getByText(/still empty/)).toBeVisible()
  for (const [label, value] of [
    ['Monthly rent in words', "ibihumbi magana abiri na mirongo itanu"],
    ['Months paid in advance', '1'],
    ['Amount paid in advance (Frw)', '250,000'],
    ['Amount paid in advance in words', 'ibihumbi magana abiri na mirongo itanu'],
    ['Advance covers from', '01/11/2026'],
    ['Advance covers until', '30/11/2026'],
  ] as const) {
    await page.getByLabel(label, { exact: true }).fill(value)
  }
  await page.getByRole('button', { name: /save details/i }).click()
  await expect(page.getByText('All details complete')).toBeVisible()

  await sign(page, 'Tenant')
  await expect(page.getByText('Awaiting signatures').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /save details/i })).toHaveCount(0) // locked
  await sign(page, 'Landlord')
  await expect(page.getByText('Digitally sealed and intact')).toBeVisible()
  await expect(page.getByRole('img', { name: /Signature of/ })).toHaveCount(2)

  // Print view.
  const docId = docUrl.split('/').pop()
  const print = await context.newPage()
  await print.addInitScript(() => { window.print = () => {} })
  await print.goto(`/print/documents/${docId}`)
  await expect(print.getByText("AMASEZERANO Y'UBUKODE").first()).toBeVisible()
  await expect(print.getByRole('img', { name: /Signature of/ })).toHaveCount(2)
  const footer = await print.locator('footer').innerText()
  const number = footer.match(/DOC-\d{6}-\d{4}/)![0]
  const code = footer.match(/Verification code\s+([0-9A-F ]{19})/)![1].replace(/\s/g, '')
  await print.close()

  // Public verification (no login needed).
  const anon = await context.browser()!.newContext()
  const pub = await anon.newPage()
  await pub.goto(`/verify?number=${number}&code=${code}`)
  await pub.getByRole('button', { name: 'Verify' }).click()
  await expect(pub.getByText('Genuine and unaltered')).toBeVisible()
  await anon.close()
})
