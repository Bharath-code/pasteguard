import { test, expect, MOCK } from './fixtures'

const STRIPE = `sk_${'live'}_${'a'.repeat(24)}`
const AWS = 'AKIA' + 'IOSFODNN7EXAMPLE'

for (const kind of ['prosemirror', 'textarea', 'contenteditable']) {
  test(`${kind}: chip appears with types, never values`, async ({ page, paste, shadowLocator }) => {
    await page.goto(`${MOCK}/${kind}.html`)
    await paste(page, `STRIPE_SECRET_KEY=${STRIPE}\nAWS=${AWS}`)
    await expect.poll(() => shadowLocator(page, '.chip b').text()).toBe('2 secrets taped: Stripe key, AWS access key')
    const all = await shadowLocator(page, '.layer').text()
    expect(all).not.toContain('IOSFODNN7EXAMPLE')
    expect(all).not.toContain(STRIPE)
    expect(all).toContain('The AI will see placeholders. Your answer is restored on this screen.')
    expect(all).toContain('Enter')
    expect(all).toContain('Esc')
  })
}

test('page cannot reach our UI', async ({ page, paste, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await paste(page, `k=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.chip').exists()).toBe(true)
  expect(await page.evaluate(() => document.querySelector('pg-host')?.shadowRoot ?? null)).toBeNull()
  expect(await page.evaluate(() => document.querySelector('pg-host')?.textContent ?? '')).toBe('')
})

test('focus stays in the composer', async ({ page, paste, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await paste(page, `k=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.chip').exists()).toBe(true)
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-composer'))).toBe(true)
})

test('host styles cannot leak in', async ({ page, paste, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html?hostile=1`)
  await paste(page, `k=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.chip').exists()).toBe(true)
  const color = await shadowLocator(page, '.chip').style('color')
  expect(color).toBe('rgb(27, 20, 51)')
  expect(color).not.toBe('rgb(255, 0, 0)')
})

test('chip anchors above the composer and follows it', async ({ page, paste, shadowLocator }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto(`${MOCK}/prosemirror.html`)
  await page.evaluate(() => { (document.querySelector('[data-composer]') as HTMLElement).style.marginTop = '300px' })
  await paste(page, `k=${AWS}`)
  const gap = async () => {
    const c = await page.locator('[data-composer]').boundingBox()
    const r = await shadowLocator(page, '.chip[data-open]').rect()
    return c && r ? { above: c.y - (r.y + r.height), dx: Math.abs(r.x - c.x) } : null
  }
  await expect.poll(async () => (await gap())?.dx ?? 99).toBeLessThan(1)
  expect((await gap())?.above).toBeGreaterThanOrEqual(0)
  await page.setViewportSize({ width: 500, height: 700 })
  await expect.poll(async () => (await gap())?.dx ?? 99).toBeLessThan(1)
})

test('no room above the composer: falls back to bottom-center', async ({ page, paste, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await paste(page, `k=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.chip[data-open]').exists()).toBe(true)
  expect(await shadowLocator(page, '.chip').attr('data-anchor')).toBeNull()
  const r = await shadowLocator(page, '.chip').rect()
  expect(r && r.y + r.height).toBeGreaterThan(600)
})

test('repeat paste updates the same chip in place', async ({ page, paste, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await paste(page, `k=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.chip b').text()).toBe('1 secret taped: AWS access key')
  await paste(page, `STRIPE=${STRIPE}\nAWS=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.chip b').text()).toBe('2 secrets taped: Stripe key, AWS access key')
  expect(await shadowLocator(page, '.chip').count()).toBe(1)
})

test('announces politely and makes zero requests off the mock host', async ({ page, paste, shadowLocator }) => {
  const off: string[] = []
  page.on('request', r => {
    const u = new URL(r.url())
    if (u.origin !== MOCK && !['data:', 'blob:', 'chrome-extension:'].includes(u.protocol)) off.push(r.url())
  })
  await page.goto(`${MOCK}/prosemirror.html`)
  await paste(page, `a=${AWS}`)
  await expect.poll(() => shadowLocator(page, '[role=status]').text()).toBe('1 secret replaced with a placeholder.')
  expect(off).toEqual([])
})

test('reduced motion: opacity only', async ({ page, paste, shadowLocator }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${MOCK}/prosemirror.html`)
  await paste(page, `a=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.chip[data-open]').exists()).toBe(true)
  expect(await shadowLocator(page, '.chip').style('transition-property')).toBe('opacity')
})

test('insert failure shows the clipboard toast', async ({ page, paste, shadowLocator }) => {
  await page.goto(`${MOCK}/prosemirror.html?broken=1`)
  await paste(page, `a=${AWS}`)
  await expect.poll(() => shadowLocator(page, '.toast .msg').text()).toBe("Couldn't paste here. The taped text is on your clipboard.")
})
