import { execFileSync } from 'node:child_process'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'
import { AI_MATCHES } from '../src/shared/sites'

const root = join(import.meta.dirname, '..')
const out = join(root, '.output', 'chrome-mv3')

const walk = async (dir: string): Promise<string[]> =>
  (await Promise.all((await readdir(dir, { withFileTypes: true })).map(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]))).flat()

const readJs = async (skip = /^$/): Promise<string> =>
  (await Promise.all((await walk(out)).filter(f => f.endsWith('.js') && !skip.test(f)).map(f => readFile(f, 'utf8')))).join('\n')

const preactChunk = /chunks[\\/]jsxRuntime-/

test.beforeAll(() => {
  execFileSync('npx', ['wxt', 'build'], { cwd: root, stdio: 'ignore' })
})

test('manifest is minimal', async () => {
  const m = JSON.parse(await readFile(join(out, 'manifest.json'), 'utf8'))
  expect(m.permissions).toEqual(['storage'])
  expect([...m.host_permissions].sort()).toEqual(
    [...AI_MATCHES, 'https://api.npmjs.org/*', 'https://pypi.org/*', 'https://registry.npmjs.org/*'].sort(),
  )
  expect(JSON.stringify(m)).not.toMatch(/localhost|<all_urls>|web_accessible_resources|externally_connectable/)
})

test('no console, no test hooks, no innerHTML in output', async () => {
  expect(await readJs()).not.toMatch(/console\.(log|debug|info)/)
  expect(await readJs()).not.toMatch(/__pgTestHook/)
  // Preact's own dangerouslySetInnerHTML branch lives in the jsxRuntime chunk; ESLint bans it in our source.
  expect(await readJs(preactChunk)).not.toMatch(/\.innerHTML\s*=/)
})

test('content scripts make no network requests', async () => {
  for (const f of ['chat.js', 'clipboard.js']) {
    const js = await readFile(join(out, 'content-scripts', f), 'utf8')
    expect(js, f).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|import\s*\(/)
  }
})
