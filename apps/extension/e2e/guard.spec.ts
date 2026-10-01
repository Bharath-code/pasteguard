import { test, expect } from './fixtures'

type W = Window & { seen: (string | undefined)[]; long: [number, number][] }

const KEY = 'AKIA' + 'IOSFODNN7EXAMPLE'
for (const kind of ['prosemirror', 'textarea', 'contenteditable']) {
  test(`${kind}: secret never reaches the page`, async ({ page, paste, leaks }) => {
    await page.goto(`http://localhost:4323/${kind}.html`)
    await paste(page, `AWS_ACCESS_KEY_ID=${KEY}\nPORT=8080`)
    if (kind === 'textarea') await expect(page.locator('[data-composer]')).toHaveValue(/AWS_ACCESS_KEY_ID=PG_SECRET_1/)
    else await expect(page.locator('[data-composer]')).toContainText('AWS_ACCESS_KEY_ID=PG_SECRET_1')
    await page.click('[data-send]')
    expect(await leaks(page, KEY)).toEqual([])
  })
}

test('no secret: paste passes through untouched', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html')
  await paste(page, 'hello world')
  await expect(page.locator('[data-composer]')).toHaveText('hello world')
})

test('page capture listeners never see the original', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html')
  await page.evaluate(() => { (window as unknown as W).seen = []; addEventListener('paste', e => (window as unknown as W).seen.push(e.clipboardData?.getData('text/plain')), true) })
  await paste(page, `k=${KEY}`)
  await expect(page.locator('[data-composer]')).toContainText('k=PG_SECRET_1')
  expect((await page.evaluate(() => (window as unknown as W).seen)).join()).not.toContain(KEY)
})

test('preventDefault and stopImmediatePropagation run synchronously inside the event', async ({ page }) => {
  await page.goto('http://localhost:4323/prosemirror.html')
  const r = await page.evaluate(k => {
    const seen: string[] = []
    addEventListener('paste', e => seen.push(e.clipboardData?.getData('text/plain') ?? ''), true)
    const bubble: boolean[] = []
    const c = document.querySelector('[data-composer]') as HTMLElement
    c.addEventListener('paste', () => bubble.push(true))
    const data = new DataTransfer()
    data.setData('text/plain', `k=${k}`)
    const ev = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
    const notCancelled = c.dispatchEvent(ev)
    return { notCancelled, prevented: ev.defaultPrevented, seen, bubble }
  }, KEY)
  expect(r).toEqual({ notCancelled: false, prevented: true, seen: [], bubble: [] })
})

test('allow-listed value is pasted as-is', async ({ page, paste, sw }) => {
  await sw.allow(KEY, 'AWS access key')
  await page.goto('http://localhost:4323/textarea.html')
  await paste(page, `k=${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue(`k=${KEY}`)
})

test('paused site: paste passes through untouched', async ({ page, paste, sw }) => {
  await sw.pause('localhost:4323')
  await page.goto('http://localhost:4323/textarea.html')
  await paste(page, `k=${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue(`k=${KEY}`)
})

test('custom rule from settings is applied, invalid rule is skipped', async ({ page, paste, sw }) => {
  await sw.settings({ rules: [{ type: 'Broken', source: '(' }, { type: 'Project code', source: 'ZZPROJ-\\d{4}' }] })
  await page.goto('http://localhost:4323/textarea.html')
  await paste(page, 'ticket ZZPROJ-1234 open')
  await expect(page.locator('[data-composer]')).toHaveValue('ticket PG_SECRET_1 open')
})

test('ids stay stable across two pastes', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/textarea.html')
  await paste(page, `a=${KEY}\n`); await paste(page, `b=${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue('a=PG_SECRET_1\nb=PG_SECRET_1')
})

test('adapter insert failure: taped text goes to the clipboard, original never lands', async ({ page, paste, clipboard }) => {
  await page.goto('http://localhost:4323/prosemirror.html?broken=1')
  await paste(page, `k=${KEY}`)
  await expect.poll(() => clipboard(page)).toBe('k=PG_SECRET_1')
  await expect(page.locator('[data-composer]')).not.toContainText(KEY)
})

test('5 MB paste with a key at the end: redacted, no long task over 50 ms', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/textarea.html')
  await page.evaluate(() => {
    const w = window as unknown as W
    w.long = []
    new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.duration > 50) w.long.push([e.startTime, e.duration]) })).observe({ type: 'longtask' })
  })
  await paste(page, 'log line 12345 ok\n'.repeat(290_000) + `k=${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue(/k=PG_SECRET_1$/, { timeout: 30000 })
  await page.waitForTimeout(500)
  const r = await page.evaluate(() => {
    const t = (n: string) => performance.getEntriesByName(n).at(-1)?.startTime ?? -1
    return { from: t('pg:paste'), to: t('pg:insert'), long: (window as unknown as W).long }
  })
  expect(r.from).toBeGreaterThanOrEqual(0)
  expect(r.to).toBeGreaterThan(r.from)
  expect(r.to - r.from).toBeGreaterThan(100)
  expect(r.long).toEqual([])
})

for (const kind of ['contenteditable', 'prosemirror']) {
  test(`${kind}: 1 MB paste goes to the clipboard, original never lands, no long task`, async ({ page, paste, clipboard, leaks }) => {
    await page.goto(`http://localhost:4323/${kind}.html`)
    await page.evaluate(() => {
      const w = window as unknown as W
      w.long = []
      new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.duration > 100) w.long.push([e.startTime, e.duration]) })).observe({ type: 'longtask' })
    })
    await paste(page, 'log line 12345 ok\n'.repeat(60_000) + `k=${KEY}`)
    await expect.poll(async () => (await clipboard(page)).endsWith('k=PG_SECRET_1'), { timeout: 15_000 }).toBe(true)
    expect(await clipboard(page)).not.toContain(KEY)
    await expect(page.locator('[data-composer]')).not.toContainText('PG_SECRET_1')
    expect(await leaks(page, KEY)).toEqual([])
    expect(await page.evaluate(() => (window as unknown as W).long)).toEqual([])
  })
}
