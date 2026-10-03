import * as z from 'zod/mini'
import { MAX_VAULT_CHARS, VaultEntrySchema, type VaultPutReply, type VaultReply } from '../shared/messages.ts'

const StoredSchema = z.object({
  next: z.int().check(z.minimum(1)),
  map: z.record(z.string(), z.object({ value: z.string(), type: z.string() })),
})

const key = (tabId: number) => `vault:${tabId}`
const queues = new Map<number, Promise<unknown>>()
const removed = new Set<number>()

function serial<T>(tabId: number, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(tabId) ?? Promise.resolve()).then(fn)
  const tail = run.then(
    () => undefined,
    () => undefined,
  )
  queues.set(tabId, tail)
  void tail.then(() => {
    if (queues.get(tabId) === tail) queues.delete(tabId)
  })
  return run
}

const size = (map: VaultReply['map']) => {
  let n = 0
  for (const [id, e] of Object.entries(map)) n += id.length + e.value.length + e.type.length
  return n
}

async function read(tabId: number): Promise<VaultReply> {
  const got = await chrome.storage.session.get(key(tabId))
  const r = StoredSchema.safeParse(got[key(tabId)])
  return r.success ? r.data : { next: 1, map: {} }
}

export const getVault = (tabId: number): Promise<VaultReply> =>
  serial(tabId, async () => {
    try {
      return await read(tabId)
    } catch {
      return { next: 1, map: {} }
    }
  })

export const putVault = (tabId: number, entries: unknown[], next: number): Promise<VaultPutReply> =>
  serial(tabId, async () => {
    if (removed.has(tabId)) return { ok: false, dropped: 0 }
    try {
      const cur = await read(tabId)
      let total = size(cur.map)
      let dropped = 0
      for (const raw of entries) {
        const e = VaultEntrySchema.safeParse(raw)
        if (!e.success) {
          dropped++
          continue
        }
        const [id, value, type] = e.data
        const old = cur.map[id]
        const delta = old ? value.length + type.length - old.value.length - old.type.length : id.length + value.length + type.length
        if (total + delta > MAX_VAULT_CHARS) {
          dropped++
          continue
        }
        cur.map[id] = { value, type }
        total += delta
      }
      await chrome.storage.session.set({ [key(tabId)]: { next: Math.max(cur.next, next), map: cur.map } })
      return { ok: dropped === 0, dropped }
    } catch {
      return { ok: false, dropped: 0 }
    }
  })

export function dropVault(tabId: number): Promise<void> {
  removed.add(tabId)
  return serial(tabId, async () => {
    try {
      await chrome.storage.session.remove(key(tabId))
    } catch {
      return
    }
  })
}
