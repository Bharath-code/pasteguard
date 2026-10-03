import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ROTATE, rotateUrl } from '../src/rotate.js'
import { RULES } from '../src/detect.js'
test('all links are https and point at a rule that exists', () => {
  const ids = new Set(RULES.map(r => r.id))
  for (const [id, url] of Object.entries(ROTATE)) { assert.ok(ids.has(id), id); assert.match(url, /^https:\/\//) }
})
test('covers the headline providers', () => {
  for (const id of ['aws-access-key', 'stripe', 'openai', 'anthropic', 'github', 'slack', 'google-api']) assert.ok(rotateUrl(id), id)
  assert.equal(rotateUrl('card'), null)
})
test('has at least 30 entries', () => {
  assert.ok(Object.keys(ROTATE).length >= 30)
})
