import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installFakeChrome, SELF } from './fake-chrome.ts'
import { BYE_URL, onInstalled } from '../src/sw/install.ts'
import { route } from '../src/sw/router.ts'

const setup = () => {
  const c = installFakeChrome()
  const calls = { uninstall: [] as string[], tabs: [] as string[] }
  Object.assign(c, {
    runtime: { ...c.runtime, getManifest: () => ({ version: '1.2.3' }), getURL: (p: string) => `chrome-extension://abc${p}`, setUninstallURL: async (u: string) => void calls.uninstall.push(u) },
    tabs: { create: async (o: { url: string }) => void calls.tabs.push(o.url) },
  })
  return { c, calls }
}

test('install opens the welcome tab and sets the uninstall URL with the version', async () => {
  const { calls } = setup()
  await onInstalled({ reason: 'install' })
  assert.deepEqual(calls.tabs, ['chrome-extension://abc/welcome.html'])
  assert.deepEqual(calls.uninstall, [`${BYE_URL}?v=1.2.3`])
})

test('update refreshes the uninstall URL but never reopens welcome', async () => {
  const { calls } = setup()
  for (const reason of ['update', 'chrome_update']) await onInstalled({ reason })
  assert.deepEqual(calls.tabs, [])
  assert.equal(calls.uninstall.length, 2)
})

test('activatedAt is set by the first real catch and never overwritten', async () => {
  const { c } = setup()
  const sender = { id: SELF, tab: { id: 5 } } as Parameters<typeof route>[1]
  assert.equal((await c.storage.local.get('activatedAt'))['activatedAt'], undefined)
  await route({ t: 'caught', types: ['AWS access key'], site: 'claude.ai' }, sender)
  const first = (await c.storage.local.get('activatedAt'))['activatedAt']
  assert.equal(typeof first, 'number')
  await new Promise(r => setTimeout(r, 5))
  await route({ t: 'caught', types: ['AWS access key'], site: 'claude.ai' }, sender)
  assert.equal((await c.storage.local.get('activatedAt'))['activatedAt'], first)
})
