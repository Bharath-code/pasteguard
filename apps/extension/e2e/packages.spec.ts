import type { BrowserContext, Page } from '@playwright/test'
import { test, expect, MOCK } from './fixtures'

type Fact = number | { created: string; weekly?: number }

const DAY = 864e5
const daysAgo = (n: number): string => new Date(Date.now() - n * DAY - 60_000).toISOString()

async function routeRegistry(context: BrowserContext, facts: Record<string, Fact | 'down'>): Promise<{ down: Set<string> }> {
  const down = new Set<string>()
  const lookup = (url: URL): [string, 'doc' | 'dl'] | null => {
    const dl = /^\/downloads\/point\/last-week\/(.+)$/.exec(url.pathname)
    if (url.host === 'api.npmjs.org' && dl) return [decodeURIComponent(dl[1] ?? ''), 'dl']
    if (url.host === 'registry.npmjs.org') return [decodeURIComponent(url.pathname.slice(1)), 'doc']
    const py = /^\/pypi\/([^/]+)\/json$/.exec(url.pathname)
    if (url.host === 'pypi.org' && py) return [py[1] ?? '', 'doc']
    return null
  }
  await context.route(/^https:\/\/(registry\.npmjs\.org|api\.npmjs\.org|pypi\.org)\//, route => {
    const url = new URL(route.request().url())
    const hit = lookup(url)
    const f = hit ? facts[hit[0]] : undefined
    if (!hit || f === 'down' || down.has(hit[0])) return route.abort('connectionfailed')
    if (f === undefined || typeof f === 'number') return route.fulfill({ status: f ?? 404, body: '{}' })
    if (hit[1] === 'dl') return route.fulfill({ json: { downloads: f.weekly ?? 1_000_000 } })
    if (url.host === 'pypi.org') return route.fulfill({ json: { releases: { '1.0': [{ upload_time_iso_8601: f.created }] } } })
    return route.fulfill({ json: { time: { created: f.created } } })
  })
  return { down }
}

type Info = { v: string; tip: string; href: string | null }
const chips = (page: Page, ext: { evalInContent: <T>(p: Page, op: string, ...a: unknown[]) => Promise<T> }) => ext.evalInContent<Info[]>(page, 'pkg.read')
const send = async (page: Page, page$ = '[data-send]'): Promise<void> => {
  await page.locator('[data-composer]').focus()
  await page.keyboard.type('hi')
  await page.click(page$)
}

test('verdicts render after the code block, one announcement', async ({ page, context, ext, shadowLocator }) => {
  await routeRegistry(context, { 'react-form-utils-pro': 404, zod: { created: '2019-03-01T00:00:00Z', weekly: 3e7 } })
  await page.goto(`${MOCK}/prosemirror.html`)
  await send(page)
  await expect.poll(async () => (await chips(page, ext)).map(c => c.v)).toEqual(['Not on npm', 'On npm'])
  await expect.poll(() => shadowLocator(page, '[role=status]').text()).toBe('2 packages checked, 1 not found.')
  expect(await page.evaluate(() => document.querySelector('[data-answer] pre')?.nextElementSibling?.localName)).toBe('pg-pkg')
  expect(await page.evaluate(() => document.querySelector('[data-answer] pre')?.textContent)).toBe('npm i react-form-utils-pro zod')
  expect(await page.evaluate(() => document.querySelector('[data-answer] pre pg-pkg'))).toBeNull()
})

test('verdict copy: found, new, low, PyPI', async ({ page, context, ext }) => {
  await routeRegistry(context, {
    'p-retry': { created: '2018-01-01T00:00:00Z', weekly: 5e6 },
    'fresh-lib': { created: daysAgo(4), weekly: 9_000 },
    'tiny-lib': { created: '2018-01-01T00:00:00Z', weekly: 12 },
    'fastapi-authx': 404,
  })
  await page.goto(`${MOCK}/prosemirror.html?code=${encodeURIComponent('npm i p-retry fresh-lib tiny-lib @acme/nope\npip install fastapi-authx')}`)
  await send(page)
  await expect.poll(async () => (await chips(page, ext)).map(c => c.v)).toEqual(['On npm', 'Registered 4 days ago', 'Only 12 downloads last week', 'Not on public npm', 'Not on PyPI'])
  const all = await chips(page, ext)
  expect(all[0]?.href).toBe('https://www.npmjs.com/package/p-retry')
  expect(all[0]?.tip).toContain('We checked the public registry.')
  expect(all[3]?.href).toBeNull()
})

test("registry down: Couldn't check, Retry recovers", async ({ page, context, ext }) => {
  const { down } = await routeRegistry(context, { zod: { created: '2019-03-01T00:00:00Z' } })
  down.add('zod')
  await page.goto(`${MOCK}/prosemirror.html?code=${encodeURIComponent('npm i zod')}`)
  await send(page)
  await expect.poll(async () => (await chips(page, ext)).map(c => c.v)).toEqual(["Couldn't check"])
  down.clear()
  await ext.evalInContent(page, 'pkg.retry', 0)
  await expect.poll(async () => (await chips(page, ext)).map(c => c.v)).toEqual(['On npm'])
})

test('imports are ignored', async ({ page, context, ext }) => {
  await routeRegistry(context, {})
  await page.goto(`${MOCK}/prosemirror.html?code=${encodeURIComponent('import numpy as np\nfrom requests import get')}`)
  await send(page)
  await page.waitForSelector('[data-answer] pre')
  await page.waitForTimeout(1200)
  expect(await chips(page, ext)).toEqual([])
})

test('site Copy of the code block is unchanged', async ({ page, context, ext, clipboard }) => {
  await routeRegistry(context, { 'react-form-utils-pro': 404, zod: { created: '2019-03-01T00:00:00Z' } })
  await page.goto(`${MOCK}/prosemirror.html`)
  await send(page)
  await expect.poll(async () => (await chips(page, ext)).length).toBe(2)
  await page.click('[data-copy-writeText]')
  expect(await clipboard(page)).toContain('npm i react-form-utils-pro zod')
  expect(await clipboard(page)).not.toMatch(/Not on npm|On npm/)
})

test('the AI page itself makes no registry requests', async ({ page, context, ext }) => {
  await routeRegistry(context, { 'react-form-utils-pro': 404, zod: { created: '2019-03-01T00:00:00Z' } })
  const seen: string[] = []
  page.on('request', r => {
    if (/npmjs|pypi/.test(r.url())) seen.push(r.url())
  })
  await page.goto(`${MOCK}/prosemirror.html`)
  await send(page)
  await expect.poll(async () => (await chips(page, ext)).length).toBe(2)
  expect(seen).toEqual([])
})

test('paused site: no chips', async ({ page, context, sw, ext }) => {
  await routeRegistry(context, { zod: { created: '2019-03-01T00:00:00Z' } })
  await sw.pause('localhost:4323')
  await page.goto(`${MOCK}/prosemirror.html`)
  await send(page)
  await page.waitForSelector('[data-answer] pre')
  await page.waitForTimeout(1200)
  expect(await chips(page, ext)).toEqual([])
})

test('re-rendered answers keep their chips without flicker', async ({ page, context, ext }) => {
  await routeRegistry(context, { 'react-form-utils-pro': 404, zod: { created: '2019-03-01T00:00:00Z' } })
  await page.goto(`${MOCK}/prosemirror.html?rerender=1`)
  await send(page)
  await expect.poll(async () => (await chips(page, ext)).map(c => c.v)).toEqual(['Not on npm', 'On npm'])
  await page.waitForTimeout(3600)
  expect((await chips(page, ext)).map(c => c.v)).toEqual(['Not on npm', 'On npm'])
})
