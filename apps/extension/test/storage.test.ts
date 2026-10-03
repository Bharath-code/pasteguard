import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeChrome } from './fake-chrome.ts'
import { parseSettings, parseStats, parsePkgCache, DEFAULT_SETTINGS, readSettings } from '../src/shared/storage.ts'

test('garbage resets to defaults', () => assert.deepEqual(parseSettings({ v: 99, pii: 'yes' }), DEFAULT_SETTINGS))
test('non-objects reset to defaults', () => {
  for (const g of [null, undefined, 1, 'x', []]) assert.deepEqual(parseSettings(g), DEFAULT_SETTINGS)
})
test('defaults: pii off, nothing paused', () => {
  assert.equal(DEFAULT_SETTINGS.pii, false)
  assert.deepEqual(DEFAULT_SETTINGS.paused, [])
  assert.equal(DEFAULT_SETTINGS.statsOptIn, false)
})
test('valid settings round-trip', () => {
  const s = { ...DEFAULT_SETTINGS, paused: ['claude.ai'] }
  assert.deepEqual(parseSettings(s), s)
})
test('statsOptIn true is rejected', () => assert.deepEqual(parseSettings({ ...DEFAULT_SETTINGS, statsOptIn: true }), DEFAULT_SETTINGS))
test('readSettings reads storage.local and never throws', async () => {
  const c = installFakeChrome()
  assert.deepEqual(await readSettings(), DEFAULT_SETTINGS)
  await c.storage.local.set({ settings: { ...DEFAULT_SETTINGS, pii: true } })
  assert.equal((await readSettings()).pii, true)
  await c.storage.local.set({ settings: 'junk' })
  assert.deepEqual(await readSettings(), DEFAULT_SETTINGS)
})
test('stats and pkg cache schemas', () => {
  assert.equal(parseStats({ v: 1, days: { '2026-10-01': { caught: 2, byType: { 'AWS access key': 2 } } } })?.days['2026-10-01']?.caught, 2)
  assert.equal(parseStats({ v: 2 }), undefined)
  assert.ok(parsePkgCache({ 'npm:left-pad': { verdict: { kind: 'ok' }, at: 1 } }))
  assert.equal(parsePkgCache({ 'npm:x': { verdict: { kind: 'bogus' }, at: 1 } }), undefined)
})

import { recordCatch, weekStats, setPaused, markAdapter, dayKey } from '../src/shared/storage.ts'

test('recordCatch accumulates per day and keeps 14 days', async () => {
  const c = installFakeChrome()
  const d = new Date(2026, 9, 1)
  await recordCatch(['AWS access key', 'Stripe key'], d)
  await recordCatch(['AWS access key'], d)
  const s = parseStats((await c.storage.local.get('stats'))['stats'])
  assert.equal(s?.days['2026-10-01']?.caught, 3)
  assert.deepEqual(s?.days['2026-10-01']?.byType, { 'AWS access key': 2, 'Stripe key': 1 })
  for (let i = 2; i < 20; i++) await recordCatch(['x'], new Date(2026, 9, i))
  assert.equal(Object.keys(parseStats((await c.storage.local.get('stats'))['stats'])?.days ?? {}).length, 14)
})
test('weekStats is Monday-first and ignores other weeks', () => {
  const wed = new Date(2026, 9, 7)
  const stats = { v: 1 as const, days: { [dayKey(new Date(2026, 9, 5))]: { caught: 2, byType: {} }, [dayKey(wed)]: { caught: 1, byType: {} }, [dayKey(new Date(2026, 9, 4))]: { caught: 9, byType: {} } } }
  assert.deepEqual(weekStats(stats, wed), { bars: [2, 0, 1, 0, 0, 0, 0], total: 3, today: 2 })
  assert.deepEqual(weekStats(undefined, new Date(2026, 9, 11)), { bars: [0, 0, 0, 0, 0, 0, 0], total: 0, today: 6 })
})
test('setPaused toggles one host and markAdapter merges', async () => {
  const c = installFakeChrome()
  await setPaused('claude.ai', true)
  await setPaused('claude.ai', true)
  await setPaused('chatgpt.com', true)
  await setPaused('claude.ai', false)
  assert.deepEqual((await readSettings()).paused, ['chatgpt.com'])
  await markAdapter('claude.ai', false)
  await markAdapter('chatgpt.com', true)
  assert.deepEqual((await c.storage.session.get('adapters'))['adapters'], { 'claude.ai': false, 'chatgpt.com': true })
})
