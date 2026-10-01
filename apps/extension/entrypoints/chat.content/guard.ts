import { detect, redact } from '@pasteguard/core/detect'
import { sha256Hex } from '@pasteguard/core/hash'
import type { Adapter } from '../../adapters'
import type { Msg } from '../../src/shared/messages.ts'
import type { TabVault } from './vault'

export type GuardSettings = { paused: string[]; pii: boolean; rules: { type: string; source: string }[] }

export interface GuardUI {
  taped(r: { types: string[]; count: number; original: string; taped: string; target: HTMLElement }): void
  fallback(kind: 'inserted-to-clipboard' | 'failed'): void
}

type Hit = ReturnType<typeof detect>[number]
type Extra = { type: string; re: RegExp }

export interface GuardCtx {
  adapter: Adapter
  vault: Pick<TabVault, 'state' | 'hydrate' | 'put'>
  settings: () => GuardSettings
  ui: GuardUI
  send: (m: Msg) => Promise<unknown>
  mark?: (name: 'paste' | 'insert') => void
}

export const BIG_PASTE = 256 * 1024
export const CHUNK = 64 * 1024
export const OVERLAP = 512
export const ALLOW_TIMEOUT_MS = 1500
export const EDITABLE_INSERT_CAP = 256 * 1024
const KEY_TAIL_MAX = 16 * 1024
const EDITABLE = 'textarea, input, [contenteditable]:not([contenteditable=false])'

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T | undefined> =>
  new Promise(resolve => {
    const t = setTimeout(() => resolve(undefined), ms)
    p.then(
      v => (clearTimeout(t), resolve(v)),
      () => (clearTimeout(t), resolve(undefined)),
    )
  })

const yieldNow = (): Promise<void> => {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  return s?.yield ? s.yield() : new Promise(r => setTimeout(r, 0))
}

const windowEnd = (text: string, end: number): number => {
  const limit = Math.min(text.length, end + OVERLAP)
  const head = text.lastIndexOf('-----BEGIN ', limit)
  if (head < end - KEY_TAIL_MAX || head < 0 || text.lastIndexOf('-----END ', limit) > head) return limit
  const close = text.indexOf('-----END ', limit)
  return close < 0 || close - limit > KEY_TAIL_MAX ? limit : Math.min(text.length, close + 80)
}

export async function chunkedDetect(text: string, opts: { pii: boolean; extra: Extra[] }, yielder: () => Promise<void> = yieldNow): Promise<Hit[]> {
  const seen = new Set<string>()
  const out: Hit[] = []
  for (let a = 0; a < text.length; a += CHUNK) {
    const b = Math.min(text.length, a + CHUNK)
    const from = Math.max(0, a - OVERLAP)
    for (const h of detect(text.slice(from, windowEnd(text, b)), opts)) {
      const start = h.start + from
      const key = `${start}:${h.end + from}`
      if (start < a || start >= b || seen.has(key)) continue
      seen.add(key)
      out.push({ ...h, start, end: h.end + from })
    }
    if (b < text.length) await yielder()
  }
  return out.sort((x, y) => x.start - y.start).reduce<Hit[]>((kept, h) => {
    const p = kept[kept.length - 1]
    if (!p || h.start >= p.end) kept.push(h)
    return kept
  }, [])
}

export function compileRules(rules: GuardSettings['rules']): Extra[] {
  const out: Extra[] = []
  for (const r of rules) {
    try {
      out.push({ type: r.type, re: new RegExp(r.source, 'g') })
    } catch {
      continue
    }
  }
  return out
}

export function installGuard(ctx: GuardCtx): void {
  const { adapter, vault, ui, send } = ctx
  let own = false
  let ready: Promise<void> | undefined
  let queue: Promise<void> = Promise.resolve()
  let compiled: { src: GuardSettings['rules']; extra: Extra[] } | undefined

  const opts = (s: GuardSettings) => {
    if (compiled?.src !== s.rules) compiled = { src: s.rules, extra: compileRules(s.rules) }
    return { pii: s.pii, extra: compiled.extra }
  }

  const targetOf = (e: Event): HTMLElement | null => {
    const t = e.composedPath()[0]
    if (!(t instanceof Element)) return null
    if (adapter.id === 'generic') return t.closest<HTMLElement>(EDITABLE)
    const c = adapter.composer()
    return c?.contains(t) ? c : null
  }

  const place = (target: HTMLElement, text: string): boolean => {
    ctx.mark?.('insert')
    own = true
    try {
      return adapter.insert(target, text)
    } catch {
      return false
    } finally {
      own = false
    }
  }

  const toClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      ui.fallback('failed')
      return
    }
    ui.fallback('inserted-to-clipboard')
  }

  const deliver = async (target: HTMLElement, text: string): Promise<void> => {
    const field = target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement
    if ((field || text.length <= EDITABLE_INSERT_CAP) && place(target, text)) return
    await toClipboard(text)
  }

  const run = async (target: HTMLElement, text: string, hits: Hit[] | null, safe: { text?: string }): Promise<void> => {
    const found = hits ?? (await chunkedDetect(text, opts(ctx.settings())))
    if (!found.length) return deliver(target, text)
    ready ??= vault.hydrate()
    const [, hashes] = await Promise.all([withTimeout(ready, ALLOW_TIMEOUT_MS), Promise.all(found.map(h => sha256Hex(h.value)))])
    const allowed = await withTimeout(send({ t: 'allow.has', hashes }), ALLOW_TIMEOUT_MS)
    const remaining = found.filter((_, i) => !(Array.isArray(allowed) && allowed[i] === true))
    if (!remaining.length) return deliver(target, text)
    const r = redact(text, remaining, vault.state)
    safe.text = r.text
    vault.put(r)
    await deliver(target, r.text)
    const types = [...new Set(remaining.map(h => h.type))]
    ui.taped({ types, count: r.count, original: text, taped: r.text, target })
    void send({ t: 'caught', types, site: location.host }).catch(() => undefined)
  }

  const guarded = async (target: HTMLElement, text: string, hits: Hit[] | null): Promise<void> => {
    const safe: { text?: string } = {}
    try {
      await run(target, text, hits, safe)
    } catch {
      try {
        if (safe.text === undefined) ui.fallback('failed')
        else await deliver(target, safe.text)
      } catch {
        return
      }
    }
  }

  const onPaste = (e: ClipboardEvent): void => {
    if (own || !e.clipboardData) return
    const s = ctx.settings()
    if (s.paused.includes(location.host)) return
    const target = targetOf(e)
    if (!target) return
    ctx.mark?.('paste')
    const text = e.clipboardData.getData('text/plain')
    if (!text) return
    let hits: Hit[] | null = null
    if (text.length <= BIG_PASTE) {
      hits = detect(text, opts(s))
      if (!hits.length) return
    }
    e.preventDefault()
    e.stopImmediatePropagation()
    queue = queue.then(() => guarded(target, text, hits))
  }

  window.addEventListener('paste', onPaste, { capture: true })
}
