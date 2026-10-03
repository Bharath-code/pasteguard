import type { Page } from '@playwright/test'
import { test, expect, MOCK, shadowLocator } from './fixtures'

const STRIPE = `sk_${'live'}_${'a'.repeat(24)}`
const AWS = 'AKIA' + 'IOSFODNN7EXAMPLE'
const CE = '[data-composer]'

const center = async (page: Page, sel: string) => {
  await expect.poll(() => shadowLocator(page, sel).exists()).toBe(true)
  const r = await shadowLocator(page, sel).rect()
  if (!r) throw new Error(`no ${sel}`)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}
const down = async (page: Page, sel: string) => {
  const { x, y } = await center(page, sel)
  await page.mouse.move(x, y)
  await page.mouse.down()
}
const click = async (page: Page, sel: string) => {
  await down(page, sel)
  await page.mouse.up()
}
const state = (page: Page) => shadowLocator(page, '.chip').attr('data-state')
const taped = async (page: Page, paste: (p: Page, t: string) => Promise<void>, text: string, url = `${MOCK}/prosemirror.html`) => {
  await page.goto(url)
  await paste(page, text)
  await expect.poll(() => state(page)).toBe('taped')
}

for (const kind of ['prosemirror', 'textarea']) {
  test(`${kind}: Esc exposes, Esc again re-tapes, without animation`, async ({ page, paste }) => {
    await taped(page, paste, `k=${AWS}`, `${MOCK}/${kind}.html`)
    await page.keyboard.press('Escape')
    await expect.poll(() => state(page)).toBe('exposed')
    if (kind === 'textarea') await expect(page.locator(CE)).toHaveValue(`k=${AWS}`)
    else await expect(page.locator(CE)).toContainText(AWS)
    expect(await shadowLocator(page, '.chip').style('transition-duration')).toMatch(/^0s/)
    expect(await shadowLocator(page, '.chip b').text()).toBe('1 secret visible: AWS access key')
    await page.keyboard.press('Escape')
    await expect.poll(() => state(page)).toBe('taped')
    if (kind === 'textarea') await expect(page.locator(CE)).toHaveValue('k=PG_SECRET_1')
    else await expect(page.locator(CE)).toContainText('PG_SECRET_1')
  })
}

test('Esc with nothing to toggle dismisses the chip', async ({ page, paste }) => {
  await taped(page, paste, `k=${AWS}`)
  await page.locator(CE).evaluate(el => (el.textContent = 'edited'))
  await page.keyboard.press('Escape')
  await expect.poll(() => shadowLocator(page, '.chip').exists()).toBe(false)
})

test('hold under 1200 ms does nothing; full hold sends original and announces rotate', async ({ page, paste }) => {
  await taped(page, paste, `k=${STRIPE}`)
  await down(page, '[data-hold]')
  await page.waitForTimeout(600)
  await page.mouse.up()
  await expect(page.locator('[data-user-turn]')).toHaveCount(0)
  await expect(page.locator(CE)).toContainText('PG_SECRET_1')
  await down(page, '[data-hold]')
  await page.waitForTimeout(1400)
  await page.mouse.up()
  await expect(page.locator('[data-user-turn]').last()).toContainText('sk_live_')
  expect(await page.evaluate(() => document.querySelector('pg-host')?.textContent ?? '')).toBe('')
  await expect.poll(() => shadowLocator(page, '[role=alert]').text()).toBe('Sent with 1 secret. Rotate the Stripe key.')
  expect(await shadowLocator(page, '.chip b').text()).toBe('Sent with 1 secret. Rotate the Stripe key.')
  expect(await shadowLocator(page, '[data-rotate]').attr('href')).toMatch(/^https:\/\//)
})

test('held Space also sends; a short Space tap does not', async ({ page, paste }) => {
  await taped(page, paste, `k=${STRIPE}`)
  await page.keyboard.press('Alt+Shift+KeyP')
  await page.keyboard.down('Space')
  await page.waitForTimeout(500)
  await page.keyboard.up('Space')
  await expect(page.locator('[data-user-turn]')).toHaveCount(0)
  await page.keyboard.down('Space')
  await page.waitForTimeout(1400)
  await page.keyboard.up('Space')
  await expect(page.locator('[data-user-turn]').last()).toContainText('sk_live_')
})

test('Alt+Shift+P moves focus in, Esc returns it', async ({ page, paste }) => {
  await taped(page, paste, `k=${AWS}`)
  await page.keyboard.press('Alt+Shift+KeyP')
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('PG-HOST')
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-composer'))).toBe(true)
  expect(await state(page)).toBe('taped')
})

test('chip auto-dismisses after blur only', async ({ page, paste, ext }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await ext.evalInContent(page, 'chip.blurDismissMs', 800)
  await paste(page, `k=${AWS}`)
  await expect.poll(() => state(page)).toBe('taped')
  await page.waitForTimeout(1500)
  expect(await state(page)).toBe('taped')
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(400)
  expect(await state(page)).toBe('taped')
  await page.locator(CE).focus()
  await page.waitForTimeout(700)
  expect(await state(page)).toBe('taped')
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await expect.poll(() => shadowLocator(page, '.chip').exists(), { timeout: 3000 }).toBe(false)
})

test('Always allow: original goes in, only a hash is stored, next paste passes through', async ({ page, paste, sw }) => {
  await taped(page, paste, `k=${AWS}`)
  await click(page, '[data-allow]')
  await expect(page.locator(CE)).toContainText(AWS)
  await expect.poll(() => shadowLocator(page, '.chip').exists()).toBe(false)
  await expect.poll(() => sw.eval(async () => JSON.stringify((await chrome.storage.local.get('settings'))['settings'] ?? {}))).toContain('"hash"')
  const stored = await sw.eval(async () => JSON.stringify(await chrome.storage.local.get(null)))
  expect(stored).not.toContain('IOSFODNN7EXAMPLE')
  await page.locator(CE).evaluate(el => (el.textContent = ''))
  await paste(page, `again=${AWS}`)
  await expect(page.locator(CE)).toContainText(`again=${AWS}`)
})

test('normal send closes the chip; sending while exposed is the only assertive announcement', async ({ page, paste }) => {
  await taped(page, paste, `k=${AWS}`)
  expect(await shadowLocator(page, '[role=alert]').text()).toBe('')
  await page.click('[data-send]')
  await expect.poll(() => shadowLocator(page, '.chip').exists()).toBe(false)
  expect(await shadowLocator(page, '[role=alert]').text()).toBe('')

  await taped(page, paste, `k=${AWS}`)
  await page.keyboard.press('Escape')
  await expect.poll(() => state(page)).toBe('exposed')
  await page.click('[data-send]')
  await expect.poll(() => state(page)).toBe('sent')
  await expect.poll(() => shadowLocator(page, '[role=alert]').text()).toBe('Sent with 1 secret. Rotate the AWS access key.')
})
