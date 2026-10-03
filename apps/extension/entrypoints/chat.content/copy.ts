import type { Adapter } from '../../adapters'
import { restoredHosts } from './restore'
import type { TabVault } from './vault'

type Vault = Pick<TabVault, 'byId'>
const BLOCK = new Set(['P', 'DIV', 'LI', 'PRE', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TR'])
const swap = (text: string, v: Vault): string => text.replace(/PG_SECRET_\d+/g, id => v.byId.get(id)?.value ?? id)

// Hosts hold only the placeholder id in light DOM; the clone's host text is swapped for its vault value.
const flatten = (node: Node, v: Vault, out: string[]): boolean => {
  if (node.nodeType === 3) return out.push(node.nodeValue ?? ''), false
  if (node.nodeName === 'PG-V') {
    const id = node.textContent ?? ''
    return out.push(swap(id, v)), v.byId.has(id)
  }
  let hit = false
  for (const c of node.childNodes) hit = flatten(c, v, out) || hit
  if (BLOCK.has(node.nodeName)) out.push('\n')
  return hit
}

const hostOf = (n: Node): Element | null => (n.nodeType === 1 ? (n as Element) : n.parentElement)?.closest('pg-v') ?? null
const onlySpaceAfter = (n: Node): boolean => {
  for (let s = n.nextSibling; s; s = s.nextSibling) if (/\S/.test(s.textContent ?? '')) return false
  return true
}

// A selection that touches a host takes the whole host; one that ends right before a trailing host does too.
function widen(r: Range): Range {
  const a = hostOf(r.startContainer)
  if (a) r.setStartBefore(a)
  const b = hostOf(r.endContainer)
  if (b) return r.setEndAfter(b), r
  const c = r.endContainer
  const next = c.nodeType === 3 && r.endOffset === (c as Text).length ? c.nextSibling : null
  if (next?.nodeName === 'PG-V' && onlySpaceAfter(next)) r.setEndAfter(next)
  return r
}

const MAX_IDS = 10

// A site Copy may only resolve placeholders the restorer is showing right now, so a forged event can't dump the vault.
const onScreen = (): Set<string> => {
  const ids = new Set<string>()
  for (const h of document.querySelectorAll('pg-v')) {
    const id = restoredHosts.get(h)
    if (id) ids.add(id)
  }
  return ids
}

const swapShown = (text: string, v: Vault): string => {
  const shown = onScreen()
  const seen = new Set<string>()
  return text.replace(/PG_SECRET_\d+/g, id => {
    if (!shown.has(id) || (!seen.has(id) && seen.size >= MAX_IDS)) return id
    seen.add(id)
    return swap(id, v)
  })
}

export function installCopy({ vault, adapter }: { vault: Vault; adapter: Pick<Adapter, 'composer'> }): void {
  document.addEventListener('pg-copy', e => {
    const d = (e as CustomEvent).detail as unknown
    if (typeof d !== 'string' || d.length >= 1_000_000 || !/PG_SECRET_\d+/.test(d) || !navigator.userActivation.isActive) return
    void navigator.clipboard.writeText(swapShown(d, vault)).catch(() => {})
  })
  window.addEventListener(
    'copy',
    e => {
      const field = document.activeElement
      if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
        // The user's own composer keeps its placeholders; only scratch fields (execCommand copy) are restored.
        const c = adapter.composer()
        if (!e.clipboardData || (c && (c === field || c.contains(field)))) return
        const text = field.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0)
        if (!/PG_SECRET_\d+/.test(text) || ![...text.matchAll(/PG_SECRET_\d+/g)].some(m => vault.byId.has(m[0]))) return
        e.preventDefault()
        e.stopImmediatePropagation()
        return e.clipboardData.setData('text/plain', swap(text, vault))
      }
      const sel = getSelection()
      if (!sel || sel.isCollapsed || !e.clipboardData) return
      const out: string[] = []
      let hit = false
      for (let i = 0; i < sel.rangeCount; i++) hit = flatten(widen(sel.getRangeAt(i).cloneRange()).cloneContents(), vault, out) || hit
      if (!hit) return
      e.preventDefault()
      e.stopImmediatePropagation()
      e.clipboardData.setData('text/plain', out.join('').replace(/\n$/, ''))
    },
    true,
  )
}
