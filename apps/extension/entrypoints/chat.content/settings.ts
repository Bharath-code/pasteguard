import type { GuardSettings } from './guard'

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export const toGuardSettings = (raw: unknown): GuardSettings => {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const rules = Array.isArray(o['rules']) ? o['rules'] : []
  return {
    paused: strs(o['paused']),
    pii: o['pii'] === true,
    rules: rules.flatMap(r => {
      const x = r as { type?: unknown; source?: unknown } | null
      return typeof x?.type === 'string' && typeof x.source === 'string' ? [{ type: x.type, source: x.source }] : []
    }),
  }
}

export const settingsSource = (send: (m: { t: 'settings.get' }) => Promise<unknown>): (() => GuardSettings) => {
  let cur = toGuardSettings(undefined)
  send({ t: 'settings.get' }).then(r => {
    cur = toGuardSettings(r)
  }, () => undefined)
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['settings']) cur = toGuardSettings(changes['settings'].newValue)
    })
  } catch {
    return () => cur
  }
  return () => cur
}
