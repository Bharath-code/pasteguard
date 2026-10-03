import AxeBuilder from '@axe-core/playwright'
import { createHash } from 'node:crypto'
import { test, expect, MOCK } from './fixtures'
import type { BrowserContext, Page, Worker } from '@playwright/test'

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const seedToday = (sw: { worker: Worker }, caught: number) =>
  sw.worker.evaluate(
    async (arg: { key: string; n: number }) => {
      await chrome.storage.local.set({ stats: { v: 1, days: { [arg.key]: { caught: arg.n, byType: {} } } } })
    },
    { key: dayKey(new Date()), n: caught },
  )

const open = async (context: BrowserContext, extId: string, query = ''): Promise<Page> => {
  const p = await context.newPage()
  await p.goto(`chrome-extension://${extId}/popup.html${query}`)
  return p
}

test('empty state', async ({ page, extId }) => {
  await page.goto(`chrome-extension://${extId}/popup.html`)
  await expect(page.getByText('All quiet on this tab')).toBeVisible()
})

test('count animates only when changed', async ({ context, extId, sw }) => {
  await seedToday(sw, 3)
  const first = await open(context, extId)
  await expect(first.locator('.bars.go')).toHaveCount(1)
  expect(await first.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0)
  await expect(first.locator('.count')).toHaveText('3')
  await first.close()

  const again = await open(context, extId)
  await expect(again.locator('.count')).toHaveText('3')
  expect(await again.evaluate(() => document.getAnimations().length)).toBe(0)
  await expect(again.locator('.bars.go')).toHaveCount(0)

  await seedToday(sw, 5)
  const changed = await open(context, extId)
  await expect(changed.locator('.bars.go')).toHaveCount(1)
  await expect(changed.locator('.count')).toHaveText('5')
})

test('reduced motion shows final state', async ({ context, extId, sw }) => {
  await seedToday(sw, 4)
  const p = await context.newPage()
  await p.emulateMedia({ reducedMotion: 'reduce' })
  await p.goto(`chrome-extension://${extId}/popup.html`)
  await expect(p.locator('.count')).toHaveText('4')
  expect(await p.evaluate(() => document.getAnimations().length)).toBe(0)
})

test('pause toggles for the host', async ({ page, context, extId, sw }) => {
  await page.goto(`${MOCK}/textarea.html`)
  const tabId = await sw.worker.evaluate(async () => (await chrome.tabs.query({ url: 'http://localhost/*' }))[0]?.id)
  const p = await open(context, extId, `?tab=${tabId}`)
  const sw1 = p.getByRole('switch')
  await expect(sw1).toHaveAttribute('aria-checked', 'true')
  await expect(p.getByText('On for this site')).toBeVisible()
  await sw1.click()
  await expect(sw1).toHaveAttribute('aria-checked', 'false')
  await expect(p.getByText('Paused here')).toBeVisible()
  const paused = await sw.worker.evaluate(async () => ((await chrome.storage.local.get('settings'))['settings'] as { paused: string[] }).paused)
  expect(paused).toEqual(['localhost:4323'])
  await sw1.click()
  await expect(sw1).toHaveAttribute('aria-checked', 'true')
})

test('switch is disabled with an explanation off AI sites', async ({ page, extId }) => {
  await page.goto(`chrome-extension://${extId}/popup.html`)
  const sw1 = page.getByRole('switch')
  await expect(sw1).toBeDisabled()
  await expect(sw1).toHaveAccessibleDescription(/Open ChatGPT, Claude or Gemini/)
})

test('limited adapter and paused sites show per-site state', async ({ page, extId, sw }) => {
  await sw.worker.evaluate(async () => {
    await chrome.storage.session.set({ adapters: { 'claude.ai': false } })
  })
  await sw.pause('chatgpt.com')
  await page.goto(`chrome-extension://${extId}/popup.html`)
  await expect(page.locator('.site.limited')).toContainText('claude.ai')
  await expect(page.locator('.site.limited .state')).toHaveText('Limited on this site')
  await expect(page.locator('.site.paused')).toContainText('chatgpt.com')
  await expect(page.locator('.site.on')).toContainText('gemini.google.com')
})

test('diagnostic contains no values', async ({ page, extId, sw }) => {
  const secret = 'sk_live_PASTEGUARDDEMO00'
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => void ((window as unknown as { __copied: string }).__copied = t) } })
  })
  await sw.allow(secret, 'Stripe key')
  await sw.settings({ rules: [{ type: 'Acme', source: 'acme_internal_[a-z]+' }] })
  await page.goto(`chrome-extension://${extId}/popup.html`)
  await page.getByRole('button', { name: 'Copy diagnostic' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  const text = await page.evaluate(() => (window as unknown as { __copied: string }).__copied)
  expect(text).toContain('PasteGuard diagnostic')
  expect(text).toContain('claude.ai=on')
  for (const leak of [secret, createHash('sha256').update(secret).digest('hex'), 'acme_internal', 'Stripe key']) expect(text).not.toContain(leak)
})

test('first paint ≤ 100 ms and nothing loads from outside the package', async ({ context, extId }) => {
  // warm up: the first extension page in a fresh headless browser pays process start-up
  const warm = await open(context, extId)
  await warm.close()
  const p = await context.newPage()
  const urls: string[] = []
  p.on('request', r => urls.push(r.url()))
  await p.goto(`chrome-extension://${extId}/popup.html`)
  await expect(p.getByText('All quiet on this tab')).toBeVisible()
  const fcp = await p.evaluate(
    () =>
      new Promise<number>(resolve => {
        new PerformanceObserver((list, o) => {
          const e = list.getEntriesByName('first-contentful-paint')[0]
          if (e) { o.disconnect(); resolve(e.startTime) }
        }).observe({ type: 'paint', buffered: true })
        setTimeout(() => resolve(-1), 3000)
      }),
  )
  expect(fcp).toBeGreaterThan(0)
  expect(fcp).toBeLessThanOrEqual(100)
  expect(urls.filter(u => !u.startsWith(`chrome-extension://${extId}/`))).toEqual([])
  expect(urls.some(u => u.endsWith('.woff2'))).toBe(true)
})

for (const scheme of ['dark', 'light'] as const) {
  test(`axe: 0 violations (${scheme})`, async ({ context, extId, sw }) => {
    await seedToday(sw, 7)
    const p = await context.newPage()
    await p.emulateMedia({ colorScheme: scheme })
    await p.goto(`chrome-extension://${extId}/popup.html`)
    await expect(p.locator('.count')).toHaveText('7')
    const r = await new AxeBuilder({ page: p }).analyze()
    expect(r.violations).toEqual([])
  })
}

test('content script reports a healthy adapter', async ({ page, sw }) => {
  await page.goto(`${MOCK}/textarea.html`)
  await expect
    .poll(() => sw.worker.evaluate(async () => ((await chrome.storage.session.get('adapters'))['adapters'] ?? {}) as Record<string, boolean>))
    .toEqual({ 'localhost:4323': true })
})

test('pausing from the popup struck-icons the tab', async ({ page, context, extId, sw }) => {
  await page.goto(`${MOCK}/textarea.html`)
  const tabId = await sw.worker.evaluate(async () => (await chrome.tabs.query({ url: 'http://localhost/*' }))[0]?.id)
  const p = await open(context, extId, `?tab=${tabId}`)
  await p.getByRole('switch').click()
  await expect
    .poll(() => sw.worker.evaluate(async () => ((await chrome.action.getTitle({ tabId: (await chrome.tabs.query({ url: 'http://localhost/*' }))[0]?.id }))))
    , { timeout: 5000 }).toBe('PasteGuard: paused on this site')
})
