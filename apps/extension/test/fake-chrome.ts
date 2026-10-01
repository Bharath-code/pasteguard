export type FakeArea = {
  data: Map<string, unknown>
  get(key: string | string[]): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  remove(key: string | string[]): Promise<void>
}

export const SELF = 'self-extension-id'

const area = (): FakeArea => {
  const data = new Map<string, unknown>()
  return {
    data,
    async get(key) {
      const out: Record<string, unknown> = {}
      for (const k of Array.isArray(key) ? key : [key]) if (data.has(k)) out[k] = structuredClone(data.get(k))
      return out
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) data.set(k, structuredClone(v))
    },
    async remove(key) {
      for (const k of Array.isArray(key) ? key : [key]) data.delete(k)
    },
  }
}

export function installFakeChrome() {
  const fake = { runtime: { id: SELF }, storage: { session: area(), local: area() } }
  Object.assign(globalThis, { chrome: fake })
  return fake
}
