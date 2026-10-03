import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verdict } from '../src/verdict.js'
const now = Date.UTC(2026, 8, 30), day = 864e5
test('precedence', () => {
  assert.equal(verdict({ status: 'error', now }).kind, 'error')
  assert.equal(verdict({ status: 'missing', now }).kind, 'missing')
  assert.equal(verdict({ status: 'missing', scoped: true, now }).kind, 'missing-scoped')
  assert.equal(verdict({ status: 'found', lookalike: 'react', createdAt: now - 400 * day, weeklyDownloads: 9e6, now }).kind, 'lookalike')
  assert.deepEqual(verdict({ status: 'found', createdAt: now - 4 * day, now }), { kind: 'new', days: 4 })
  assert.equal(verdict({ status: 'found', createdAt: now - 400 * day, weeklyDownloads: 12, now }).kind, 'low')
  assert.equal(verdict({ status: 'found', createdAt: now - 400 * day, weeklyDownloads: 5000, now }).kind, 'ok')
})
test('details and edges', () => {
  assert.deepEqual(verdict({ status: 'found', lookalike: 'react', now }), { kind: 'lookalike', like: 'react' })
  assert.deepEqual(verdict({ status: 'found', createdAt: now - 400 * day, weeklyDownloads: 12, now }), { kind: 'low', downloads: 12 })
  assert.equal(verdict({ status: 'found', createdAt: now - 30 * day, now }).kind, 'ok')
  assert.equal(verdict({ status: 'found', createdAt: now - 400 * day, now }).kind, 'ok')
  assert.equal(verdict({ status: 'found', createdAt: now - 400 * day, weeklyDownloads: 100, now }).kind, 'ok')
})
