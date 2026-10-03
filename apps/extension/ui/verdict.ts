import type { Verdict } from '@pasteguard/core/verdict'
import { t } from '../src/shared/i18n'
import { h } from './h'

export type Eco = 'npm' | 'pypi'
export type PkgVerdict = Verdict

export interface PkgChip {
  host: HTMLElement
  result: Promise<PkgVerdict>
}

const devRoots = new Map<Element, ShadowRoot>()
const dev = import.meta.env.MODE === 'development'

const CSS = `
:host { display: inline-block; vertical-align: top; }
.w { position: relative; display: inline-flex; align-items: center; gap: 8px; max-width: 100%; padding: 1px 9px; border-radius: 99px; background: #F4F2FB; color: #5B5474; box-shadow: inset 0 0 0 1px #DAD5EA; font: 600 12px/1.7 system-ui, -apple-system, 'Segoe UI', sans-serif; outline: none; }
.w:focus-visible { outline: 2px solid #9C8CFF; outline-offset: 2px; }
.sh { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; pointer-events: none; display: none; }
.sh::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgb(27 20 51 / .12), transparent); transform: translateX(-100%); animation: shimmer 900ms linear infinite; }
.w[data-state=checking] .sh { display: block; }
.n { min-width: 0; max-width: 22ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 500 11.5px/1.7 ui-monospace, Menlo, monospace; color: #1B1433; }
.v { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.v svg { width: 12px; height: 12px; flex: none; }
.v.swap { animation: swap 200ms cubic-bezier(.23, 1, .32, 1); }
.w[data-state=missing], .w[data-state=missing-scoped] { background: #FF5E7E; color: #2A0612; box-shadow: none; }
.w[data-state=missing] .n, .w[data-state=missing-scoped] .n { color: #2A0612; }
.w[data-state=new], .w[data-state=low], .w[data-state=lookalike] { background: color-mix(in oklab, #F2E15B 30%, #F4F2FB); color: #1B1433; box-shadow: inset 0 0 0 1.5px #F2E15B; }
.retry { all: unset; box-sizing: border-box; padding: 0 8px; border-radius: 99px; border: 1px solid #DAD5EA; color: #1B1433; font: 500 11.5px/1.6 system-ui, sans-serif; cursor: pointer; }
.retry:focus-visible { outline: 2px solid #9C8CFF; outline-offset: 1px; }
.tip { position: absolute; bottom: 100%; left: 0; padding-bottom: 8px; width: max-content; max-width: 260px; opacity: 0; transform: scale(.97) translateY(2px); transform-origin: bottom left; pointer-events: none; transition: opacity 125ms cubic-bezier(.23, 1, .32, 1), transform 125ms cubic-bezier(.23, 1, .32, 1); z-index: 2; }
.card { padding: 8px 10px; border-radius: 8px; background: #F4F2FB; color: #1B1433; font: 400 12px/1.4 system-ui, sans-serif; white-space: normal; box-shadow: 0 10px 30px -10px rgb(0 0 0 / .6), 0 0 0 1px #DAD5EA; }
.card a { display: inline-block; margin-top: 4px; color: #4B3FB0; font-weight: 500; }
.w:focus-within .tip { opacity: 1; transform: none; pointer-events: auto; }
@media (hover: hover) and (pointer: fine) { .w:hover .tip { opacity: 1; transform: none; pointer-events: auto; transition-delay: 300ms; } }
@keyframes shimmer { to { transform: translateX(100%); } }
@keyframes swap { from { opacity: 0; filter: blur(4px); } to { opacity: 1; filter: none; } }
@media (prefers-reduced-motion: reduce) {
  .sh::after { animation: none; transform: none; opacity: .5; }
  .v.swap { animation-name: swapfade; }
  .tip { transition: opacity 125ms ease; transform: none; }
  @keyframes swapfade { from { opacity: 0; } to { opacity: 1; } }
}
@media (forced-colors: active) { .w { border: 1px solid CanvasText; } }
`

let sheet: CSSStyleSheet | undefined
const styles = (): CSSStyleSheet => {
  if (!sheet) {
    sheet = new CSSStyleSheet()
    sheet.replaceSync(CSS)
  }
  return sheet
}

const ECO: Record<Eco, string> = { npm: 'npm', pypi: 'PyPI' }
const when = (days: number): string => new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(-days, 'day')
const count = (n: number): string => new Intl.NumberFormat().format(n)

const labelOf = (eco: Eco, v: PkgVerdict): string => {
  switch (v.kind) {
    case 'missing':
      return t('pkgNotFound', [ECO[eco]])
    case 'missing-scoped':
      return t('pkgNotFoundScoped')
    case 'new':
      return t('pkgNew', [when(v.days ?? 0)])
    case 'low':
      return v.downloads === 1 ? t('pkgLowOne') : t('pkgLow', [count(v.downloads ?? 0)])
    case 'lookalike':
      return t('pkgLookalike', [v.like ?? ''])
    case 'ok':
      return t('pkgOk', [ECO[eco]])
    case 'error':
      return t('pkgError')
  }
}

const reasonOf = (v: PkgVerdict): string => {
  switch (v.kind) {
    case 'missing':
      return t('pkgWhyMissing')
    case 'missing-scoped':
      return t('pkgWhyScoped')
    case 'new':
      return t('pkgWhyNew', [when(v.days ?? 0)])
    case 'low':
      return v.downloads === 1 ? t('pkgWhyLowOne') : t('pkgWhyLow', [count(v.downloads ?? 0)])
    case 'lookalike':
      return t('pkgWhyLookalike', [v.like ?? ''])
    case 'ok':
      return t('pkgWhyOk')
    case 'error':
      return t('pkgWhyError')
  }
}

const pageOf = (eco: Eco, name: string): string =>
  eco === 'npm' ? `https://www.npmjs.com/package/${name}` : `https://pypi.org/project/${encodeURIComponent(name)}/`

const exists = (v: PkgVerdict): boolean => v.kind !== 'missing' && v.kind !== 'missing-scoped' && v.kind !== 'error'

const cross = (): HTMLElement =>
  h('svg', { viewBox: '0 0 12 12', 'aria-hidden': 'true' }, h('path', { d: 'M3 3l6 6M9 3l-6 6', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', fill: 'none' }))

export function createPkgChip(eco: Eco, name: string, check: () => Promise<PkgVerdict>, known?: PkgVerdict): PkgChip {
  const host = document.createElement('pg-pkg')
  const pin = (p: string, v: string): void => host.style.setProperty(p, v, 'important')
  pin('all', 'initial')
  pin('display', 'inline-block')
  pin('margin', '6px 6px 0 0')
  const root = host.attachShadow({ mode: 'closed' })
  root.adoptedStyleSheets = [styles()]
  const tipId = `t${Math.random().toString(36).slice(2, 8)}`
  const wrap = h('span', { class: 'w', tabindex: '0', role: 'group', 'aria-describedby': tipId })
  root.append(wrap)

  const render = (v: PkgVerdict | undefined, animate: boolean, retry?: () => void): void => {
    const state = v?.kind ?? 'checking'
    const text = v ? labelOf(eco, v) : ''
    const vEl = h('span', { class: 'v' }, v && (v.kind === 'missing' || v.kind === 'missing-scoped') ? cross() : null, v ? text : '')
    const tip = h('span', { class: 'tip', id: tipId, role: 'tooltip' })
    if (v) {
      const card = h('span', { class: 'card' }, t('pkgTip', [reasonOf(v)]))
      if (exists(v)) card.append(document.createElement('br'), h('a', { href: pageOf(eco, name), target: '_blank', rel: 'noopener noreferrer' }, t('pkgLink', [ECO[eco]])))
      tip.append(card)
    }
    wrap.replaceChildren(h('span', { class: 'sh' }), h('span', { class: 'n' }, name), vEl)
    if (v?.kind === 'error' && retry) wrap.append(h('button', { class: 'retry', type: 'button', onClick: retry }, t('pkgRetry')))
    wrap.append(tip)
    wrap.dataset['state'] = state
    wrap.setAttribute('aria-label', `${name}: ${text || '…'}`)
    wrap.setAttribute('aria-busy', String(!v))
    if (animate) vEl.classList.add('swap')
  }

  const settle = (v: PkgVerdict): PkgVerdict => {
    render(v, true, retry)
    return v
  }
  const run = (): Promise<PkgVerdict> => check().catch((): PkgVerdict => ({ kind: 'error' })).then(settle)
  const retry = (): void => {
    render(undefined, true)
    void run()
  }

  let result: Promise<PkgVerdict>
  if (known) {
    render(known, false, retry)
    result = Promise.resolve(known)
  } else {
    render(undefined, false)
    result = run()
  }
  if (dev) devRoots.set(host, root)
  return { host, result }
}

export const readChips = (): { v: string; tip: string; href: string | null }[] =>
  [...document.querySelectorAll('pg-pkg')].map(el => {
    const root = devRoots.get(el)
    return {
      v: root?.querySelector('.v')?.textContent ?? '',
      tip: root?.querySelector('.card')?.textContent ?? '',
      href: root?.querySelector('.card a')?.getAttribute('href') ?? null,
    }
  })

export const retryChip = (i: number): void => {
  const el = document.querySelectorAll('pg-pkg')[i]
  devRoots.get(el as Element)?.querySelector<HTMLButtonElement>('.retry')?.click()
}
