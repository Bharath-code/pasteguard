import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeChrome, SELF } from './fake-chrome.ts'
import { route, onTabRemoved } from '../src/sw/router.ts'
import { DEFAULT_SETTINGS } from '../src/shared/storage.ts'

type Sender = Parameters<typeof route>[1]
const tab = (id: number) => ({ id: SELF, tab: { id } }) as Sender
const okSender = tab(1)
const get = async (s: Sender) => (await route({ t: 'vault.get' }, s)) as { next: number; map: Record<string, { value: string; type: string }> }

beforeEach(() => {
  installFakeChrome()
})

test('rejects messages from other extensions or without a tab', async () => {
  assert.equal(await route({ t: 'vault.get' }, { id: 'other', tab: { id: 1 } } as Sender), undefined)
  assert.equal(await route({ t: 'vault.get' }, { id: 'other' } as Sender), undefined)
  assert.equal(await route({ t: 'vault.get' }, { id: SELF } as Sender), undefined)
  for (const bad of [0, -1, NaN, 1.5]) assert.equal(await route({ t: 'vault.get' }, tab(bad)), undefined)
})

test('rejects malformed and unknown messages', async () => {
  assert.equal(await route({ t: 'vault.put', entries: 'x' }, okSender), undefined)
  assert.equal(await route({ t: 'nope' }, okSender), undefined)
  assert.equal(await route(null, okSender), undefined)
  assert.equal(await route({ t: 'pkg', eco: 'gem', name: 'x' }, okSender), undefined)
})

test('vault is per tab and purged on close', async () => {
  await route({ t: 'vault.put', entries: [['PG_SECRET_1', 'v', 'AWS access key']], next: 2 }, tab(11))
  assert.equal((await get(tab(12))).next, 1)
  assert.deepEqual((await get(tab(11))).map, { PG_SECRET_1: { value: 'v', type: 'AWS access key' } })
  await onTabRemoved(11)
  assert.equal((await get(tab(11))).next, 1)
})

test('vault.put merges entries and keeps the highest next', async () => {
  await route({ t: 'vault.put', entries: [['PG_SECRET_1', 'a', 'x']], next: 2 }, tab(13))
  await route({ t: 'vault.put', entries: [['PG_SECRET_2', 'b', 'y']], next: 3 }, tab(13))
  await route({ t: 'vault.put', entries: [], next: 1 }, tab(13))
  const v = await get(tab(13))
  assert.equal(v.next, 3)
  assert.equal(Object.keys(v.map).length, 2)
})

test('vault lives in storage.session under vault:<tabId>', async () => {
  const c = installFakeChrome()
  await route({ t: 'vault.put', entries: [['PG_SECRET_1', 'v', 'k']], next: 2 }, tab(7))
  assert.ok(c.storage.session.data.has('vault:7'))
  assert.equal(c.storage.local.data.size, 0)
})

test('settings.get returns defaults', async () => {
  assert.deepEqual(await route({ t: 'settings.get' }, okSender), DEFAULT_SETTINGS)
})

test('stub handlers validate and answer', async () => {
  assert.deepEqual(await route({ t: 'caught', types: ['a'], site: 'claude.ai' }, okSender), { ok: true })
  assert.deepEqual(await route({ t: 'sentOriginal', types: ['a'] }, okSender), { ok: true })
  assert.deepEqual(await route({ t: 'adapter.status', ok: true, site: 'claude.ai' }, okSender), { ok: true })
  assert.deepEqual(await route({ t: 'allow.add', hash: 'h', type: 'k' }, okSender), { ok: true })
  assert.deepEqual(await route({ t: 'allow.has', hashes: ['h1', 'h2'] }, okSender), [false, false])
  assert.deepEqual(await route({ t: 'pkg', eco: 'npm', name: 'left-pad' }, okSender), { kind: 'error' })
  assert.equal(await route({ t: 'caught', types: 'a', site: 1 }, okSender), undefined)
})

const put = (tabId: number, entries: unknown, next = 2) => route({ t: 'vault.put', entries, next }, tab(tabId))

test('concurrent puts both survive and next is the max', async () => {
  const a = put(21, [['PG_SECRET_1', 'a', 'x']], 2)
  const b = put(21, [['PG_SECRET_2', 'b', 'y']], 3)
  assert.deepEqual(await Promise.all([a, b]), [{ ok: true, dropped: 0 }, { ok: true, dropped: 0 }])
  const v = await get(tab(21))
  assert.equal(v.next, 3)
  assert.deepEqual(Object.keys(v.map).sort(), ['PG_SECRET_1', 'PG_SECRET_2'])
})

test('put racing tab removal leaves no vault key', async () => {
  const c = installFakeChrome()
  const p = put(22, [['PG_SECRET_1', 'a', 'x']])
  const r = onTabRemoved(22)
  const late = put(22, [['PG_SECRET_2', 'b', 'y']])
  await Promise.all([p, r, late])
  assert.equal(c.storage.session.data.has('vault:22'), false)
  const c2 = installFakeChrome()
  const r2 = onTabRemoved(23)
  const p2 = put(23, [['PG_SECRET_1', 'a', 'x']])
  await Promise.all([r2, p2])
  assert.equal(c2.storage.session.data.has('vault:23'), false)
})

test('invalid or oversize entry drops only itself', async () => {
  const big = 'x'.repeat(2_000_001)
  const r = await put(24, [['PG_SECRET_1', 'ok', 'k'], ['PG_SECRET_2', big, 'k'], ['bad id', 'v', 'k'], ['PG_SECRET_3', 'ok3', 'k']])
  assert.deepEqual(r, { ok: false, dropped: 2 })
  assert.deepEqual(Object.keys((await get(tab(24))).map).sort(), ['PG_SECRET_1', 'PG_SECRET_3'])
})

test('max-size value is accepted', async () => {
  assert.deepEqual(await put(25, [['PG_SECRET_1', 'x'.repeat(2_000_000), 'k']]), { ok: true, dropped: 0 })
})

test('more than 1000 entries per message is rejected', async () => {
  const many = Array.from({ length: 1001 }, (_, i) => [`PG_SECRET_${i + 1}`, 'v', 'k'])
  assert.equal(await put(26, many, 2000), undefined)
  assert.equal((await put(26, many.slice(0, 1000), 2000) as { ok: boolean }).ok, true)
})

test('per-tab total cap rejects further new entries explicitly', async () => {
  const v = 'x'.repeat(2_000_000)
  const r = await put(27, [['PG_SECRET_1', v, 'k'], ['PG_SECRET_2', v, 'k'], ['PG_SECRET_3', v, 'k'], ['PG_SECRET_4', v, 'k']])
  assert.deepEqual(r, { ok: false, dropped: 1 })
  assert.deepEqual(await put(27, [['PG_SECRET_5', 'small', 'k']]), { ok: true, dropped: 0 })
})

test('storage.set failure replies ok:false without throwing', async () => {
  const c = installFakeChrome()
  c.storage.session.failSet = true
  assert.deepEqual(await put(28, [['PG_SECRET_1', 'a', 'x']]), { ok: false, dropped: 0 })
})
