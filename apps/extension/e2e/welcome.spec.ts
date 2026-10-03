import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'
import type { BrowserContext, Page } from '@playwright/test'

const waitForPage = async (context: BrowserContext, re: RegExp): Promise<Page> =>
  context.pages().find(p => re.test(p.url())) ?? context.waitForEvent('page', { predicate: p => re.test(p.url()), timeout: 10_000 })

test('install opens welcome; fake key is taped in under 30 s of interaction', async ({ context }) => {
  const page = await waitForPage(context, /welcome\.html/)
  await page.getByRole('button', { name: 'Copy' }).click()
  await page.getByLabel('Paste it below').press('ControlOrMeta+V')
  await expect(page.getByLabel('Paste it below')).toHaveValue(/PG_SECRET_1/)
  await expect(page.getByRole('status')).toHaveText("Taped. That's all it takes.")
  await expect(page.locator('.checks li.done')).toHaveCount(2)
  await page.getByRole('button', { name: 'I pinned it' }).click()
  await expect(page.locator('.checks li.done')).toHaveCount(3)
})

test('the demo paste is never counted as a real catch and the key never persists', async ({ context, sw }) => {
  const page = await waitForPage(context, /welcome\.html/)
  await page.getByRole('button', { name: 'Copy' }).click()
  await page.getByLabel('Paste it below').press('ControlOrMeta+V')
  await expect(page.getByRole('status')).toHaveText("Taped. That's all it takes.")
  const stored = await sw.eval(async () => JSON.stringify(await chrome.storage.local.get(null)))
  expect(stored).not.toContain('activatedAt')
  expect(stored).not.toContain('PASTEGUARDDEMO')
  expect(await sw.eval(async () => JSON.stringify(await chrome.storage.session.get(null)))).not.toContain('PASTEGUARDDEMO')
})

test('axe finds nothing and targets are at least 44px', async ({ context }) => {
  const page = await waitForPage(context, /welcome\.html/)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height).toBeGreaterThanOrEqual(44)
})
