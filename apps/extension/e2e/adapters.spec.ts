import { test, expect, MOCK } from './fixtures'

const SECRET_TEXT = 'hello PG_SECRET_1'

for (const kind of ['prosemirror', 'textarea', 'contenteditable']) {
  test(`${kind}: generic adapter inserts text`, async ({ page, ext }) => {
    await page.goto(`${MOCK}/${kind}.html?adapter=generic`)
    expect(await ext.evalInContent<string>(page, 'adapterId')).toBe('generic')
    expect(await ext.evalInContent<boolean>(page, 'insert', SECRET_TEXT)).toBe(true)
    const composer = page.locator('[data-composer]')
    if (kind === 'textarea') await expect(composer).toHaveValue(SECRET_TEXT)
    else await expect(composer).toContainText(SECRET_TEXT)
  })

  test(`${kind}: broken page rejects synthetic paste and execCommand`, async ({ page, ext }) => {
    await page.goto(`${MOCK}/${kind}.html?broken=1`)
    expect(await ext.evalInContent<boolean>(page, 'insert', SECRET_TEXT)).toBe(false)
  })
}

test('generic adapter: answers and user turns are empty, so restore is disabled', async ({ page, ext }) => {
  await page.goto(`${MOCK}/textarea.html?adapter=generic`)
  expect(await ext.evalInContent<string[]>(page, 'answers')).toEqual([])
  expect(await ext.evalInContent<string[]>(page, 'userTurns')).toEqual([])
  expect(await ext.evalInContent<string | null>(page, 'conversationId')).toBeNull()
})

test('mock page streams an answer with the sent token and an install command', async ({ page }) => {
  await page.goto(`${MOCK}/textarea.html`)
  await page.locator('[data-composer]').fill('use PG_SECRET_1 please')
  await page.click('[data-send]')
  await expect(page.locator('[data-answer]')).toContainText('PG_SECRET_1')
  await expect(page.locator('[data-answer] pre code')).toHaveText('npm i react-form-utils-pro zod')
  await expect(page.locator('[data-user-turn]')).toHaveCount(1)
  const log = (await (await fetch(`${MOCK}/log`)).json()) as { text: string }[]
  expect(log.map(l => l.text)).toEqual(['use PG_SECRET_1 please'])
})

for (const kind of ['prosemirror', 'textarea', 'contenteditable']) {
  test(`${kind}: harness paste lands in the composer`, async ({ page, paste }) => {
    await page.goto(`${MOCK}/${kind}.html`)
    await paste(page, 'line one\nline two')
    const composer = page.locator('[data-composer]')
    if (kind === 'textarea') await expect(composer).toHaveValue('line one\nline two')
    else await expect(composer).toContainText('line two')
  })
}

test('mock flags: split, history, hostile, rerender, copy buttons', async ({ page, clipboard }) => {
  await page.goto(`${MOCK}/textarea.html?split=1&history=aws&c=conv-7&hostile=1`)
  await expect(page.locator('body')).toHaveAttribute('data-conversation', 'conv-7')
  await expect(page.locator('[data-user-turn]')).toHaveCount(2)
  await expect(page.locator('[data-user-turn]').last()).toContainText('AKIA' + 'IOSFODNN7EXAMPLE')
  await page.locator('[data-composer]').fill('x PG_SECRET_1')
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pre code')).toHaveText('npm i react-form-utils-pro zod')
  const spans = await page.locator('[data-answer] p span').allTextContents()
  expect(spans).toContain('PG_SEC')
  expect(spans.join('')).toContain('PG_SECRET_1 done')
  expect(await page.evaluate(() => getComputedStyle(document.querySelectorAll('[data-answer] p')[0] as Element).color)).toBe('rgb(255, 0, 0)')
  for (const b of ['writeText', 'write', 'exec']) {
    await page.click(`[data-copy-${b}]`)
    await expect.poll(() => clipboard(page)).toContain('npm i react-form-utils-pro zod')
    await page.evaluate(() => navigator.clipboard.writeText('reset'))
  }
})

test('mock flag rerender replaces the answer subtree repeatedly', async ({ page }) => {
  await page.goto(`${MOCK}/textarea.html?rerender=1`)
  await page.locator('[data-composer]').fill('x PG_SECRET_1')
  await page.click('[data-send]')
  await expect(page.locator('[data-answer] pre code')).toBeVisible()
  await page.evaluate(() => {
    const w = window as unknown as { swaps: number }
    w.swaps = 0
    new MutationObserver(() => w.swaps++).observe(document.querySelectorAll('[data-answer]')[0] as Element, { childList: true })
  })
  await expect.poll(() => page.evaluate(() => (window as unknown as { swaps: number }).swaps), { timeout: 5000 }).toBeGreaterThan(3)
})

test('async paste handler that calls preventDefault: inserts exactly once and returns true', async ({ page, ext }) => {
  await page.goto(`${MOCK}/prosemirror.html?asyncpaste=1`)
  expect(await ext.evalInContent<boolean>(page, 'insert', SECRET_TEXT)).toBe(true)
  await expect(page.locator('[data-composer]')).toContainText(SECRET_TEXT)
  await page.waitForTimeout(150)
  expect(await page.locator('[data-composer]').innerText()).toBe(SECRET_TEXT)
})
