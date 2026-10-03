import * as z from 'zod/mini'
import { nearest } from '@pasteguard/core/typosquat'
import { verdict } from '@pasteguard/core/verdict'
import { PKG_MAX_ENTRIES, PKG_TTL_MS, parsePkgCache, type PkgCache } from '../shared/storage.ts'

export type Eco = 'npm' | 'pypi'
export type Verdict = z.infer<typeof import('../shared/storage.ts').VerdictSchema>
type Fetch = (url: string, init: RequestInit) => Promise<Response>
type Facts = Parameters<typeof verdict>[0]

const NPM_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
const PYPI_NAME = /^[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?$/
const ERROR: Verdict = { kind: 'error' }

const NpmDoc = z.object({ time: z.object({ created: z.string() }) })
const NpmDownloads = z.object({ downloads: z.number() })
const PypiDoc = z.object({
  releases: z.record(z.string(), z.array(z.object({ upload_time_iso_8601: z.string() }))),
})

export function client(doFetch: Fetch = (u, i) => fetch(u, i), timeoutMs = 2500) {
  const inflight = new Map<string, Promise<Verdict>>()
  let writes: Promise<unknown> = Promise.resolve()

  const get = async (url: string) => {
    const ctl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = new Promise<never>((_, rej) => {
      timer = setTimeout(() => {
        ctl.abort()
        rej(new Error('timeout'))
      }, timeoutMs)
    })
    try {
      return await Promise.race([
        doFetch(url, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' }),
        stop,
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  const json = async (res: Response) => {
    try {
      return (await res.json()) as unknown
    } catch {
      return undefined
    }
  }

  async function facts(eco: Eco, name: string, now: number): Promise<Facts> {
    const scoped = name.startsWith('@')
    const lookalike = nearest(name, eco)
    if (eco === 'pypi') {
      const res = await get(`https://pypi.org/pypi/${name}/json`)
      if (res.status === 404) return { status: 'missing', now }
      if (!res.ok) return { status: 'error', now }
      const doc = PypiDoc.safeParse(await json(res))
      if (!doc.success) return { status: 'error', now }
      const times = Object.values(doc.data.releases).flat().map(f => Date.parse(f.upload_time_iso_8601))
      const valid = times.filter(t => !Number.isNaN(t))
      return { status: 'found', createdAt: valid.length ? Math.min(...valid) : undefined, lookalike, now }
    }
    const enc = name.replace('/', '%2f')
    const [res, dl] = await Promise.all([
      get(`https://registry.npmjs.org/${enc}`),
      get(`https://api.npmjs.org/downloads/point/last-week/${enc}`).catch(() => undefined),
    ])
    if (res.status === 404) return { status: 'missing', scoped, now }
    if (!res.ok) return { status: 'error', now }
    const doc = NpmDoc.safeParse(await json(res))
    const createdAt = doc.success ? Date.parse(doc.data.time.created) : NaN
    if (Number.isNaN(createdAt)) return { status: 'error', now }
    const d = dl?.ok ? NpmDownloads.safeParse(await json(dl)) : undefined
    return { status: 'found', createdAt, weeklyDownloads: d?.success ? d.data.downloads : undefined, lookalike, now }
  }

  async function readCache(): Promise<PkgCache> {
    try {
      return parsePkgCache((await chrome.storage.local.get('pkgcache'))['pkgcache']) ?? {}
    } catch {
      return {}
    }
  }

  const store = (key: string, v: Verdict, now: number) => {
    writes = writes.then(async () => {
      try {
        const cur = await readCache()
        cur[key] = { verdict: v, at: now }
        const kept = Object.entries(cur).sort((a, b) => a[1].at - b[1].at).slice(-PKG_MAX_ENTRIES)
        await chrome.storage.local.set({ pkgcache: Object.fromEntries(kept) })
      } catch {
        return
      }
    })
    return writes
  }

  async function run(eco: Eco, name: string, key: string, now: number): Promise<Verdict> {
    const hit = (await readCache())[key]
    if (hit && now - hit.at >= 0 && now - hit.at < PKG_TTL_MS) return hit.verdict
    let v: Verdict
    try {
      v = verdict(await facts(eco, name, now))
    } catch {
      return ERROR
    }
    if (v.kind !== 'error') await store(key, v, now)
    return v
  }

  return {
    check(eco: Eco, name: string, now = Date.now()): Promise<Verdict> {
      if (!(eco === 'npm' ? NPM_NAME : PYPI_NAME).test(name)) return Promise.resolve(ERROR)
      const key = `${eco}:${name}`
      const pending = inflight.get(key)
      if (pending) return pending
      const p = run(eco, name, key, now).finally(() => inflight.delete(key))
      inflight.set(key, p)
      return p
    },
  }
}

export const check = client().check
