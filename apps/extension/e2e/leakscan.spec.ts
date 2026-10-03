import { test, expect, MOCK } from './fixtures'

type W = Window & { long: [number, number][] }

test('seeded leak in history: one chip, type only, once per conversation', async ({ page, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html?history=aws&c=abc`)
  await expect.poll(() => shadowLocator(page, '.chip b').text(), { timeout: 8000 }).toBe('This conversation contains an AWS access key.')
  expect(await shadowLocator(page, '.layer').text()).not.toContain('IOSFODNN7EXAMPLE')
  expect(await shadowLocator(page, '[data-rotate]').attr('href')).toMatch(/^https:\/\//)
  expect(await shadowLocator(page, '.chip').count()).toBe(1)
  await page.reload()
  await page.waitForTimeout(3500)
  expect(await shadowLocator(page, '.chip').exists()).toBe(false)
})

test('clean history: nothing rendered', async ({ page, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html?history=clean&c=def`)
  await page.waitForTimeout(3500)
  expect(await shadowLocator(page, '.chip').exists()).toBe(false)
})

test('turns with only placeholders are skipped', async ({ page, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html?history=placeholder&c=ghi`)
  await page.waitForTimeout(3500)
  expect(await shadowLocator(page, '.chip').exists()).toBe(false)
})

test('paused site: no scan', async ({ page, sw, shadowLocator }) => {
  await sw.pause('localhost:4323')
  await page.goto(`${MOCK}/prosemirror.html?history=aws&c=jkl`)
  await page.waitForTimeout(3500)
  expect(await shadowLocator(page, '.chip').exists()).toBe(false)
})

test('only a hash of the conversation id is stored', async ({ page, sw, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html?history=aws&c=conv-plain-id`)
  await expect.poll(() => shadowLocator(page, '.chip').exists(), { timeout: 8000 }).toBe(true)
  const stored = await sw.eval(async () => JSON.stringify(await chrome.storage.local.get(null)))
  expect(stored).not.toContain('conv-plain-id')
  expect(stored).toMatch(/"scanned":\["[0-9a-f]{64}"\]/)
})

test('200-turn history: no long task over 50 ms', async ({ page, shadowLocator }) => {
  await page.addInitScript(() => {
    const w = window as unknown as W
    w.long = []
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.duration > 50) w.long.push([e.startTime, e.duration]) })).observe({ type: 'longtask' })
  })
  await page.goto(`${MOCK}/prosemirror.html?history=many&c=big`)
  await expect.poll(() => shadowLocator(page, '.chip').exists(), { timeout: 10_000 }).toBe(true)
  expect(await page.evaluate(() => (window as unknown as W).long)).toEqual([])
})
