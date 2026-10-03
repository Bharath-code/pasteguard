const CORAL = '#FF5E7E'
const SIZES = [16, 32, 48, 128] as const
const BADGE_MS = 4000

export type TabState = 'active' | 'idle' | 'paused'

type Key = Parameters<typeof chrome.i18n.getMessage>[0]
const msg = (key: Key, subs?: string[]) => chrome.i18n.getMessage(key, subs)
const num = new Intl.NumberFormat()

// ponytail: SW restart drops these maps (badge clears early, title total resets); persist in storage.session if it matters
const totals = new Map<number, number>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()

const swallow = async (call: () => Promise<unknown> | undefined): Promise<void> => {
  try {
    await call()
  } catch {
    // tab closed or action unavailable
  }
}

const icons = (state: TabState) => Object.fromEntries(SIZES.map(s => [s, `icon/${state}-${s}.png`]))

export async function setTabState(tabId: number, state: TabState): Promise<void> {
  await swallow(() => chrome.action.setIcon({ tabId, path: icons(state) as Record<string, string> }))
  await swallow(() => chrome.action.setTitle({ tabId, title: state === 'paused' ? msg('badgeTitlePaused') : msg('name') }))
}

export async function onCaught(tabId: number, n: number): Promise<void> {
  if (!Number.isInteger(n) || n < 1) return
  const total = (totals.get(tabId) ?? 0) + n
  totals.set(tabId, total)
  const title = msg(total === 1 ? 'badgeTitleOne' : 'badgeTitleMany', [num.format(total)])
  await swallow(() => chrome.action.setBadgeBackgroundColor({ tabId, color: CORAL }))
  await swallow(() => chrome.action.setBadgeText({ tabId, text: num.format(n) }))
  await swallow(() => chrome.action.setTitle({ tabId, title }))
  clearTimeout(timers.get(tabId))
  timers.set(tabId, setTimeout(() => {
    timers.delete(tabId)
    void swallow(() => chrome.action.setBadgeText({ tabId, text: '' }))
  }, BADGE_MS))
}

export function forgetTab(tabId: number): void {
  totals.delete(tabId)
  clearTimeout(timers.get(tabId))
  timers.delete(tabId)
}
