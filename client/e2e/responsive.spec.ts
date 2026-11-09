/**
 * Every key screen at 360, 390, 430, 768, 1024 and 1440 px: no horizontal
 * overflow, primary content visible. Screenshots are written to
 * backups/e2e-screens for visual review.
 */
import { expect, test } from '@playwright/test'
import { Api, expectNoHorizontalOverflow, loginUI, pngBuffer, settle, todayISO } from './helpers'

const WIDTHS = [360, 390, 430, 768, 1024, 1440]
const SHOTS = '../backups/e2e-screens'

let ids: { property: number; unit: number; tenant: number; agreement: number; invoice: number; payment: number; document: number }

test.beforeAll(async ({ request }) => {
  const api = await Api.login(request)
  const existing = await api.get('/properties?search=RSP')
  if (existing.total) {
    // Already seeded by an earlier run in this database.
    const prop = existing.items[0]
    const units = await api.get(`/units?property_id=${prop.id}`)
    const ag = (await api.get('/agreements?search=RSP-T')).items[0]
    const inv = (await api.get(`/invoices?agreement_id=${ag.id}`)).items[0]
    const pay = (await api.get(`/payments?agreement_id=${ag.id}`)).items[0]
    const docs = await api.get(`/agreements/${ag.id}/documents`)
    ids = { property: prop.id, unit: units.items[0].id, tenant: ag.tenant_id, agreement: ag.id, invoice: inv.id, payment: pay.id, document: docs[0].id }
    return
  }
  const prop = await api.post('/properties', {
    code: 'RSP1', name: 'Kacyiru Heights Residences', property_type: 'building', district: 'Gasabo', sector: 'Kacyiru',
    description: 'Modern apartment building close to the city centre with secure parking and backup power.',
    amenities: ['Parking', 'Water tank', 'Security'],
  })
  await api.multipart(`/properties/${prop.id}/images`, {
    files: { name: 'front.png', mimeType: 'image/png', buffer: pngBuffer(800, 520, [18, 61, 102]) },
  })
  const occupied = await api.unit(prop.id, 'RSPA1', '650000', 'RWF', { unit_type: 'apartment', name: 'Apartment 1 — two bedrooms', bedrooms: 2 })
  await api.unit(prop.id, 'RSPA2', '900', 'USD', { unit_type: 'apartment', name: 'Apartment 2 — furnished', bedrooms: 3, furnished: true, is_featured: true })
  for (let i = 1; i <= 4; i++) {
    await api.unit(prop.id, `RSPR${i}`, String(120000 + i * 10000), 'RWF', { name: `Garden room ${i}` })
  }
  const tenant = await api.post('/tenants', {
    full_name: 'Jean-Paul Nkurunziza RSP-T', phone: '+250788555001', email: 'jp@example.com',
    emergency_contact_name: 'Claudine', emergency_contact_phone: '+250788555002', emergency_contact_relationship: 'Sister',
  })
  const start = `${todayISO().slice(0, 8)}01`
  const ag = await api.post('/agreements', {
    tenant_id: tenant.id, unit_id: occupied.id, start_date: start, due_day: 28, deposit_required: '650000', activate: true,
  })
  await api.post('/invoices/generate', { period: todayISO().slice(0, 7) })
  const inv = (await api.get(`/invoices?agreement_id=${ag.id}`)).items[0]
  const pay = await api.multipart('/payments', {
    agreement_id: String(ag.id), amount: '400000', payment_date: todayISO(), method_code: 'mtn_momo',
    transaction_reference: 'MP-RSP-0001', allocations: JSON.stringify([{ invoice_id: inv.id, amount: '400000' }]),
  })
  await api.multipart('/payments', {
    agreement_id: String(ag.id), amount: '100000', payment_date: todayISO(), method_code: 'cash', transaction_reference: '',
  })
  await api.post(`/payments/${pay.id}/approve`, { auto_allocate: true })
  await request.post('/api/v1/public/inquiries', {
    data: { full_name: 'Eric Mugabo', phone: '+250788123123', unit_code: 'RSPR1', message: 'Can I visit on Saturday?' },
  })
  const doc = await api.post(`/agreements/${ag.id}/documents`, {})
  ids = { property: prop.id, unit: occupied.id, tenant: tenant.id, agreement: ag.id, invoice: inv.id, payment: pay.id, document: doc.id }
})

const PUBLIC = [
  { name: 'home', path: '/', expectText: 'Kacyiru' },
  { name: 'listing', path: '/listings/RSPA2', expectText: 'Apartment 2' },
  { name: 'verify', path: '/verify', expectText: 'Verify a rental agreement' },
]

function adminPages() {
  return [
    { name: 'dashboard', path: '/admin' },
    { name: 'properties', path: '/admin/properties' },
    { name: 'property-detail', path: `/admin/properties/${ids.property}` },
    { name: 'buildings', path: '/admin/buildings' },
    { name: 'units', path: '/admin/units' },
    { name: 'unit-detail', path: `/admin/units/${ids.unit}` },
    { name: 'availability', path: '/admin/availability' },
    { name: 'tenants', path: '/admin/tenants' },
    { name: 'tenant-detail', path: `/admin/tenants/${ids.tenant}` },
    { name: 'agreements', path: '/admin/agreements' },
    { name: 'agreement-new', path: '/admin/agreements/new' },
    { name: 'agreement-detail', path: `/admin/agreements/${ids.agreement}` },
    { name: 'agreement-document', path: `/admin/agreements/${ids.agreement}/documents/${ids.document}` },
    { name: 'agreement-templates', path: '/admin/agreement-templates' },
    { name: 'inquiries', path: '/admin/inquiries' },
    { name: 'invoices', path: '/admin/finance/invoices?tab=all' },
    { name: 'invoice-detail', path: `/admin/finance/invoices/${ids.invoice}` },
    { name: 'payments', path: '/admin/finance/payments' },
    { name: 'payment-detail', path: `/admin/finance/payments/${ids.payment}` },
    { name: 'approvals', path: '/admin/finance/approvals' },
    { name: 'outstanding', path: '/admin/finance/outstanding' },
    { name: 'reports', path: '/admin/finance/reports' },
    { name: 'users', path: '/admin/users' },
    { name: 'roles', path: '/admin/roles' },
    { name: 'settings', path: '/admin/settings' },
    { name: 'audit', path: '/admin/audit' },
    { name: 'notifications', path: '/admin/notifications' },
    { name: 'account', path: '/admin/account' },
    { name: 'record-payment', path: '/admin/finance/payments?record=1' },
  ]
}

for (const width of WIDTHS) {
  test(`public pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 820 : 900 })
    for (const p of PUBLIC) {
      await page.goto(p.path)
      await expect(page.getByText(p.expectText).first()).toBeVisible()
      await settle(page)
      await expectNoHorizontalOverflow(page, `${p.name} @${width}`)
      await page.screenshot({ path: `${SHOTS}/${width}-${p.name}.png`, fullPage: true })
    }
  })

  test(`admin pages at ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewportSize({ width, height: width < 768 ? 820 : 900 })
    await loginUI(page)
    for (const p of adminPages()) {
      await page.goto(p.path)
      await settle(page)
      await expect(page.getByRole('heading').first()).toBeVisible()
      await expect(page.getByText(/could not load this data|something went wrong/i)).toHaveCount(0)
      await expectNoHorizontalOverflow(page, `${p.name} @${width}`)
      await page.screenshot({ path: `${SHOTS}/${width}-${p.name}.png`, fullPage: width < 1024 })
    }
    if (width < 1024) {
      // Mobile navigation: drawer opens and lists the groups.
      await page.goto('/admin')
      await page.getByRole('button', { name: 'Open menu' }).click()
      const nav = page.getByRole('dialog', { name: 'Navigation' })
      await expect(nav.getByText('Financial Management')).toBeVisible()
      await nav.getByRole('link', { name: 'Pending Approvals' }).click()
      await expect(page).toHaveURL(/approvals/)
    }
    expect(errors, errors.join('\n')).toEqual([])
  })
}
