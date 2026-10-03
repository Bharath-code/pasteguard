import type { Page } from '@playwright/test'
import { test, expect, MOCK } from './fixtures'

const AWS = 'AKIA' + 'IOSFODNN7EXAMPLE'
const VALUE = AWS
type Restored = { text: string; cls: string }[]
const read = (page: Page) => page.evaluate(
  () =>
    new Promise<Restored>(resolve => {
      const id = Math.random()
      addEventListener('message', function on(e) {
        const d = e.data as { __pgTest?: string; id?: number; result?: Restored }
        if (d?.__pgTest === 'res' && d.id === id) {
          removeEventListener('message', on)
          resolve(d.result ?? [])
        }
      })
      postMessage({ __pgTest: 'req', id, op: 'restore.read', args: [] }, location.origin)
    }),
)

test('restores on screen; page JS cannot read the value', async ({ page, pasteTaped }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await pasteTaped(page, `k=${AWS}`)
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
  const view = await page.evaluate(() => {
    const a = document.querySelector('[data-answer]') as HTMLElement
    const v = a.querySelector('pg-v') as HTMLElement
    return [a.textContent, a.innerText, a.outerHTML, String(v.shadowRoot), v.innerText, document.documentElement.outerHTML].join('|')
  })
  expect(view).not.toContain(VALUE)
  expect(view).toContain('PG_SECRET_1')
  await expect.poll(async () => (await read(page))[0]?.cls).toContain('done')
  const [r] = await read(page)
  expect(r?.text).toContain(VALUE)
  expect(r?.text).toContain('Restored on this screen only. The AI saw PG_SECRET_1.')
})

test('placeholder split across streaming chunks restores once complete, never partially', async ({ page, pasteTaped, domHistory }) => {
  await page.goto(`${MOCK}/prosemirror.html?split=1`)
  const history = await domHistory(page)
  await pasteTaped(page, `k=${AWS}`)
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
  const snaps = await history()
  expect(snaps.some(s => s.includes('<pg-v') && !s.includes('PG_SECRET_1'))).toBe(false)
  expect(snaps.every(s => !/<pg-v[^>]*>PG_SEC<\/pg-v>/.test(s))).toBe(true)
})

test('survives React-style re-render without re-peel', async ({ page, pasteTaped }) => {
  await page.goto(`${MOCK}/prosemirror.html?rerender=1`)
  await pasteTaped(page, `k=${AWS}`)
  await page.click('[data-send]')
  await expect.poll(async () => (await read(page)).length).toBe(1)
  await page.waitForTimeout(3600)
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
  const [r] = await read(page)
  expect(r?.cls).toContain('done')
})

test('mangled placeholder is restored; unknown id shows a dashed pill', async ({ page, pasteTaped }) => {
  await page.goto(`${MOCK}/prosemirror.html?answer=${encodeURIComponent('use PG_SECRET 1 and PG_SECRET_9 ok.')}`)
  await pasteTaped(page, `k=${AWS}`)
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(2)
  const r = await read(page)
  expect(r[0]?.text).toContain(VALUE)
  expect(r[1]?.text).toContain('Value cleared when the tab closed')
  expect(r[1]?.text).not.toContain(VALUE)
})

test('restore pass stays under 2 ms (p95) with 100 answers on the page', async ({ page, pasteTaped }) => {
  await page.goto(`${MOCK}/prosemirror.html?answers=100`)
  await pasteTaped(page, `k=${AWS}`)
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
  await page.waitForTimeout(500)
  await page.evaluate(() => postMessage({ __pgTest: 'req', id: 0, op: 'restore.clearTimings', args: [] }, location.origin))
  for (let i = 0; i < 30; i++) {
    await page.evaluate(i => { [...document.querySelectorAll('[data-answer]')].at(-1)?.append(document.createTextNode(` more ${i}`)) }, i)
    await page.waitForTimeout(70)
  }
  const ms = await page.evaluate(
    () =>
      new Promise<number[]>(resolve => {
        const id = Math.random()
        addEventListener('message', function on(e) {
          const d = e.data as { __pgTest?: string; id?: number; result?: number[] }
          if (d?.__pgTest === 'res' && d.id === id) {
            removeEventListener('message', on)
            resolve(d.result ?? [])
          }
        })
        postMessage({ __pgTest: 'req', id, op: 'restore.timings', args: [] }, location.origin)
      }),
  )
  expect(ms.length).toBeGreaterThan(10)
  const p95 = [...ms].sort((a, b) => a - b)[Math.floor(ms.length * 0.95)] ?? 99
  expect(p95).toBeLessThanOrEqual(2)
})

test('reload keeps values via the session mirror; closing the tab clears them', async ({ page, pasteTaped, sw }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await pasteTaped(page, `k=${AWS}`)
  await expect.poll(() => sw.eval(async () => Object.keys(await chrome.storage.session.get(null)).filter(k => k.startsWith('vault:')).length)).toBe(1)
  await page.reload()
  await page.locator('[data-composer]').fill('use PG_SECRET_1 now')
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
  expect((await read(page))[0]?.text).toContain(VALUE)
  await page.close()
  await expect.poll(() => sw.eval(async () => Object.keys(await chrome.storage.session.get(null)).filter(k => k.startsWith('vault:')).length)).toBe(0)
})

test('paused site still restores existing placeholders', async ({ page, pasteTaped, sw }) => {
  await page.goto(`${MOCK}/prosemirror.html`)
  await pasteTaped(page, `k=${AWS}`)
  await sw.pause('localhost:4323')
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
})
