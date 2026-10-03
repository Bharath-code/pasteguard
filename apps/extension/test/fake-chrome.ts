export type FakeArea = {
  data: Map<string, unknown>
  failSet: boolean
  get(key: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(key: string | string[]): Promise<void>
}

export const SELF = 'self-extension-id'

const area = (): FakeArea => {
  const data = new Map<string, unknown>()
  const self: FakeArea = {
    data,
    failSet: false,
    async get(key) {
      const out: Record<string, unknown> = {}
      if (key === null) return Object.fromEntries([...data].map(([k, v]) => [k, structuredClone(v)]))
      for (const k of Array.isArray(key) ? key : [key]) if (data.has(k)) out[k] = structuredClone(data.get(k))
      return out
    },
    async set(items) {
      if (self.failSet) throw new Error('quota')
      for (const [k, v] of Object.entries(items)) data.set(k, structuredClone(v))
    },
    async remove(key) {
      for (const k of Array.isArray(key) ? key : [key]) data.delete(k)
    },
  }
  return self
}

export function installFakeChrome() {
  const noop = async () => undefined
  const fake = {
    runtime: { id: SELF },
    storage: { session: area(), local: area() },
    action: { setBadgeText: noop, setBadgeBackgroundColor: noop, setTitle: noop, setIcon: noop },
    i18n: { getMessage: () => '' },
  }
  Object.assign(globalThis, { chrome: fake })
  return fake
}
