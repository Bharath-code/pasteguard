import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { installFakeChrome } from './fake-chrome.ts'
import { onCaught, setTabState, forgetTab, restoreBadges } from '../src/sw/badge.ts'

const msgs = JSON.parse(readFileSync(new URL('../public/_locales/en/messages.json', import.meta.url), 'utf8'))

function fakeAction() {
  const badge = new Map<number, { text: string; color: string }>()
  const title = new Map<number, string>()
  const icon = new Map<number, Record<string, string>>()
  const cur = (id: number) => badge.get(id) ?? { text: '', color: '' }
  const action = {
    async setBadgeText({ tabId, text }: { tabId: number; text: string }) { badge.set(tabId, { ...cur(tabId), text }) },
    async setBadgeBackgroundColor({ tabId, color }: { tabId: number; color: string }) { badge.set(tabId, { ...cur(tabId), color }) },
    async setTitle({ tabId, title: t }: { tabId: number; title: string }) { title.set(tabId, t) },
    async setIcon({ tabId, path }: { tabId: number; path: Record<string, string> }) { icon.set(tabId, path) },
  }
  const i18n = {
    getMessage(key: string, subs: string[] = []) {
      const m = msgs[key]
      if (!m) return ''
      return m.message.replace(/\$([A-Z]+)\$/g, (_: string, p: string) => subs[Number(m.placeholders[p.toLowerCase()].content.slice(1)) - 1])
    },
  }
  Object.assign((globalThis as unknown as { chrome: object }).chrome, { action, i18n })
  return {
    badge: (id: number) => badge.get(id) ?? { text: '<unset>', color: '' },
    title: (id: number) => title.get(id) ?? '<unset>',
    icon: (id: number) => icon.get(id) ?? {},
  }
}

const flush = () => new Promise<void>(r => setImmediate(r))
let fake: ReturnType<typeof fakeAction>
beforeEach(() => {
  installFakeChrome()
  fake = fakeAction()
})

test('catch sets coral badge then clears after 4 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  await onCaught(7, 2)
  assert.deepEqual(fake.badge(7), { text: '2', color: '#FF5E7E' })
  t.mock.timers.tick(4000)
  await flush()
  assert.equal(fake.badge(7).text, '')
  assert.equal(fake.title(7), 'PasteGuard: 2 secrets taped on this tab')
})

test('title is singular for one and totals across catches; second catch restarts the 4 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  await onCaught(3, 1)
  assert.equal(fake.title(3), 'PasteGuard: 1 secret taped on this tab')
  t.mock.timers.tick(3000)
  await onCaught(3, 2)
  assert.equal(fake.title(3), 'PasteGuard: 3 secrets taped on this tab')
  t.mock.timers.tick(3000)
  assert.equal(fake.badge(3).text, '2')
  t.mock.timers.tick(1000)
  await flush()
  assert.equal(fake.badge(3).text, '')
})

test('state sets a distinct icon set per state and the paused title', async () => {
  await setTabState(5, 'active')
  const active = fake.icon(5)
  await setTabState(5, 'idle')
  const idle = fake.icon(5)
  await setTabState(5, 'paused')
  const paused = fake.icon(5)
  assert.equal(new Set([active[16], idle[16], paused[16]]).size, 3)
  assert.deepEqual(Object.keys(paused), ['16', '32', '48', '128'])
  assert.equal(fake.title(5), 'PasteGuard: paused on this site')
  await setTabState(5, 'idle')
  assert.equal(fake.title(5), 'PasteGuard')
})

test('ignores zero or invalid counts and survives action errors', async () => {
  await onCaught(9, 0)
  assert.equal(fake.badge(9).text, '<unset>')
  ;(chrome.action as unknown as { setBadgeText: () => Promise<void> }).setBadgeText = async () => { throw new Error('tab gone') }
  await onCaught(9, 1)
  await forgetTab(9)
})

test('after a SW restart the total survives and expired badges are cleared', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  await onCaught(4, 2)
  t.mock.timers.reset()
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: Date.now() + 5000 })
  await restoreBadges()
  assert.equal(fake.badge(4).text, '')
  await onCaught(4, 1)
  assert.equal(fake.title(4), 'PasteGuard: 3 secrets taped on this tab')
})

test('after a SW restart a live badge is re-armed for the remaining time', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  await onCaught(6, 1)
  t.mock.timers.tick(1000)
  await restoreBadges()
  t.mock.timers.tick(2999)
  await flush()
  assert.equal(fake.badge(6).text, '1')
  t.mock.timers.tick(1)
  await flush()
  assert.equal(fake.badge(6).text, '')
})

test('forgetTab purges the stored total', async () => {
  await onCaught(8, 2)
  await forgetTab(8)
  await onCaught(8, 1)
  assert.equal(fake.title(8), 'PasteGuard: 1 secret taped on this tab')
})
