import * as z from 'zod/mini'

export const VerdictSchema = z.object({
  kind: z.enum(['missing', 'missing-scoped', 'new', 'low', 'lookalike', 'ok', 'error']),
  days: z.optional(z.number()),
  downloads: z.optional(z.number()),
  like: z.optional(z.string()),
})

export const SettingsSchema = z.object({
  v: z.literal(1),
  paused: z.array(z.string()),
  pii: z.boolean(),
  rules: z.array(z.object({ type: z.string(), source: z.string() })),
  allow: z.array(z.object({ hash: z.string(), type: z.string(), at: z.number() })),
  statsOptIn: z.literal(false),
})
export type Settings = z.infer<typeof SettingsSchema>

export const StatsSchema = z.object({
  v: z.literal(1),
  days: z.record(z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/)), z.object({ caught: z.number(), byType: z.record(z.string(), z.number()) })),
})
export type Stats = z.infer<typeof StatsSchema>

export const PkgCacheSchema = z.record(z.string().check(z.regex(/^(npm|pypi):.+/)), z.object({ verdict: VerdictSchema, at: z.number() }))
export type PkgCache = z.infer<typeof PkgCacheSchema>

export const STATS_DAYS = 14
export const PKG_TTL_MS = 24 * 60 * 60 * 1000
export const PKG_MAX_ENTRIES = 2000

export const DEFAULT_SETTINGS: Settings = { v: 1, paused: [], pii: false, rules: [], allow: [], statsOptIn: false }

export function parseSettings(raw: unknown): Settings {
  const r = SettingsSchema.safeParse(raw)
  return r.success ? r.data : structuredClone(DEFAULT_SETTINGS)
}

export const parseStats = (raw: unknown): Stats | undefined => {
  const r = StatsSchema.safeParse(raw)
  return r.success ? r.data : undefined
}

export const parsePkgCache = (raw: unknown): PkgCache | undefined => {
  const r = PkgCacheSchema.safeParse(raw)
  return r.success ? r.data : undefined
}

export async function readSettings(): Promise<Settings> {
  try {
    const got = await chrome.storage.local.get('settings')
    return parseSettings(got['settings'])
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export const ALLOW_MAX = 2000

export async function addAllow(hash: string, type: string, at = Date.now()): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(hash)) return false
  const cur = await readSettings()
  if (cur.allow.some(a => a.hash === hash)) return true
  await chrome.storage.local.set({ settings: { ...cur, allow: [...cur.allow, { hash, type, at }].slice(-ALLOW_MAX) } })
  return true
}

export const SCANNED_MAX = 500
let scanLock: Promise<unknown> = Promise.resolve()

export function markScanned(hash: string): Promise<boolean> {
  const run = scanLock.then(async () => {
    const got = await chrome.storage.local.get('scanned')
    const cur = Array.isArray(got['scanned']) ? got['scanned'].filter((x): x is string => typeof x === 'string') : []
    if (cur.includes(hash)) return false
    await chrome.storage.local.set({ scanned: [...cur, hash].slice(-SCANNED_MAX) })
    return true
  })
  scanLock = run.catch(() => undefined)
  return run
}

export const dayKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

let statsLock: Promise<unknown> = Promise.resolve()

export function recordCatch(types: string[], now = new Date()): Promise<void> {
  if (!types.length) return Promise.resolve()
  const run = statsLock.then(async () => {
    const cur = parseStats((await chrome.storage.local.get('stats'))['stats']) ?? { v: 1 as const, days: {} }
    const key = dayKey(now)
    const day = cur.days[key] ?? { caught: 0, byType: {} }
    const byType = { ...day.byType }
    for (const t of types) byType[t] = (byType[t] ?? 0) + 1
    const days = { ...cur.days, [key]: { caught: day.caught + types.length, byType } }
    const keep = Object.keys(days).sort().slice(-STATS_DAYS)
    await chrome.storage.local.set({ stats: { v: 1, days: Object.fromEntries(keep.map(k => [k, days[k]])) } })
  })
  statsLock = run.catch(() => undefined)
  return run
}

export async function markActivated(now = Date.now()): Promise<void> {
  if (typeof (await chrome.storage.local.get('activatedAt'))['activatedAt'] !== 'number') await chrome.storage.local.set({ activatedAt: now })
}

// Monday-first calendar week; future days are 0.
export function weekStats(stats: Stats | undefined, now = new Date()): { bars: number[]; total: number; today: number } {
  const today = (now.getDay() + 6) % 7
  const bars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - today + i)
    return stats?.days[dayKey(d)]?.caught ?? 0
  })
  return { bars, total: bars.reduce((a, b) => a + b, 0), today }
}

export async function setPaused(host: string, paused: boolean): Promise<void> {
  const cur = await readSettings()
  const rest = cur.paused.filter(h => h !== host)
  await chrome.storage.local.set({ settings: { ...cur, paused: paused ? [...rest, host] : rest } })
}

export async function markAdapter(site: string, ok: boolean): Promise<void> {
  const cur = (await chrome.storage.session.get('adapters'))['adapters']
  const map = typeof cur === 'object' && cur !== null ? (cur as Record<string, boolean>) : {}
  await chrome.storage.session.set({ adapters: { ...map, [site]: ok } })
}
