import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDiagnostic } from '../src/shared/diagnostic.ts'
import { DEFAULT_SETTINGS } from '../src/shared/storage.ts'

test('diagnostic has hostnames and counts only', () => {
  const hash = 'a'.repeat(64)
  const out = buildDiagnostic({
    version: '1.2.3',
    chrome: '125.0.0.0',
    hosts: ['claude.ai', 'chatgpt.com'],
    settings: { ...DEFAULT_SETTINGS, paused: ['claude.ai'], rules: [{ type: 'Acme', source: 'acme_internal_[a-z]+' }], allow: [{ hash, type: 'AWS access key', at: 1 }] },
    adapters: { 'chatgpt.com': false },
  })
  assert.match(out, /claude\.ai=paused chatgpt\.com=limited/)
  assert.match(out, /"rules":1/)
  for (const leak of [hash, 'acme_internal', 'Acme', 'AWS access key', 'allow']) assert.ok(!out.includes(leak), leak)
})
