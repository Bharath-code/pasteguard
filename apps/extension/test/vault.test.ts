import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TabVault } from '../entrypoints/chat.content/vault.ts'
import { redact, detect } from '@pasteguard/core/detect'
import type { Msg } from '../src/shared/messages.ts'

const mk = (reply: unknown = { next: 1, map: {} }) => {
  const sent: Msg[] = []
  const vault = new TabVault(async m => (sent.push(m), reply))
  return { vault, sent }
}
const key = ['AKIA', 'IOSFODNN7', 'EXAMPLX'].join('')

test('put updates memory synchronously and mirrors to the SW', () => {
  const { vault, sent } = mk()
  const text = `k ${key}`
  const r = redact(text, detect(text), vault.state)
  vault.put(r)
  assert.equal(vault.byId.get('PG_SECRET_1')?.value, key)
  assert.equal(vault.state.next, 2)
  assert.equal(sent.length, 1)
  assert.equal(sent[0]?.t, 'vault.put')
})

test('put without hits sends nothing', () => {
  const { vault, sent } = mk()
  vault.put(redact('hello', detect('hello'), vault.state))
  assert.equal(sent.length, 0)
})

test('hydrate restores state from vault.get', async () => {
  const { vault } = mk({ next: 3, map: { PG_SECRET_1: { value: 'a', type: 'x' }, PG_SECRET_2: { value: 'b', type: 'y' } } })
  await vault.hydrate()
  assert.equal(vault.state.next, 3)
  assert.equal(vault.state.ids.get('b'), 'PG_SECRET_2')
  assert.equal(vault.byId.get('PG_SECRET_1')?.value, 'a')
})

test('hydrate ignores bad replies and send failures', async () => {
  const bad = mk(undefined)
  await bad.vault.hydrate()
  assert.equal(bad.vault.state.next, 1)
  const boom = new TabVault(async () => {
    throw new Error('x')
  })
  await boom.hydrate()
  boom.put(redact(`k ${key}`, detect(`k ${key}`), boom.state))
  assert.equal(boom.state.next, 2)
})
