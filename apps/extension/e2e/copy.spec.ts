import type { Page } from '@playwright/test'
import { test, expect, MOCK } from './fixtures'

const AWS = 'AKIA' + 'IOSFODNN7EXAMPLE'
const GH = 'ghp_' + 'abcdefghijklmnopqrstuvwxyz0123456789'
const TWO = `a=${AWS} b=${GH}`

const SENTINEL = 'before'
const arm = (page: Page) => page.evaluate(t => navigator.clipboard.writeText(t), SENTINEL)

// Range over the answer's text nodes: [startIndex, startOffset] to [endIndex, endOffset]; offset -1 = node end.
const selectText = (page: Page, from: [number, number], to: [number, number]) =>
  page.evaluate(
    ([f, t]) => {
      const p = [...document.querySelectorAll('[data-answer] p')].at(-1) as HTMLElement
      const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
      const nodes: Text[] = []
      for (let n = w.nextNode(); n; n = w.nextNode()) if ((n as Text).length) nodes.push(n as Text)
      const at = (i: number, o: number): [Text, number] => {
        const n = nodes[i]
        if (!n) throw new Error(`no text node ${i}`)
        return [n, o < 0 ? n.length : o]
      }
      const r = document.createRange()
      r.setStart(...at(...(f as [number, number])))
      r.setEnd(...at(...(t as [number, number])))
      const sel = getSelection()
      sel?.removeAllRanges()
      sel?.addRange(r)
    },
    [from, to] as const,
  )

const sendWith = async (page: Page, pasteTaped: (p: Page, t: string) => Promise<void>, answer: string) => {
  await page.goto(`${MOCK}/prosemirror.html?answer=${encodeURIComponent(answer)}`)
  await pasteTaped(page, `k=${AWS}`)
  await page.click('[data-send]')
  await page.waitForSelector('[data-answer] pg-v')
  await arm(page)
}

test('site Copy via writeText returns the real value', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', `k=${AWS}`)
  await arm(page)
  await page.click('[data-copy-writeText]')
  await expect.poll(() => clipboard(page)).toContain('IOSFODNN7EXAMPLE')
})

test('site Copy via clipboard.write([ClipboardItem]) returns the real value', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', `k=${AWS}`)
  await arm(page)
  await page.click('[data-copy-write]')
  await expect.poll(() => clipboard(page)).toContain('IOSFODNN7EXAMPLE')
})

test('site Copy via execCommand("copy") returns the real value', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', `k=${AWS}`)
  await arm(page)
  await page.click('[data-copy-exec]')
  await expect.poll(() => clipboard(page)).toContain('IOSFODNN7EXAMPLE')
})

test('selection ⌘C across two pg-v and a partial one', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', TWO)
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(2)
  await arm(page)
  await selectText(page, [2, 5], [6, 4])
  await page.keyboard.press('ControlOrMeta+C')
  await expect.poll(() => clipboard(page)).toMatch(new RegExp(`${AWS}.*${GH}`, 's'))
  expect(await clipboard(page)).not.toContain('PG_SECRET')
})

test('triple-click line ending at a pg-v includes it (Gemini case)', async ({ page, pasteTaped, clipboard }) => {
  await sendWith(page, pasteTaped, 'Done, key is PG_SECRET_1 ')
  await selectText(page, [0, 0], [1, -1])
  await page.keyboard.press('ControlOrMeta+C')
  await expect.poll(() => clipboard(page)).toContain(AWS)
})

test('selection that stops before a pg-v with more text after it does not pull the secret in', async ({ page, pasteTaped, clipboard }) => {
  await sendWith(page, pasteTaped, 'Key PG_SECRET_1 tail')
  await selectText(page, [0, 0], [1, -1])
  await page.keyboard.press('ControlOrMeta+C')
  await expect.poll(() => clipboard(page)).not.toBe(SENTINEL)
  expect(await clipboard(page)).not.toContain('IOSFODNN7EXAMPLE')
})

// Review Focus #3
test('forged pg-copy without user gesture does nothing', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', `k=${AWS}`)
  await arm(page)
  // page.evaluate runs with a CDP user gesture; waitForFunction polls without one.
  await page.waitForFunction(() => {
    if (navigator.userActivation.isActive) return false
    document.dispatchEvent(new CustomEvent('pg-copy', { detail: 'x PG_SECRET_1' }))
    return true
  })
  await page.waitForTimeout(200)
  expect(await clipboard(page)).toBe(SENTINEL)
})

test('page-world holds no vault: shim source contains no map and no values', async ({ page, restored }) => {
  await restored(page, 'prosemirror', `k=${AWS}`)
  const heap = await page.evaluate(() => JSON.stringify(Object.getOwnPropertyNames(window)) + String(navigator.clipboard.writeText) + String(navigator.clipboard.write))
  expect(heap).not.toContain('IOSFODNN7EXAMPLE')
})

test('page cannot replace the wrapped clipboard methods', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', `k=${AWS}`)
  await arm(page)
  await page.evaluate(() => {
    try {
      ;(navigator.clipboard as unknown as { writeText: unknown }).writeText = () => Promise.resolve()
    } catch {}
  })
  await page.click('[data-copy-writeText]')
  await expect.poll(() => clipboard(page)).toContain('IOSFODNN7EXAMPLE')
})

test('page listener on copy never sees the real value', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', `k=${AWS}`)
  await page.evaluate(() => {
    const w = window as unknown as { __seen: string[] }
    w.__seen = []
    document.addEventListener('copy', e => w.__seen.push(e.clipboardData?.getData('text/plain') ?? ''))
  })
  await arm(page)
  await selectText(page, [1, 0], [3, 0])
  await page.keyboard.press('ControlOrMeta+C')
  await expect.poll(() => clipboard(page)).toContain(AWS)
  const seen = await page.evaluate(() => (window as unknown as { __seen: string[] }).__seen)
  expect(seen.join('|')).not.toContain('IOSFODNN7EXAMPLE')
})
