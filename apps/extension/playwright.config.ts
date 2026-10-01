import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never', outputFolder: '.playwright/report' }]] : 'list',
  outputDir: '.playwright/results',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  webServer: {
    command: 'node e2e/mock/server.ts',
    url: 'http://127.0.0.1:4323/health',
    reuseExistingServer: !process.env['CI'],
    timeout: 15_000,
  },
})
