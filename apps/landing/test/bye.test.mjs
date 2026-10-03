import { test } from 'node:test'
import assert from 'node:assert/strict'
import { onRequestPost } from '../functions/api/bye.js'

const kv = () => {
  const m = new Map()
  return { m, get: async k => m.get(k) ?? null, put: async (k, v) => void m.set(k, v) }
}
const post = (env, body, ip = '203.0.113.7') =>
  onRequestPost({
    env,
    request: new Request('https://x.test/api/bye', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  })

test('reason 0-3 accepted with 204', async () => {
  for (const reason of [0, 1, 2, 3]) assert.equal((await post({ WAITLIST: kv() }, { reason, v: '0.1.0' }, `198.51.100.${reason}`)).status, 204)
})

test('other reasons rejected with 400', async () => {
  const env = { WAITLIST: kv() }
  for (const [i, reason] of [-1, 4, 1.5, '1', null, undefined].entries()) assert.equal((await post(env, { reason }, `198.51.100.${i}`)).status, 400)
  assert.equal((await post(env, 'not json', '198.51.100.99')).status, 400)
})

test('6th request in a minute from one IP gets 429', async () => {
  const env = { WAITLIST: kv() }
  const codes = []
  for (let i = 0; i < 6; i++) codes.push((await post(env, { reason: 0 })).status)
  assert.deepEqual(codes, [204, 204, 204, 204, 204, 429])
})

test('stored value is the reason index and version only, never the IP', async () => {
  const env = { WAITLIST: kv() }
  await post(env, { reason: 2, v: '1.2.3', note: 'free text', email: 'a@b.co' }, '203.0.113.7')
  const bye = [...env.WAITLIST.m].filter(([k]) => k.startsWith('bye:'))
  assert.equal(bye.length, 1)
  assert.deepEqual(JSON.parse(bye[0][1]), { reason: 2, v: '1.2.3' })
  for (const [k, v] of env.WAITLIST.m) assert.ok(!k.includes('203.0.113.7') && !v.includes('203.0.113.7'))
})

test('malformed version is dropped, not stored', async () => {
  const env = { WAITLIST: kv() }
  await post(env, { reason: 1, v: '<script>' })
  assert.deepEqual(JSON.parse([...env.WAITLIST.m].find(([k]) => k.startsWith('bye:'))[1]), { reason: 1, v: null })
})
