import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeChrome } from './fake-chrome.ts'
import { client } from '../src/sw/registry.ts'

const DAY = 864e5
const NOW = Date.UTC(2026, 9, 3)
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString()
const res = (status: number, body?: unknown) =>
  new Response(typeof body === 'string' ? body : body === undefined ? null : JSON.stringify(body), { status })

type Routes = Record<string, number | unknown>
function fakeFetch(routes: Routes) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const hit = Object.entries(routes).find(([k]) => url.includes(k))
    if (!hit) return res(404)
    return typeof hit[1] === 'number' ? res(hit[1]) : res(200, hit[1])
  }
  return Object.assign(fn, { calls })
}
const npmDoc = (daysAgo: number) => ({ time: { created: iso(daysAgo) } })
const dl = (n: number) => ({ downloads: n })

beforeEach(() => {
  installFakeChrome()
})

test('404 → missing, scoped 404 → missing-scoped', async () => {
  const f = fakeFetch({ 'registry.npmjs.org/react-form-utils-pro': 404, 'registry.npmjs.org/@acme%2finternal': 404 })
  const c = client(f)
  assert.equal((await c.check('npm', 'react-form-utils-pro', NOW)).kind, 'missing')
  assert.equal((await c.check('npm', '@acme/internal', NOW)).kind, 'missing-scoped')
  assert.ok(f.calls.some(x => x.url === 'https://registry.npmjs.org/@acme%2finternal'))
})

test('new package', async () => {
  const c = client(fakeFetch({ 'registry.npmjs.org/qwxv-brand-new-pkg': npmDoc(4), 'api.npmjs.org': dl(5000) }))
  assert.deepEqual(await c.check('npm', 'qwxv-brand-new-pkg', NOW), { kind: 'new', days: 4 })
})

test('old package with few downloads → low; downloads failure → ok', async () => {
  const low = client(fakeFetch({ 'registry.npmjs.org/qwxv-old-pkg': npmDoc(400), 'api.npmjs.org': dl(7) }))
  assert.deepEqual(await low.check('npm', 'qwxv-old-pkg', NOW), { kind: 'low', downloads: 7 })
  const nodl = client(fakeFetch({ 'registry.npmjs.org/qwxv-old-pkg2': npmDoc(400), 'api.npmjs.org': 500 }))
  assert.equal((await nodl.check('npm', 'qwxv-old-pkg2', NOW)).kind, 'ok')
})

test('pypi uses earliest upload and skips downloads', async () => {
  const f = fakeFetch({
    'pypi.org/pypi/zzpy/json': {
      releases: { '1.0': [{ upload_time_iso_8601: iso(10) }], '0.1': [{ upload_time_iso_8601: iso(900) }], '0.0': [] },
    },
  })
  assert.equal((await client(f).check('pypi', 'zzpy', NOW)).kind, 'ok')
  assert.equal(f.calls.length, 1)
})

test('requests carry no credentials or referrer', async () => {
  const f = fakeFetch({ 'registry.npmjs.org/qwxv-old-pkg': npmDoc(400), 'api.npmjs.org': dl(9999) })
  await client(f).check('npm', 'qwxv-old-pkg', NOW)
  for (const { init } of f.calls) {
    assert.equal(init.credentials, 'omit')
    assert.equal(init.referrerPolicy, 'no-referrer')
  }
})

test('timeout → error, not cached', async () => {
  let n = 0
  const c = client(() => {
    n++
    return new Promise<Response>(() => {})
  }, 20)
  assert.equal((await c.check('npm', 'zzslow', NOW)).kind, 'error')
  assert.equal((await c.check('npm', 'zzslow', NOW)).kind, 'error')
  assert.equal(n, 4)
})

test('5xx → error and not cached', async () => {
  const f = fakeFetch({ 'registry.npmjs.org/zzdown': 503 })
  const c = client(f)
  assert.equal((await c.check('npm', 'zzdown', NOW)).kind, 'error')
  const before = f.calls.length
  await c.check('npm', 'zzdown', NOW)
  assert.ok(f.calls.length > before)
})

test('cached for 24 h, then refetched', async () => {
  const f = fakeFetch({ 'registry.npmjs.org/qwxv-old-pkg': npmDoc(400), 'api.npmjs.org': dl(9999) })
  const c = client(f)
  await c.check('npm', 'qwxv-old-pkg', NOW)
  const n = f.calls.length
  await c.check('npm', 'qwxv-old-pkg', NOW + 23 * 3600e3)
  assert.equal(f.calls.length, n)
  await c.check('npm', 'qwxv-old-pkg', NOW + 25 * 3600e3)
  assert.ok(f.calls.length > n)
})

test('cache survives a new client (service worker restart)', async () => {
  const f = fakeFetch({ 'registry.npmjs.org/qwxv-old-pkg': npmDoc(400), 'api.npmjs.org': dl(9999) })
  await client(f).check('npm', 'qwxv-old-pkg', NOW)
  const n = f.calls.length
  await client(f).check('npm', 'qwxv-old-pkg', NOW + 1000)
  assert.equal(f.calls.length, n)
})

test('concurrent calls share one fetch', async () => {
  const f = fakeFetch({ 'registry.npmjs.org/qwxv-old-pkg': npmDoc(400), 'api.npmjs.org': dl(9999) })
  const c = client(f)
  await Promise.all(Array.from({ length: 5 }, () => c.check('npm', 'qwxv-old-pkg', NOW)))
  assert.equal(f.calls.length, 2)
})

test('invalid names never fetch', async () => {
  const f = fakeFetch({})
  const c = client(f)
  for (const bad of ['../etc', 'a/b', 'UPPER', '', '@x', 'a b', 'a?x=1']) assert.equal((await c.check('npm', bad, NOW)).kind, 'error')
  for (const bad of ['../etc', '-x', 'x-', 'a/b']) assert.equal((await c.check('pypi', bad, NOW)).kind, 'error')
  assert.equal(f.calls.length, 0)
})

test('malformed JSON or schema → error', async () => {
  const bad = client(async () => res(200, '{not json'))
  assert.equal((await bad.check('npm', 'zzbad', NOW)).kind, 'error')
  const shape = client(fakeFetch({ 'registry.npmjs.org/zzshape': { time: {} } }))
  assert.equal((await shape.check('npm', 'zzshape', NOW)).kind, 'error')
  const badDate = client(fakeFetch({ 'registry.npmjs.org/zzdate': { time: { created: 'nope' } } }))
  assert.equal((await badDate.check('npm', 'zzdate', NOW)).kind, 'error')
})

test('lookalike of a top package', async () => {
  const c = client(fakeFetch({ 'registry.npmjs.org/reacct': npmDoc(400), 'api.npmjs.org': dl(9999) }))
  assert.equal((await c.check('npm', 'reacct', NOW)).kind, 'lookalike')
})
