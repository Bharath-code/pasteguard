import { test } from 'node:test'
import assert from 'node:assert/strict'
import { redact } from '../src/detect.js'
import { sha256Hex } from '../src/hash.js'

const K = 'AKIAIOSFODNN7EXAMPLE'

test('ids are stable across pastes in one tab', () => {
  const state = { next: 1, ids: new Map() }
  assert.equal(redact(`a ${K}`, undefined, state).text, 'a PG_SECRET_1')
  assert.equal(redact(`b sk_live_${'x'.repeat(20)} ${K}`, undefined, state).text, 'b PG_SECRET_2 PG_SECRET_1')
  assert.equal(state.next, 3)
})

test('two tabs number independently', () => {
  const a = { next: 1, ids: new Map() }, b = { next: 1, ids: new Map() }
  redact(K, undefined, a)
  assert.equal(redact(K, undefined, b).text, 'PG_SECRET_1')
})

test('default state keeps the landing API working', () => {
  assert.equal(redact(`${K} ${K}`).count, 1)
})

test('sha256Hex', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
