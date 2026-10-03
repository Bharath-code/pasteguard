import { sha256Hex } from '@pasteguard/core/hash'
import type { Adapter } from '../../adapters'
import type { Msg } from '../../src/shared/messages.ts'
import type { LeakHit } from '../../ui/notice'
import { chunkedDetect, compileRules, type GuardSettings } from './guard'

export interface LeakScanCtx {
  adapter: Adapter
  send: (m: Msg) => Promise<unknown>
  settings: () => GuardSettings
  show: (hits: LeakHit[]) => void
}

const RETRY_MS = 1500
const MAX_TRIES = 6

const idle = (): Promise<void> =>
  new Promise(resolve => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => resolve(), { timeout: 2000 })
    else setTimeout(resolve, 200)
  })

const yielder = (): Promise<void> => new Promise(r => setTimeout(r, 0))

export function installLeakScan({ adapter, send, settings, show }: LeakScanCtx): void {
  let tried: string | null = null

  const scan = async (id: string, turns: HTMLElement[]): Promise<void> => {
    const reply = await send({ t: 'scan.once', id: await sha256Hex(id) })
    if (!(typeof reply === 'object' && reply !== null && (reply as { first?: unknown }).first === true)) return
    const s = settings()
    const opts = { pii: s.pii, extra: compileRules(s.rules) }
    const hits: LeakHit[] = []
    let t0 = performance.now()
    for (const turn of turns) {
      for (const h of await chunkedDetect(turn.innerText || turn.textContent || '', opts, yielder)) hits.push({ rule: h.rule, type: h.type })
      if (performance.now() - t0 > 8) {
        await yielder()
        t0 = performance.now()
      }
    }
    if (hits.length) show(hits)
  }

  const attempt = (tries: number): void => {
    const id = adapter.conversationId()
    if (!id || id === tried || settings().paused.includes(location.host)) return
    const turns = adapter.userTurns()
    if (!turns.length) {
      if (tries < MAX_TRIES) setTimeout(() => attempt(tries + 1), RETRY_MS)
      return
    }
    tried = id
    void scan(id, turns).catch(() => undefined)
  }

  const start = (): void => void idle().then(() => attempt(0))
  if (document.readyState === 'complete') start()
  else addEventListener('load', start, { once: true })
  ;(window as { navigation?: EventTarget }).navigation?.addEventListener('navigatesuccess', () => setTimeout(start, RETRY_MS))
}
