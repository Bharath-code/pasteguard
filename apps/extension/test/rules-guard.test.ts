import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateRule } from '../src/shared/rules.ts'

test('syntax error → message, never throws', () => {
  const r = validateRule('(')
  assert.equal(r.ok, false)
  assert.match(r.ok ? '' : r.message, /^That pattern has a syntax error: /)
})
test('empty source rejected', () => assert.equal(validateRule('').ok, false))
test('empty-matching pattern rejected', () => assert.equal(validateRule('a*').ok, false))
test('catastrophic pattern rejected by 10 ms guard', () => assert.equal(validateRule('(a+)+$').ok, false))
test('good pattern compiles global', () => {
  const r = validateRule('acme_svc_[a-z0-9]{8,}')
  assert.equal(r.ok, true)
  assert.ok(r.ok && r.re.global && r.re.test('acme_svc_9f2kq81xz'))
})
test('returned regex starts at lastIndex 0', () => {
  const r = validateRule('acme_svc_[a-z0-9]{8,}')
  assert.ok(r.ok && r.re.lastIndex === 0)
})
