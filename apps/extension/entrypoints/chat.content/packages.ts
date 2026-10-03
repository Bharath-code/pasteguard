import { parseInstalls } from '@pasteguard/core/install'
import type { Adapter } from '../../adapters'
import type { Msg } from '../../src/shared/messages.ts'
import { t } from '../../src/shared/i18n'
import { createPkgChip, type Eco, type PkgVerdict } from '../../ui/verdict'
import type { GuardSettings } from './guard'

export interface PackagesCtx {
  adapter: Adapter
  send: (m: Msg) => Promise<unknown>
  settings: () => GuardSettings
  announce: (text: string) => void
}

const MAX_CODE_CHARS = 50_000
const MAX_PER_BLOCK = 20
const KINDS = new Set(['missing', 'missing-scoped', 'new', 'low', 'lookalike', 'ok', 'error'])

const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined)

const toVerdict = (raw: unknown): PkgVerdict => {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {}
  const kind = typeof o['kind'] === 'string' && KINDS.has(o['kind']) ? (o['kind'] as PkgVerdict['kind']) : 'error'
  const days = num(o['days'])
  const downloads = num(o['downloads'])
  const like = typeof o['like'] === 'string' ? o['like'].slice(0, 214) : undefined
  return { kind, ...(days === undefined ? {} : { days }), ...(downloads === undefined ? {} : { downloads }), ...(like === undefined ? {} : { like }) }
}

const isMissing = (v: PkgVerdict): boolean => v.kind === 'missing' || v.kind === 'missing-scoped'

export function installPackages({ adapter, send, settings, announce }: PackagesCtx): (answer: HTMLElement) => boolean {
  const known = new Map<string, PkgVerdict>()
  const blocks = new WeakMap<Element, HTMLElement[]>()
  const announced = new WeakSet<Element>()

  const lookup = (eco: Eco, name: string) => async (): Promise<PkgVerdict> => {
    const key = `${eco}:${name}`
    const hit = known.get(key)
    if (hit) return hit
    const v = toVerdict(await send({ t: 'pkg', eco, name }).catch(() => undefined))
    if (v.kind !== 'error') known.set(key, v)
    return v
  }

  const tell = (vs: PkgVerdict[]): void => {
    const checked = vs.filter(v => v.kind !== 'error')
    if (!checked.length) return
    const k = String(checked.filter(isMissing).length)
    announce(checked.length === 1 ? t('pkgAnnounceOne', [k]) : t('pkgAnnounceMany', [String(checked.length), k]))
  }

  return answer => {
    if (adapter.isStreaming(answer)) return false
    if (settings().paused.includes(location.host)) return true
    const pending: Promise<PkgVerdict>[] = []
    for (const code of answer.querySelectorAll('pre code')) {
      const pre = code.closest('pre')
      if (!pre) continue
      const mine = blocks.get(pre)
      if (mine) {
        if (mine.some(c => !c.isConnected)) pre.after(...mine)
        continue
      }
      const text = code.textContent ?? ''
      const seen = new Set<string>()
      const chips = text.length > MAX_CODE_CHARS ? [] : parseInstalls(text).filter(p => !seen.has(`${p.eco}:${p.name}`) && seen.add(`${p.eco}:${p.name}`)).slice(0, MAX_PER_BLOCK).map(p => createPkgChip(p.eco, p.name, lookup(p.eco, p.name), known.get(`${p.eco}:${p.name}`)))
      blocks.set(pre, chips.map(c => c.host))
      if (!chips.length) continue
      pre.after(...chips.map(c => c.host))
      pending.push(...chips.map(c => c.result))
    }
    if (pending.length && !announced.has(answer)) {
      announced.add(answer)
      void Promise.all(pending).then(tell)
    }
    return true
  }
}
