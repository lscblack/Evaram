/**
 * PDF reports: each one downloads from the Financial Reports page as a real
 * PDF named after the report and today's date.
 */
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { loginUI, todayISO } from './helpers'

test('download the payments, overdue and occupancy PDF reports', async ({ page }) => {
  await loginUI(page)
  await page.goto('/admin/finance/reports')
  await expect(page.getByText('PDF reports', { exact: true })).toBeVisible()

  for (const [title, file] of [
    ['Payments received', 'payments-received'],
    ['Overdue tenants', 'overdue-tenants'],
    ['Occupancy', 'occupancy'],
  ]) {
    const tile = page.locator('div.rounded-xl').filter({ has: page.getByText(title, { exact: true }) })
    await tile.getByRole('button', { name: 'Download PDF' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Summary cards', { exact: true })).toBeVisible()
    if (title === 'Payments received') {
      // Leave out a card and the table: the PDF is still generated with the rest.
      await dialog.getByLabel('Rent months paid').uncheck()
      await dialog.getByLabel('Table of tenants who paid').uncheck()
    }
    const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Generate PDF' }).click()])
    expect(download.suggestedFilename()).toBe(`evaramu-${file}-${todayISO()}.pdf`)
    const bytes = await readFile((await download.path())!)
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF')
    await expect(page.getByText(`${title} report downloaded`)).toBeVisible()
    await expect(dialog).toBeHidden()
  }
})
