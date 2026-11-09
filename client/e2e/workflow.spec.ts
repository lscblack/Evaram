/**
 * The complete operational workflow, driven through the real UI in Chrome:
 * property → room → publish → public listing → tenant → agreement → unit
 * disappears → invoice → pending payment → approval → balance & dashboard →
 * end tenancy → unit returns only once marked ready.
 */
import { expect, test } from '@playwright/test'
import { loginUI, todayISO } from './helpers'

/** Exact label match that tolerates a trailing required-field asterisk. */
const L = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\*?$`)

test.describe.configure({ mode: 'serial' })

test('complete rental workflow through the UI', async ({ page }) => {
  const stamp = Date.now().toString().slice(-5)
  const propCode = `W${stamp}`
  const roomCode = `R${stamp}`
  const tenantName = `Aline Workflow ${stamp}`

  await loginUI(page)

  // 1. Create a property.
  await page.goto('/admin/properties/new')
  await page.getByLabel(L('Property code')).fill(propCode)
  await page.getByLabel(L('Name')).fill(`Workflow Residence ${stamp}`)
  await page.getByText('Building', { exact: true }).click()
  await page.getByLabel(L('District')).fill('Gasabo')
  await page.getByLabel(L('Sector (Umurenge)')).fill('Kimihurura')
  await page.getByRole('button', { name: /create property|save/i }).click()
  await expect(page.getByRole('heading', { name: new RegExp(`Workflow Residence ${stamp}`) })).toBeVisible()

  // 2. Add a rentable room.
  await page.getByRole('button', { name: /add unit/i }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(L('Code')).fill(roomCode)
  await dialog.getByLabel(L('Name')).fill(`Room ${roomCode}`)
  await dialog.getByLabel(L('Unit type')).selectOption('room')
  await dialog.getByLabel(L('Bedrooms')).fill('1')
  await dialog.getByLabel(L('Monthly rent')).fill('150000')
  await dialog.getByLabel(L('Currency')).selectOption('RWF')
  await dialog.getByRole('button', { name: /create unit|add unit|save/i }).click()
  await expect(page).toHaveURL(/\/admin\/units\/\d+/)
  const unitUrl = page.url()

  // 3. Make it available and publish it.
  await page.getByRole('button', { name: /change status/i }).click()
  await page.getByRole('dialog').getByLabel(L('New status')).selectOption('available')
  await page.getByRole('dialog').getByRole('button', { name: /save|update|change/i }).click()
  await expect(page.getByText('Available').first()).toBeVisible()
  await page.getByRole('button', { name: /^publish/i }).click()
  await expect(page.getByText(/on the website|listed/i).first()).toBeVisible()

  // 4. It appears on the public website.
  await page.goto('/')
  await expect(page.getByText(roomCode).first()).toBeVisible()
  await page.goto(`/listings/${roomCode}`)
  await expect(page.getByText('150,000 RWF').first()).toBeVisible()

  // 5. Register a tenant.
  await page.goto('/admin/tenants')
  await page.getByRole('button', { name: /register tenant/i }).click()
  const t = page.getByRole('dialog')
  await t.getByLabel(L('Full name')).fill(tenantName)
  await t.getByLabel(L('Phone')).first().fill(`+25078${stamp}11`)
  await t.getByRole('button', { name: /register|save/i }).click()
  await expect(page).toHaveURL(/\/admin\/tenants\/\d+/)
  const tenantId = page.url().split('/').pop()

  // 6. Create and activate a rental agreement for the room.
  const unitId = unitUrl.split('/').pop()
  await page.goto(`/admin/agreements/new?tenant=${tenantId}&unit=${unitId}`)
  await expect(page.getByText(tenantName).first()).toBeVisible()
  await expect(page.getByText(roomCode).first()).toBeVisible()
  const today = todayISO()
  await page.getByLabel(L('Start date')).fill(`${today.slice(0, 8)}01`)
  await page.getByLabel(L('Rent due on day')).selectOption('28')
  await page.getByRole('button', { name: /create and activate/i }).click()
  await expect(page).toHaveURL(/\/admin\/agreements\/\d+/)
  const agreementUrl = page.url()
  await expect(page.getByText('Active').first()).toBeVisible()

  // 7. The unit disappears from the public listings.
  await page.goto('/')
  await expect(page.getByText(roomCode)).toHaveCount(0)
  await page.goto(`/listings/${roomCode}`)
  await expect(page.getByText(/no longer available/i)).toBeVisible()

  // 8. Generate this month's rent invoice.
  await page.goto('/admin/finance/invoices')
  await page.getByRole('button', { name: /generate/i }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: /generate/i }).click()
  await expect(page.getByRole('dialog').getByText(/created/i).first()).toBeVisible()
  await page.keyboard.press('Escape')
  await page.goto(`/admin/finance/invoices?tab=all&search=${roomCode}`)
  const invoiceRow = page.getByRole('row').filter({ hasText: roomCode }).first()
  await expect(invoiceRow).toContainText('150,000 RWF')

  // 9. Record a pending (partial) payment.
  await page.goto('/admin/finance/payments?record=1')
  const pay = page.getByRole('dialog', { name: 'Record payment received' })
  await pay.getByPlaceholder('Search tenant, unit or agreement number').fill(roomCode)
  await pay.getByRole('button', { name: new RegExp(roomCode) }).first().click()
  await pay.getByLabel(/^Amount received \(RWF\)/).fill('100000')
  await pay.getByLabel(L('Method')).selectOption('mtn_momo')
  await pay.getByLabel(L('Transaction reference')).fill(`MP${stamp}X`)
  await pay.getByLabel('Approve automatically').uncheck() // keep testing the separate approval step
  await pay.getByRole('button', { name: 'Record as pending' }).click()
  await expect(pay).toBeHidden()
  await expect(page.getByText(`MP${stamp}X`).first()).toBeVisible()

  // Dashboard: pending money is not yet collected money.
  await page.goto('/admin')
  await expect(page.getByText('Pending approvals').first()).toBeVisible()

  // 10. Approve it from the approvals queue.
  await page.goto('/admin/finance/approvals')
  const card = page.getByRole('listitem').filter({ hasText: `MP${stamp}X` })
  await card.getByRole('button', { name: 'Approve' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Approve payment' }).click()
  await expect(page.getByText(`MP${stamp}X`)).toHaveCount(0)

  // 11. The invoice balance changed.
  await page.goto(`/admin/finance/invoices?tab=all&search=${roomCode}`)
  await page.getByRole('row').filter({ hasText: roomCode }).first().click()
  await expect(page.getByText('50,000 RWF').first()).toBeVisible()
  await expect(page.getByText(/partially paid|overdue/i).first()).toBeVisible()

  // 12. The dashboard reflects the approved payment.
  await page.goto('/admin')
  await expect(page.getByText('100,000 RWF').first()).toBeVisible()

  // 13. End the tenancy (tenant already moved out).
  await page.goto(agreementUrl)
  await page.getByRole('button', { name: /terminate/i }).click()
  const term = page.getByRole('dialog')
  await term.getByLabel(L('Termination date')).fill(today)
  await term.getByLabel(L('Reason')).fill('End of stay')
  await term.getByRole('checkbox', { name: /^The tenant has already moved out/ }).check()
  await term.getByRole('button', { name: /terminate/i }).click()
  await expect(page.getByText('Terminated').first()).toBeVisible()

  await page.goto(unitUrl)
  await expect(page.getByText(/turnover/i).first()).toBeVisible()
  await page.goto('/')
  await expect(page.getByText(roomCode)).toHaveCount(0)

  // 14. Available again only once marked ready.
  await page.goto(unitUrl)
  await page.getByRole('button', { name: /mark ready/i }).first().click()
  const ready = page.getByRole('dialog')
  await ready.getByRole('textbox').first().fill('Inspected, cleaned and repainted')
  await ready.getByRole('button', { name: 'Mark ready' }).click()
  await expect(page.getByText('Available').first()).toBeVisible()
  await page.goto('/')
  await expect(page.getByText(roomCode).first()).toBeVisible()
})
