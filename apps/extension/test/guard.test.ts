import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chunkedDetect, compileRules, CHUNK } from '../entrypoints/chat.content/guard.ts'

const KEY = 'AKIA' + 'IOSFODNN7EXAMPLE'
const noYield = () => Promise.resolve()
const opts = { pii: false, extra: [] }
const pad = (n: number) => ' '.repeat(n)

test('key straddling a chunk boundary is found once at its absolute offset', async () => {
  for (const shift of [0, 1, 7, KEY.length - 1, KEY.length]) {
    const at = CHUNK - shift
    const text = pad(at) + KEY + ' ' + pad(CHUNK * 2)
    const hits = await chunkedDetect(text, opts, noYield)
    assert.equal(hits.length, 1, `shift ${shift}`)
    assert.equal(hits[0]?.start, at)
    assert.equal(text.slice(hits[0]?.start, hits[0]?.end), KEY)
  }
})

test('every key across many chunks is found, none duplicated', async () => {
  const text = (pad(CHUNK - 10) + KEY + ' ').repeat(5)
  const hits = await chunkedDetect(text, opts, noYield)
  assert.equal(hits.length, 5)
  assert.equal(new Set(hits.map(h => h.start)).size, 5)
})

test('private key longer than the overlap is still matched whole', async () => {
  const body = ('A'.repeat(64) + '\n').repeat(30)
  const pk = `-----BEGIN RSA PRIVATE KEY-----\n${body}-----END RSA PRIVATE KEY-----`
  const at = CHUNK - 300
  const text = pad(at) + pk + ' ' + pad(CHUNK)
  const hits = await chunkedDetect(text, opts, noYield)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]?.start, at)
  assert.equal(text.slice(hits[0]?.start, hits[0]?.end), pk)
})

test('yields between chunks only', async () => {
  let n = 0
  await chunkedDetect(pad(CHUNK * 3 + 10), opts, () => (n++, Promise.resolve()))
  assert.equal(n, 3)
})

test('compileRules skips invalid patterns', () => {
  const r = compileRules([{ type: 'a', source: '(' }, { type: 'b', source: 'z+' }])
  assert.equal(r.length, 1)
  assert.equal(r[0]?.type, 'b')
})
