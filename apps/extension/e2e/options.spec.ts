import AxeBuilder from '@axe-core/playwright'
import { test, expect, MOCK } from './fixtures'

const KEY = 'acme_svc_9f2kq81xz'
const EMAIL = 'dev@example.com'

test.beforeEach(async ({ sw }) => {
  await sw.reset()
})

test('add rule → next paste is taped as the custom type, no reload; PII toggle tapes email', async ({ context, page, extId, paste, shadowLocator }) => {
  await page.goto(`${MOCK}/textarea.html`)
  await page.waitForTimeout(300)

  const opts = await context.newPage()
  await opts.goto(`chrome-extension://${extId}/options.html`)
  await opts.getByLabel('Name shown on the tape').fill('Acme token')
  await opts.getByLabel('Pattern (JavaScript regex)').fill('acme_svc_[a-z0-9]{8,}')
  await expect(opts.locator('.rule-out mark')).toHaveText(KEY)
  await opts.getByRole('button', { name: 'Add rule', exact: true }).click()
  await expect(opts.getByRole('list', { name: 'Custom rules' }).getByText('Acme token')).toBeVisible()

  await paste(page, `x ${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue(/PG_SECRET_1/)
  await expect.poll(() => shadowLocator(page, '.chip b').text()).toBe('1 secret taped: Acme token')

  await page.reload()
  await page.waitForTimeout(300)
  await paste(page, `mail ${EMAIL}`)
  await expect(page.locator('[data-composer]')).toHaveValue(new RegExp(EMAIL))
  await opts.getByLabel('Also tape email addresses').check()
  await paste(page, `mail ${EMAIL}`)
  await expect(page.locator('[data-composer]')).toHaveValue(/PG_SECRET_/)
})

test('invalid and slow patterns cannot be saved; tester never throws', async ({ context, extId }) => {
  const opts = await context.newPage()
  const errors: string[] = []
  opts.on('pageerror', e => errors.push(e.message))
  await opts.goto(`chrome-extension://${extId}/options.html`)
  const rx = opts.getByLabel('Pattern (JavaScript regex)')
  const add = opts.getByRole('button', { name: 'Add rule', exact: true })
  await expect(add).toBeDisabled()
  await rx.fill('(')
  await expect(rx).toHaveAttribute('aria-invalid', 'true')
  await expect(opts.locator('#rx-meta')).toContainText('That pattern has a syntax error:')
  await expect(add).toBeDisabled()
  await rx.fill('a*')
  await expect(add).toBeDisabled()
  await rx.fill('(a+)+$')
  await expect(opts.locator('#rx-meta')).toContainText('too slow')
  await expect(add).toBeDisabled()
  await rx.fill('acme_[a-z]+')
  await expect(rx).toHaveAttribute('aria-invalid', 'false')
  await expect(add).toBeEnabled()
  expect(errors).toEqual([])
})

test('allow list and paused sites: listed, removable, never show values', async ({ context, extId, sw }) => {
  await sw.allow('super-secret-value', 'Stripe key')
  await sw.pause('claude.ai')
  const opts = await context.newPage()
  await opts.goto(`chrome-extension://${extId}/options.html`)
  const allowed = opts.getByRole('list', { name: 'Always allowed' })
  await expect(allowed.getByText('Stripe key')).toBeVisible()
  expect(await opts.content()).not.toContain('super-secret-value')
  await allowed.getByRole('button', { name: /^Remove Stripe key/ }).click()
  await expect(opts.getByText('Nothing is always allowed.')).toBeVisible()
  await opts.getByRole('button', { name: 'Resume claude.ai' }).click()
  await expect(opts.getByText('No sites are paused.')).toBeVisible()
  expect(await sw.eval(async () => JSON.stringify((await chrome.storage.local.get('settings'))['settings']))).not.toContain('claude.ai')
})

test('axe finds nothing and targets are at least 44px', async ({ context, extId, sw }) => {
  await sw.allow('v', 'Stripe key')
  await sw.pause('claude.ai')
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extId}/options.html`)
  await page.getByLabel('Pattern (JavaScript regex)').fill('(')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  for (const b of await page.getByRole('button').all()) expect((await b.boundingBox())?.height).toBeGreaterThanOrEqual(44)
})

test('popup Settings link opens the options page', async ({ context, extId }) => {
  const popup = await context.newPage()
  await popup.goto(`chrome-extension://${extId}/popup.html`)
  const opened = context.waitForEvent('page', { predicate: p => /options\.html/.test(p.url()) })
  await popup.getByRole('button', { name: 'Settings' }).click()
  await opened
})
