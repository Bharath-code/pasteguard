import { findPlaceholders } from '@pasteguard/core/match'
import type { Adapter } from '../../adapters'
import { t } from '../../src/shared/i18n'
import { h } from '../../ui/h'
import type { TabVault } from './vault'

export const restoredHosts = new WeakMap<Element, string>()
export const passMs: number[] = []
const devRoots = new WeakMap<Element, ShadowRoot>()
const dev = import.meta.env.MODE === 'development'

const CSS = `
:host { display: inline-block; vertical-align: baseline; }
.w { position: relative; display: inline-grid; vertical-align: baseline; outline: none; cursor: default; }
.w > * { grid-area: 1 / 1; }
.val { font-family: ui-monospace, Menlo, monospace; font-size: .9em; color: inherit; opacity: 0; filter: blur(3px); transition: opacity 320ms ease, filter 320ms ease; background: linear-gradient(transparent 62%, color-mix(in oklab, #F2E15B 45%, transparent) 62%); }
.cover { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 5px; border-radius: 4px; background: repeating-linear-gradient(-45deg, #F2E15B 0 6px, #120D24 6px 12px); color: #120D24; font: 600 .78em/1.6 ui-monospace, Menlo, monospace; clip-path: inset(0 0 0 0); transition: clip-path 320ms cubic-bezier(.77, 0, .175, 1); }
.cover b { background: #F2E15B; padding: 0 3px; border-radius: 3px; }
.done .val { opacity: 1; filter: none; }
.done .cover { clip-path: inset(0 0 0 100%); }
.cleared { border: 1px dashed currentColor; border-radius: 4px; padding: 0 6px; font: 500 .85em/1.6 system-ui, sans-serif; opacity: .75; white-space: nowrap; }
.tip { position: absolute; bottom: calc(100% + 8px); left: 0; width: max-content; max-width: 240px; padding: 8px 10px; border-radius: 8px; background: #F4F2FB; color: #1B1433; font: 400 12px/1.4 system-ui, sans-serif; white-space: normal; box-shadow: 0 10px 30px -10px rgb(0 0 0 / .6); transform-origin: bottom left; opacity: 0; transform: scale(.97) translateY(2px); pointer-events: none; transition: opacity 125ms cubic-bezier(.23, 1, .32, 1), transform 125ms cubic-bezier(.23, 1, .32, 1); z-index: 2; }
.w:focus-visible { outline: 2px solid #9C8CFF; outline-offset: 2px; border-radius: 4px; }
.w:focus-visible .tip { opacity: 1; transform: none; }
@media (hover: hover) and (pointer: fine) { .w:hover .tip { opacity: 1; transform: none; transition-delay: 300ms; } }
@media (prefers-reduced-motion: reduce) {
  .cover { clip-path: none !important; transition: opacity 150ms ease; }
  .done .cover { opacity: 0; }
  .val { filter: none; transition: opacity 150ms ease; }
}
@media (forced-colors: active) { .cover, .cleared { border: 1px solid CanvasText; } }
`

let sheet: CSSStyleSheet | undefined
const styles = (): CSSStyleSheet => {
  if (!sheet) {
    sheet = new CSSStyleSheet()
    sheet.replaceSync(CSS)
  }
  return sheet
}

const PROBE = /pg[\s_-]?secret/i

const textNodes = (root: Element): Text[] => {
  const out: Text[] = []
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.nodeType === 1 ? (n.nodeName === 'PG-V' ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT),
  })
  for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n as Text)
  return out
}

export function installRestorer({ adapter, vault }: { adapter: Adapter; vault: Pick<TabVault, 'byId' | 'hydrate'> }): { stop(): void } {
  const targets = new Set<Node>()
  const known = new WeakSet<Element>()
  const peeled = new WeakMap<Element, Set<string>>()
  let timer: ReturnType<typeof setTimeout> | undefined

  const schedule = (ms = 50): void => {
    timer ??= setTimeout(pass, ms)
  }

  const makeHost = (id: string, answer: Element): HTMLElement => {
    const entry = vault.byId.get(id)
    const host = document.createElement('pg-v')
    host.textContent = id
    const root = host.attachShadow({ mode: 'closed' })
    root.adoptedStyleSheets = [styles()]
    const wrap = h('span', { class: 'w', tabindex: '0' })
    if (entry) {
      const seen = peeled.get(answer) ?? new Set<string>()
      peeled.set(answer, seen)
      const first = !seen.has(id)
      seen.add(id)
      if (!first) wrap.classList.add('done')
      wrap.append(h('span', { class: 'val' }, entry.value), h('span', { class: 'cover' }, h('b', {}, id)), h('span', { class: 'tip' }, t('restoreTip', [id])))
      if (first) setTimeout(() => wrap.classList.add('done'), 30)
    } else wrap.append(h('span', { class: 'cleared' }, t('restoreCleared')))
    root.append(wrap)
    if (entry) restoredHosts.set(host, id)
    if (dev) devRoots.set(host, root)
    return host
  }

  const restoreIn = (answer: Element): boolean => {
    if (!PROBE.test(answer.textContent ?? '')) return true
    const final = !adapter.isStreaming(answer as HTMLElement)
    const nodes = textNodes(answer)
    const hits = findPlaceholders(nodes.map(n => n.data), { final })
    for (const f of hits.reverse()) {
      const a = nodes[f.from.seg]
      const b = nodes[f.to.seg]
      if (!a?.isConnected || !b?.isConnected) continue
      const r = document.createRange()
      r.setStart(a, f.from.off)
      r.setEnd(b, f.to.off)
      r.deleteContents()
      r.insertNode(makeHost(f.id, answer))
    }
    return final
  }

  function pass(): void {
    timer = undefined
    const t0 = performance.now()
    const seen = [...targets]
    targets.clear()
    let again = false
    for (const a of adapter.answers()) {
      if (known.has(a) && !seen.some(n => a.contains(n))) continue
      known.add(a)
      if (!restoreIn(a)) {
        again = true
        targets.add(a)
      }
    }
    if (dev) passMs.push(performance.now() - t0)
    if (again) schedule(300)
  }

  const mo = new MutationObserver(ms => {
    for (const m of ms) targets.add(m.target)
    schedule()
  })
  mo.observe(document, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-busy', 'data-is-streaming', 'data-streaming'] })
  void vault.hydrate().then(() => schedule(0))
  schedule(0)
  return {
    stop() {
      mo.disconnect()
      clearTimeout(timer)
    },
  }
}

export const readRestored = (): { text: string; cls: string }[] =>
  [...document.querySelectorAll('pg-v')].map(el => {
    const root = devRoots.get(el)
    return { text: root?.textContent ?? '', cls: root?.querySelector('.w')?.className ?? '' }
  })

export const valueOf = (el: Element): string | undefined => devRoots.get(el)?.querySelector('.val')?.textContent ?? undefined
