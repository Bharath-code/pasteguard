import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

for (const f of ['detect.js', 'rules-extra.js', 'entropy.js']) {
  test(`landing ${f} is an exact copy of core`, async () => {
    const [a, b] = await Promise.all([
      readFile(new URL(`../public/${f}`, import.meta.url), 'utf8'),
      readFile(new URL(`../../../packages/core/src/${f}`, import.meta.url), 'utf8'),
    ])
    assert.equal(a, b)
  })
}
