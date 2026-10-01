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
})

test('rejects malformed and unknown messages', async () => {
  assert.equal(await route({ t: 'vault.put', entries: 'x' }, okSender), undefined)
  assert.equal(await route({ t: 'vault.put', entries: [['bad id', 'v', 'k']], next: 2 }, okSender), undefined)
  assert.equal(await route({ t: 'nope' }, okSender), undefined)
  assert.equal(await route(null, okSender), undefined)
  assert.equal(await route({ t: 'pkg', eco: 'gem', name: 'x' }, okSender), undefined)
})

test('vault is per tab and purged on close', async () => {
  await route({ t: 'vault.put', entries: [['PG_SECRET_1', 'v', 'AWS access key']], next: 2 }, tab(1))
  assert.equal((await get(tab(2))).next, 1)
  assert.deepEqual((await get(tab(1))).map, { PG_SECRET_1: { value: 'v', type: 'AWS access key' } })
  await onTabRemoved(1)
  assert.equal((await get(tab(1))).next, 1)
})

test('vault.put merges entries and keeps the highest next', async () => {
  await route({ t: 'vault.put', entries: [['PG_SECRET_1', 'a', 'x']], next: 2 }, tab(1))
  await route({ t: 'vault.put', entries: [['PG_SECRET_2', 'b', 'y']], next: 3 }, tab(1))
  await route({ t: 'vault.put', entries: [], next: 1 }, tab(1))
  const v = await get(tab(1))
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
