import { MsgSchema, type Msg } from '../shared/messages.ts'
import { readSettings } from '../shared/storage.ts'
import { dropVault, getVault, putVault } from './vault.ts'

type Sender = { id?: string; tab?: { id?: number } }

const ok = { ok: true }

async function handle(msg: Msg, tabId: number): Promise<unknown> {
  switch (msg.t) {
    case 'vault.put':
      await putVault(tabId, msg.entries, msg.next)
      return ok
    case 'vault.get':
      return getVault(tabId)
    case 'settings.get':
      return readSettings()
    case 'allow.has': {
      const known = new Set((await readSettings()).allow.map(a => a.hash))
      return msg.hashes.map(h => known.has(h))
    }
    case 'pkg':
      return { kind: 'error' }
    case 'caught':
    case 'sentOriginal':
    case 'allow.add':
    case 'adapter.status':
      return ok
  }
}

export async function route(raw: unknown, sender: Sender): Promise<unknown> {
  const tabId = sender?.tab?.id
  if (sender?.id !== chrome.runtime.id || typeof tabId !== 'number') return undefined
  const parsed = MsgSchema.safeParse(raw)
  if (!parsed.success) return undefined
  try {
    return await handle(parsed.data, tabId)
  } catch {
    return undefined
  }
}

export const onTabRemoved = (tabId: number) => dropVault(tabId)
