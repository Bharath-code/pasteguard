import { MsgSchema, type Msg } from '../shared/messages.ts'
import { addAllow, markScanned, readSettings } from '../shared/storage.ts'
import { forgetTab, onCaught, setTabState } from './badge.ts'
import { check } from './registry.ts'
import { dropVault, getVault, putVault } from './vault.ts'

type Sender = { id?: string; tab?: { id?: number } }

const ok = { ok: true }

async function handle(msg: Msg, tabId: number): Promise<unknown> {
  switch (msg.t) {
    case 'vault.put':
      return putVault(tabId, msg.entries, msg.next)
    case 'vault.get':
      return getVault(tabId)
    case 'settings.get':
      return readSettings()
    case 'allow.has': {
      const known = new Set((await readSettings()).allow.map(a => a.hash))
      return msg.hashes.map(h => known.has(h))
    }
    case 'pkg':
      return check(msg.eco, msg.name)
    case 'scan.once':
      return { first: await markScanned(msg.id) }
    case 'allow.add':
      return { ok: await addAllow(msg.hash, msg.type) }
    case 'caught':
      await onCaught(tabId, msg.types.length)
      return ok
    case 'adapter.status':
      await setTabState(tabId, msg.ok ? 'active' : 'idle')
      return ok
    case 'sentOriginal':
      return ok
  }
}

export async function route(raw: unknown, sender: Sender): Promise<unknown> {
  const tabId = sender?.tab?.id
  if (sender?.id !== chrome.runtime.id || !Number.isInteger(tabId) || (tabId as number) <= 0) return undefined
  const parsed = MsgSchema.safeParse(raw)
  if (!parsed.success) return undefined
  try {
    return await handle(parsed.data, tabId as number)
  } catch {
    return undefined
  }
}

export const onTabRemoved = (tabId: number) => {
  forgetTab(tabId)
  return dropVault(tabId)
}
