import { exposeShadowRoot } from '../entrypoints/chat.content/testHook'
import { h } from './h'
import inpage from './inpage.css?inline'
import tokens from './tokens.css?inline'

export interface Host {
  root: ShadowRoot
  layer: HTMLElement
}

let mounted: Host | undefined

const pin = (host: HTMLElement): void => host.style.setProperty('all', 'initial', 'important')

const show = (layer: HTMLElement): void => {
  if (layer.isConnected && !layer.matches(':popover-open')) layer.showPopover()
}

export function mountHost(): Host {
  if (mounted) {
    const el = mounted.root.host
    if (!el.isConnected) document.documentElement.append(el)
    show(mounted.layer)
    return mounted
  }
  const el = h('pg-host')
  pin(el)
  const root = el.attachShadow({ mode: 'closed' })
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(`${tokens}\n${inpage}`)
  root.adoptedStyleSheets = [sheet]
  const layer = h('div', { class: 'layer', popover: 'manual' })
  layer.addEventListener('toggle', e => {
    if ((e as ToggleEvent).newState === 'closed') show(layer)
  })
  root.append(layer)
  document.documentElement.append(el)
  show(layer)
  if (import.meta.env.MODE === 'development') exposeShadowRoot(root)
  mounted = { root, layer }
  return mounted
}

export function present(layer: HTMLElement, el: HTMLElement): () => void {
  layer.append(el)
  void el.offsetWidth
  el.setAttribute('data-open', '')
  let gone = false
  const finish = (): void => {
    if (gone) return
    gone = true
    el.remove()
  }
  return () => {
    el.removeAttribute('data-open')
    el.addEventListener('transitionend', finish, { once: true })
    setTimeout(finish, 200)
  }
}

const regions = new WeakMap<HTMLElement, Record<'polite' | 'assertive', HTMLElement>>()

export function announce(layer: HTMLElement, text: string, mode: 'polite' | 'assertive' = 'polite'): void {
  let r = regions.get(layer)
  if (!r) {
    r = { polite: h('div', { class: 'sr', role: 'status' }), assertive: h('div', { class: 'sr', role: 'alert' }) }
    layer.append(r.polite, r.assertive)
    regions.set(layer, r)
  }
  const el = r[mode]
  el.textContent = ''
  setTimeout(() => (el.textContent = text), 50)
}
