import * as z from 'zod/mini'
import type { VaultReply } from '../shared/messages.ts'

const StoredSchema = z.object({
  next: z.int().check(z.minimum(1)),
  map: z.record(z.string(), z.object({ value: z.string(), type: z.string() })),
})

const key = (tabId: number) => `vault:${tabId}`

export async function getVault(tabId: number): Promise<VaultReply> {
  const got = await chrome.storage.session.get(key(tabId))
  const r = StoredSchema.safeParse(got[key(tabId)])
  return r.success ? r.data : { next: 1, map: {} }
}

export async function putVault(tabId: number, entries: [string, string, string][], next: number): Promise<void> {
  const cur = await getVault(tabId)
  for (const [id, value, type] of entries) cur.map[id] = { value, type }
  await chrome.storage.session.set({ [key(tabId)]: { next: Math.max(cur.next, next), map: cur.map } })
}

export async function dropVault(tabId: number): Promise<void> {
  await chrome.storage.session.remove(key(tabId))
}
