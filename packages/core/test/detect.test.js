import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detect, redact } from '../src/detect.js'

test('finds secrets, keeps only the value for assignments and db urls', () => {
  const text = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\nSTRIPE_SECRET_KEY=sk_live_51HxExampleExampleEx\nDATABASE_URL=postgres://admin:hunter2pass@db.acme.io/prod'
  const hits = detect(text).map(h => [h.type, h.value])
  assert.deepEqual(hits, [
    ['AWS access key', 'AKIAIOSFODNN7EXAMPLE'],
    ['Stripe key', 'sk_live_51HxExampleExampleEx'],
    ['Database password', 'hunter2pass'],
  ])
})

test('anthropic wins over generic sk- rule, no overlaps', () => {
  const hits = detect('key sk-ant-api03-abcdefghijklmnopqrstuvwxyz')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].type, 'Anthropic key')
})

test('cards need a valid luhn checksum', () => {
  assert.equal(detect('4242 4242 4242 4242').length, 1)
  assert.equal(detect('4242 4242 4242 4241').length, 0)
})

test('same secret gets the same placeholder', () => {
  const r = redact('a AKIAIOSFODNN7EXAMPLE b AKIAIOSFODNN7EXAMPLE c 4242 4242 4242 4242')
  assert.equal(r.text, 'a PG_SECRET_1 b PG_SECRET_1 c PG_SECRET_2')
  assert.equal(r.count, 2)
})

test('clean text untouched', () => {
  assert.equal(redact('why does my useEffect run twice?').text, 'why does my useEffect run twice?')
})
