import { test as base, chromium, expect } from '@playwright/test'
import type { BrowserContext, Page, Worker } from '@playwright/test'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const MOCK = 'http://localhost:4323'
const EXT_PATH = fileURLToPath(new URL('../.output/chrome-mv3-dev', import.meta.url))
const requests = new WeakMap<Page, string[]>()

type Reader = 'text' | 'exists' | 'attr' | 'style' | 'rect'

const call = <T>(page: Page, op: string, args: unknown[]): Promise<T> =>
  page.evaluate(
    ([op, args]) =>
      new Promise<T>((resolve, reject) => {
        const id = Math.random()
        const t = setTimeout(() => {
          removeEventListener('message', on)
          reject(new Error(`test hook timeout: ${op} (is the dev build loaded?)`))
        }, 4000)
        const on = (e: MessageEvent) => {
          const d = e.data as { __pgTest?: string; id?: number; result?: T; error?: string } | null
          if (!d || d.__pgTest !== 'res' || d.id !== id) return
          clearTimeout(t)
          removeEventListener('message', on)
          if (d.error) reject(new Error(d.error))
          else resolve(d.result as T)
        }
        addEventListener('message', on)
        postMessage({ __pgTest: 'req', id, op, args }, location.origin)
      }),
    [op, args] as const,
  )

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

const makeSw = (worker: Worker) => ({
  worker,
  eval: <R>(fn: () => R | Promise<R>): Promise<R> => worker.evaluate(fn),
  async settings(patch: Record<string, unknown> = {}) {
    await worker.evaluate(async p => {
      const got = await chrome.storage.local.get('settings')
      const cur = (got['settings'] as Record<string, unknown> | undefined) ?? { v: 1, paused: [], pii: false, rules: [], allow: [], statsOptIn: false }
      await chrome.storage.local.set({ settings: { ...cur, ...p } })
    }, patch)
  },
  async allow(value: string, type: string) {
    const entry = { hash: sha256(value), type, at: Date.now() }
    await worker.evaluate(async e => {
      const got = await chrome.storage.local.get('settings')
      const cur = (got['settings'] as { allow?: unknown[] } | undefined) ?? { v: 1, paused: [], pii: false, rules: [], allow: [], statsOptIn: false }
      await chrome.storage.local.set({ settings: { ...cur, allow: [...(cur.allow ?? []), e] } })
    }, entry)
  },
  pause: (host: string) =>
    worker.evaluate(async h => {
      const got = await chrome.storage.local.get('settings')
      const cur = (got['settings'] as { paused?: string[] } | undefined) ?? { v: 1, paused: [], pii: false, rules: [], allow: [], statsOptIn: false }
      await chrome.storage.local.set({ settings: { ...cur, paused: [...(cur.paused ?? []), h] } })
    }, host),
  reset: () => worker.evaluate(async () => { await chrome.storage.local.clear(); await chrome.storage.session.clear() }),
})

export const shadowLocator = (page: Page, sel: string) => ({
  text: () => call<string | null>(page, 'shadow.read', [sel, 'text']),
  exists: () => call<boolean>(page, 'shadow.read', [sel, 'exists']),
  count: () => call<number>(page, 'shadow.count', [sel]),
  attr: (name: string) => call<string | null>(page, 'shadow.read', [sel, 'attr', name]),
  style: (prop: string) => call<string | null>(page, 'shadow.read', [sel, 'style', prop]),
  rect: () => call<{ x: number; y: number; width: number; height: number } | null>(page, 'shadow.read', [sel, 'rect']),
})

export const shadowText = (page: Page, sel: string) => shadowLocator(page, sel).text()
export const shadowTexts = (page: Page, host: string) => call<string[]>(page, 'shadow.texts', [host])
export const shadow = (page: Page, sel: string, reader: Reader, arg?: string) => call<unknown>(page, 'shadow.read', [sel, reader, arg ?? ''])
export const shadowStyle = (page: Page, sel: string, prop: string) => shadowLocator(page, sel).style(prop)

type Fixtures = {
  ext: { evalInContent: <T>(page: Page, op: string, ...args: unknown[]) => Promise<T> }
  extId: string
  sw: ReturnType<typeof makeSw>
  paste: (page: Page, text: string) => Promise<void>
  pasteTaped: (page: Page, text: string) => Promise<void>
  clipboard: (page: Page) => Promise<string>
  leaks: (page: Page, value: string) => Promise<string[]>
  restored: (page: Page, kind: string, text: string) => Promise<string>
  domHistory: (page: Page) => Promise<() => Promise<string[]>>
  shadowText: typeof shadowText
  shadowTexts: typeof shadowTexts
  shadow: typeof shadow
  shadowLocator: typeof shadowLocator
  shadowStyle: typeof shadowStyle
}

export const test = base.extend<Fixtures>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`],
    })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: MOCK })
    await use(context)
    await context.close()
  },
  page: async ({ context }, use) => {
    await fetch(`${MOCK}/log`, { method: 'DELETE' })
    const page = await context.newPage()
    const seen: string[] = []
    requests.set(page, seen)
    page.on('request', r => {
      const d = r.postData()
      if (d) seen.push(d)
    })
    await use(page)
  },
  extId: async ({ context }, use) => {
    const worker = await getWorker(context)
    await use(new URL(worker.url()).host)
  },
  sw: async ({ context }, use) => {
    await use(makeSw(await getWorker(context)))
  },
  ext: async ({ context }, use) => {
    await getWorker(context)
    await use({ evalInContent: (page, op, ...args) => call(page, op, args) })
  },
  paste: async ({}, use) => {
    await use(async (page, text) => {
      await page.bringToFront()
      await page.evaluate(t => navigator.clipboard.writeText(t), text)
      await page.locator('[data-composer]').focus()
      await page.keyboard.press('ControlOrMeta+V')
    })
  },
  pasteTaped: async ({ paste }, use) => {
    await use(async (page, text) => {
      await paste(page, text)
      await page.waitForFunction(() => {
        const c = document.querySelector<HTMLElement>('[data-composer]')
        return /PG_SECRET_\d/.test(c instanceof HTMLTextAreaElement ? c.value : (c?.textContent ?? ''))
      })
    })
  },
  clipboard: async ({}, use) => {
    await use(async page => {
      await page.bringToFront()
      return page.evaluate(() => navigator.clipboard.readText())
    })
  },
  leaks: async ({}, use) => {
    await use(async (page, value) => {
      const found: string[] = []
      const log = (await (await fetch(`${MOCK}/log`)).json()) as { text: string }[]
      if (log.some(l => l.text.includes(value))) found.push('log')
      if ((await page.evaluate(() => document.documentElement.outerHTML)).includes(value)) found.push('dom')
      if ((await page.content()).includes(value)) found.push('content')
      if ((requests.get(page) ?? []).some(b => b.includes(value))) found.push('request')
      return found
    })
  },
  restored: async ({ pasteTaped }, use) => {
    await use(async (page, kind, text) => {
      await page.goto(`${MOCK}/${kind}.html`)
      await pasteTaped(page, text)
      await page.click('[data-send]')
      await page.waitForSelector('[data-answer] pg-v', { timeout: 10_000 })
      return page.locator('[data-answer]').last().innerText()
    })
  },
  domHistory: async ({}, use) => {
    await use(async page => {
      await page.evaluate(() => {
        const w = window as unknown as { __domHistory: string[] }
        w.__domHistory = []
        new MutationObserver(() => {
          for (const a of document.querySelectorAll('[data-answer]')) w.__domHistory.push(a.outerHTML)
        }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true })
      })
      return () => page.evaluate(() => (window as unknown as { __domHistory: string[] }).__domHistory)
    })
  },
  shadowText: async ({}, use) => use(shadowText),
  shadowTexts: async ({}, use) => use(shadowTexts),
  shadow: async ({}, use) => use(shadow),
  shadowLocator: async ({}, use) => use(shadowLocator),
  shadowStyle: async ({}, use) => use(shadowStyle),
})

async function getWorker(context: BrowserContext): Promise<Worker> {
  const found = context.serviceWorkers()[0]
  return found ?? context.waitForEvent('serviceworker', { timeout: 10_000 })
}

export { expect }
