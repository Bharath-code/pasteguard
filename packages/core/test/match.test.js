import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findPlaceholders } from '../src/match.js'

test('single node', () => {
  const [f] = findPlaceholders(['key=PG_SECRET_1;'])
  assert.deepEqual([f.id, f.from, f.to, f.exact], ['PG_SECRET_1', { seg: 0, off: 4 }, { seg: 0, off: 15 }, true])
})

test('split across highlighter spans', () => {
  const [f] = findPlaceholders(['`${', 'PG_SECRET', '_2', '}`'])
  assert.deepEqual([f.id, f.from, f.to], ['PG_SECRET_2', { seg: 1, off: 0 }, { seg: 2, off: 2 }])
})

test('fuzzy forms', () => {
  const ids = findPlaceholders(['PG_SECRET 3, pg_secret_4, PG-SECRET-5, PG_SECRET​6.']).map(f => [f.id, f.exact])
  assert.deepEqual(ids, [['PG_SECRET_3', false], ['PG_SECRET_4', false], ['PG_SECRET_5', false], ['PG_SECRET_6', false]])
})

test('no prefix match inside a longer id', () => {
  assert.deepEqual(findPlaceholders(['PG_SECRET_12 ']).map(f => f.id), ['PG_SECRET_12'])
})

test('streaming: trailing id at end of text is held', () => {
  assert.equal(findPlaceholders(['use PG_SEC']).length, 0)
  assert.equal(findPlaceholders(['use PG_SECRET_1']).length, 0)
  assert.equal(findPlaceholders(['use PG_SECRET_1', ' now']).length, 1)
})

test('streaming=false finalises trailing ids', () => {
  assert.equal(findPlaceholders(['use PG_SECRET_1'], { final: true }).length, 1)
})
