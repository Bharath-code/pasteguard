import type { Msg, VaultReply } from '../../src/shared/messages.ts'

type Send = (m: Msg) => Promise<unknown>
type Redacted = { parts: { text: string; hit?: { type: string; value: string } }[]; state: { next: number; ids: Map<string, string> } }

export const chromeSend: Send = m => chrome.runtime.sendMessage(m)

const isReply = (r: unknown): r is VaultReply =>
  typeof r === 'object' && r !== null && typeof (r as VaultReply).next === 'number' && typeof (r as VaultReply).map === 'object' && (r as VaultReply).map !== null

export class TabVault {
  state: { next: number; ids: Map<string, string> } = { next: 1, ids: new Map() }
  byId = new Map<string, { value: string; type: string }>()
  mirrored = true
  #send: Send

  constructor(send: Send = chromeSend) {
    this.#send = send
  }

  async hydrate(): Promise<boolean> {
    try {
      const r = await this.#send({ t: 'vault.get' })
      if (!isReply(r)) return false
      for (const [id, e] of Object.entries(r.map)) {
        if (this.byId.has(id)) continue
        this.byId.set(id, e)
        if (!this.state.ids.has(e.value)) this.state.ids.set(e.value, id)
      }
      this.state.next = Math.max(this.state.next, r.next)
      return true
    } catch {
      return false
    }
  }

  put(r: Redacted): void {
    const entries: [string, string, string][] = []
    for (const p of r.parts) {
      const id = p.hit && r.state.ids.get(p.hit.value)
      if (!p.hit || !id || this.byId.has(id)) continue
      this.byId.set(id, { value: p.hit.value, type: p.hit.type })
      entries.push([id, p.hit.value, p.hit.type])
    }
    this.state.next = Math.max(this.state.next, r.state.next)
    for (const [value, id] of r.state.ids) this.state.ids.set(value, id)
    if (!entries.length) return
    const fail = () => {
      this.mirrored = false
    }
    try {
      this.#send({ t: 'vault.put', entries, next: this.state.next }).then(res => {
        if (!(typeof res === 'object' && res !== null && (res as { ok?: unknown }).ok === true)) fail()
      }, fail)
    } catch {
      fail()
    }
  }
}
