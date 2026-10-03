import { test, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { watchAdapter } from '../entrypoints/chat.content/health.ts'

const run = (t: TestContext) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  let composer: object | null = null
  const sent: boolean[] = []
  const stop = watchAdapter({ adapter: { composer: () => composer as HTMLElement | null }, send: async m => void sent.push(m.ok), site: 'claude.ai' })
  return { sent, stop, set: (c: object | null) => (composer = c), tick: (n: number) => t.mock.timers.tick(n) }
}

test('composer found early: reports ok once and stops polling', t => {
  const w = run(t)
  w.set({})
  w.tick(1000)
  w.tick(60_000)
  assert.deepEqual(w.sent, [true])
})

test('no composer after settle window: reports limited, then recovers', t => {
  const w = run(t)
  w.tick(9000)
  assert.deepEqual(w.sent, [])
  w.tick(2000)
  assert.deepEqual(w.sent, [false])
  w.tick(10_000)
  assert.deepEqual(w.sent, [false])
  w.set({})
  w.tick(5000)
  assert.deepEqual(w.sent, [false, true])
  w.stop()
})
