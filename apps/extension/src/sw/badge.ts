const CORAL = '#FF5E7E'
const SIZES = [16, 32, 48, 128] as const
const BADGE_MS = 4000
const PREFIX = 'badge:'

export type TabState = 'active' | 'idle' | 'paused'
type Stored = { total: number; until: number }

type Key = Parameters<typeof chrome.i18n.getMessage>[0]
const msg = (key: Key, subs?: string[]) => chrome.i18n.getMessage(key, subs)
const num = new Intl.NumberFormat()

const timers = new Map<number, ReturnType<typeof setTimeout>>()
let chain: Promise<unknown> = Promise.resolve()
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = chain.then(fn)
  chain = run.then(() => undefined, () => undefined)
  return run
}

const swallow = async (call: () => Promise<unknown> | undefined): Promise<void> => {
  try {
    await call()
  } catch {
    // tab closed or action unavailable
  }
}

const icons = (state: TabState) => Object.fromEntries(SIZES.map(s => [s, `icon/${state}-${s}.png`])) as Record<string, string>

const read = async (tabId: number): Promise<Stored> => {
  try {
    const v = (await chrome.storage.session.get(PREFIX + tabId))[PREFIX + tabId] as Partial<Stored> | undefined
    return { total: Number(v?.total) || 0, until: Number(v?.until) || 0 }
  } catch {
    return { total: 0, until: 0 }
  }
}
const write = (tabId: number, s: Stored) => swallow(() => chrome.storage.session.set({ [PREFIX + tabId]: s }))

const clearLater = (tabId: number, ms: number) => {
  clearTimeout(timers.get(tabId))
  timers.set(tabId, setTimeout(() => {
    timers.delete(tabId)
    void serial(async () => {
      await swallow(() => chrome.action.setBadgeText({ tabId, text: '' }))
      await write(tabId, { ...(await read(tabId)), until: 0 })
    })
  }, ms))
}

export async function setTabState(tabId: number, state: TabState): Promise<void> {
  await swallow(() => chrome.action.setIcon({ tabId, path: icons(state) }))
  await swallow(() => chrome.action.setTitle({ tabId, title: state === 'paused' ? msg('badgeTitlePaused') : msg('name') }))
}

export function onCaught(tabId: number, n: number): Promise<void> {
  if (!Number.isInteger(n) || n < 1) return Promise.resolve()
  return serial(async () => {
    const total = (await read(tabId)).total + n
    await write(tabId, { total, until: Date.now() + BADGE_MS })
    const title = msg(total === 1 ? 'badgeTitleOne' : 'badgeTitleMany', [num.format(total)])
    await swallow(() => chrome.action.setBadgeBackgroundColor({ tabId, color: CORAL }))
    await swallow(() => chrome.action.setBadgeText({ tabId, text: num.format(n) }))
    await swallow(() => chrome.action.setTitle({ tabId, title }))
    clearLater(tabId, BADGE_MS)
  })
}

// SW restarts lose timers: call at startup to clear expired badges and re-arm the rest.
export function restoreBadges(): Promise<void> {
  return serial(async () => {
    let all: Record<string, unknown> = {}
    try {
      all = await chrome.storage.session.get(null as unknown as string)
    } catch {
      return
    }
    for (const [k, v] of Object.entries(all)) {
      if (!k.startsWith(PREFIX)) continue
      const tabId = Number(k.slice(PREFIX.length))
      const until = Number((v as Partial<Stored>)?.until) || 0
      if (!Number.isInteger(tabId) || !until) continue
      const left = until - Date.now()
      if (left > 0) clearLater(tabId, left)
      else {
        await swallow(() => chrome.action.setBadgeText({ tabId, text: '' }))
        await write(tabId, { ...(await read(tabId)), until: 0 })
      }
    }
  })
}

export async function forgetTab(tabId: number): Promise<void> {
  clearTimeout(timers.get(tabId))
  timers.delete(tabId)
  await serial(() => swallow(() => chrome.storage.session.remove(PREFIX + tabId)))
}
