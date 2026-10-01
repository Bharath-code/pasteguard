import { test } from 'node:test'
import assert from 'node:assert/strict'

class FakeEl {
  closest() { return this }
}
class FakeTextArea extends FakeEl {}
Object.assign(globalThis, {
  Element: FakeEl,
  HTMLTextAreaElement: FakeTextArea,
  HTMLInputElement: class { x = 1 },
  location: { host: 'x.test' },
})
const listeners: ((e: unknown) => void)[] = []
Object.assign(globalThis, { window: { addEventListener: (_: string, f: (e: unknown) => void) => listeners.push(f) } })
const clip: { text?: string; fail: boolean } = { fail: false }
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { clipboard: { writeText: async (t: string) => { if (clip.fail) throw new Error('no'); clip.text = t } } },
})

const { installGuard, ALLOW_TIMEOUT_MS, HYDRATE_TIMEOUT_MS } = await import('../entrypoints/chat.content/guard.ts')
const KEY = 'AKIA' + 'IOSFODNN7EXAMPLE'

const setup = (opts: { send: () => Promise<unknown>; insert?: (t: string) => boolean; target?: object }) => {
  listeners.length = 0
  clip.text = undefined
  clip.fail = false
  const inserted: string[] = []
  const calls: string[] = []
  const target = opts.target ?? new FakeTextArea()
  installGuard({
    adapter: {
      id: 'generic', composer: () => null, answers: () => [], userTurns: () => [], conversationId: () => null, isStreaming: () => false,
      insert: (_el: unknown, t: string) => { inserted.push(t); return opts.insert ? opts.insert(t) : true },
    } as never,
    vault: { state: { next: 1, ids: new Map() }, hydrate: async () => true, put: () => {} },
    settings: () => ({ paused: [], pii: false, rules: [] }),
    ui: { taped: () => calls.push('taped'), fallback: k => calls.push(k) },
    send: opts.send as never,
  })
  const paste = (text: string) => {
    const ev = { clipboardData: { getData: () => text }, composedPath: () => [target], preventDefault() {}, stopImmediatePropagation() {} }
    listeners[0]?.(ev)
  }
  return { inserted, calls, paste }
}

test('allow.has never settling: redacted text lands after timeout, next paste not blocked', async () => {
  const g = setup({ send: () => new Promise(() => {}) })
  g.paste(`k=${KEY}`)
  g.paste(`j=${KEY}`)
  await new Promise(r => setTimeout(r, ALLOW_TIMEOUT_MS * 2 + 400))
  assert.deepEqual(g.inserted, ['k=PG_SECRET_1', 'j=PG_SECRET_1'])
  assert.ok(!g.inserted.join().includes(KEY))
})

test('allow.has garbage or rejection is treated as nothing allowed', async () => {
  for (const send of [async () => 'nope', async () => { throw new Error('x') }]) {
    const g = setup({ send })
    g.paste(`k=${KEY}`)
    await new Promise(r => setTimeout(r, 100))
    assert.deepEqual(g.inserted, ['k=PG_SECRET_1'])
  }
})

test('throwing ui.taped after redaction: redacted fallback, never the original', async () => {
  const g = setup({ send: async () => [false] })
  listeners.length = 0
  const inserted: string[] = []
  installGuard({
    adapter: { id: 'generic', composer: () => null, insert: (_: unknown, t: string) => (inserted.push(t), true) } as never,
    vault: { state: { next: 1, ids: new Map() }, hydrate: async () => true, put: () => { throw new Error('boom') } },
    settings: () => ({ paused: [], pii: false, rules: [] }),
    ui: { taped() {}, fallback() {} },
    send: (async () => [false]) as never,
  })
  listeners[0]?.({ clipboardData: { getData: () => `k=${KEY}` }, composedPath: () => [new FakeTextArea()], preventDefault() {}, stopImmediatePropagation() {} })
  await new Promise(r => setTimeout(r, 100))
  assert.deepEqual(inserted, ['k=PG_SECRET_1'])
  assert.equal(g.inserted.length, 0)
})

test('insert and clipboard both fail: failed signal, original never delivered', async () => {
  const g = setup({ send: async () => [false], insert: () => false })
  clip.fail = true
  g.paste(`k=${KEY}`)
  await new Promise(r => setTimeout(r, 100))
  assert.deepEqual(g.calls, ['failed', 'taped'])
  assert.equal(clip.text, undefined)
})

test('huge paste into a non-field editable skips insert and uses the clipboard', async () => {
  const g = setup({ send: async () => [false], target: new FakeEl() })
  g.paste('a '.repeat(300_000) + `k=${KEY}`)
  await new Promise(r => setTimeout(r, 1500))
  assert.deepEqual(g.inserted, [])
  assert.ok(clip.text?.endsWith('k=PG_SECRET_1'))
  assert.ok(!clip.text?.includes(KEY))
  assert.deepEqual(g.calls, ['inserted-to-clipboard', 'taped'])
})

test('hydrate never settling: paste dropped with failed, original absent; next paste works without id collision', async () => {
  listeners.length = 0
  const inserted: string[] = []
  const calls: string[] = []
  let attempts = 0
  const state = { next: 1, ids: new Map<string, string>() }
  installGuard({
    adapter: { id: 'generic', composer: () => null, insert: (_: unknown, t: string) => (inserted.push(t), true) } as never,
    vault: {
      state,
      hydrate: () => (++attempts === 1 ? new Promise<boolean>(() => {}) : Promise.resolve(((state.next = 3), true))),
      put: () => {},
    },
    settings: () => ({ paused: [], pii: false, rules: [] }),
    ui: { taped: () => calls.push('taped'), fallback: k => calls.push(k) },
    send: (async () => [false]) as never,
  })
  const fire = (text: string) =>
    listeners[0]?.({ clipboardData: { getData: () => text }, composedPath: () => [new FakeTextArea()], preventDefault() {}, stopImmediatePropagation() {} })
  fire(`k=${KEY}`)
  await new Promise(r => setTimeout(r, HYDRATE_TIMEOUT_MS + 300))
  assert.deepEqual(inserted, [])
  assert.deepEqual(calls, ['failed'])
  fire(`k=${KEY}`)
  await new Promise(r => setTimeout(r, 200))
  assert.equal(attempts, 2)
  assert.deepEqual(inserted, ['k=PG_SECRET_3'])
})

test('a throw before the decision still cancels the paste and never inserts the raw text', async () => {
  for (const settings of [
    () => ({ paused: [], get pii(): boolean { throw new Error('x') }, rules: [] }),
    () => { throw new Error('y') },
  ]) {
    listeners.length = 0
    const inserted: string[] = []
    const calls: string[] = []
    installGuard({
      adapter: { id: 'generic', composer: () => null, insert: (_: unknown, t: string) => (inserted.push(t), true) } as never,
      vault: { state: { next: 1, ids: new Map() }, hydrate: async () => true, put: () => {} },
      settings: settings as never,
      ui: { taped() {}, fallback: k => calls.push(k) },
      send: (async () => [false]) as never,
    })
    let prevented = false
    let stopped = false
    listeners[0]?.({
      clipboardData: { getData: () => `k=${KEY}` },
      composedPath: () => [new FakeTextArea()],
      preventDefault: () => (prevented = true),
      stopImmediatePropagation: () => (stopped = true),
    })
    assert.ok(prevented && stopped)
    await new Promise(r => setTimeout(r, 50))
    assert.deepEqual(inserted, [])
    assert.deepEqual(calls, ['failed'])
  }
})
