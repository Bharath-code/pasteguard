import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('landing detect.js is an exact copy of core', async () => {
  const [a, b] = await Promise.all([
    readFile(new URL('../public/detect.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../packages/core/src/detect.js', import.meta.url), 'utf8'),
  ])
  assert.equal(a, b)
})
