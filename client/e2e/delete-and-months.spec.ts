/** Paying several months in one payment, and deleting records permanently. */
import { expect, test } from '@playwright/test'
import { Api, loginUI, todayISO } from './helpers'

async function tenancy(api: Api, stamp: string, rent = '200000') {
  const prop = await api.post('/properties', { code: `DM${stamp}`, name: `Months House ${stamp}`, property_type: 'house', district: 'Gasabo' })
  const unit = await api.unit(prop.id, `DM${stamp}-1`, rent)
  const tenant = await api.post('/tenants', { full_name: `Mukamana Alice ${stamp}`, phone: '0788555666' })
  const ag = await api.post('/agreements', { tenant_id: tenant.id, unit_id: unit.id, start_date: `${todayISO().slice(0, 8)}01`, end_date: null, due_day: 28, activate: true })
  return { prop, unit, tenant, ag }
}

test('record one payment for three months', async ({ page, request }) => {
  const api = await Api.login(request)
  const stamp = Date.now().toString().slice(-6)
  const { unit, ag } = await tenancy(api, stamp)

  await loginUI(page)
  await page.goto(`/admin/finance/payments?record=1&agreement=${ag.id}`)
  const pay = page.getByRole('dialog', { name: 'Record payment received' })
  await expect(pay.getByText(unit.code).first()).toBeVisible()
  await pay.getByLabel(/^Months this payment covers/).selectOption('3')
  const months = pay.getByRole('list', { name: 'Months covered' })
  await expect(months.getByRole('listitem')).toHaveCount(3)
  await expect(pay.getByText('Total for 3 month(s)')).toBeVisible()
  await expect(pay.getByLabel(/^Amount received \(RWF\)/)).toHaveValue('600000')
  await pay.getByRole('button', { name: 'Record and approve' }).click()
  await expect(pay).toBeHidden()

  const invoices = await api.get(`/invoices?agreement_id=${ag.id}&page_size=50`)
  expect(invoices.items).toHaveLength(3)
  for (const inv of invoices.items) expect(inv.status).toBe('paid')
  const payments = await api.get(`/payments?agreement_id=${ag.id}`)
  expect(payments.items[0].months_covered).toBe(3)
})

test('delete a payment, then the whole tenant', async ({ page, request }) => {
  const api = await Api.login(request)
  const stamp = Date.now().toString().slice(-6)
  const { tenant, ag } = await tenancy(api, stamp, '150000')
  await api.post('/invoices/generate', { period: todayISO().slice(0, 7) })
  const p = await api.multipart('/payments', {
    agreement_id: String(ag.id), amount: '150000', payment_date: todayISO(), method_code: 'cash', auto_approve: 'true',
  })

  await loginUI(page)
  await page.goto(`/admin/finance/payments/${p.id}`)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const dlg = page.getByRole('dialog', { name: new RegExp(`Delete ${p.payment_number} permanently`) })
  await expect(dlg.getByText(/150,000/)).toBeVisible()
  await expect(dlg.getByText(/will show as unpaid again/)).toBeVisible()
  await dlg.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page).toHaveURL(/\/admin\/finance\/payments$/)

  await page.goto(`/admin/tenants/${tenant.id}`)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  const dlg2 = page.getByRole('dialog', { name: /permanently/ })
  await expect(dlg2.getByText('1 agreement')).toBeVisible()
  await expect(dlg2.getByText('1 invoice')).toBeVisible()
  await dlg2.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page).toHaveURL(/\/admin\/tenants$/)
  const unit = await api.get(`/units/${ag.unit_id}`)
  expect(unit.status).toBe('available')
})
