import { defineConfig } from '@playwright/test'

// Run through scripts/e2e.sh, which starts an isolated backend + Vite and sets
// E2E_BASE_URL / E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  outputDir: '../backups/e2e-artifacts',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:15810',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
})
