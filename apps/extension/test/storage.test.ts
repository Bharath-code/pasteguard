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
