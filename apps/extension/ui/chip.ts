import type { GuardUI } from '../entrypoints/chat.content/guard'
import { t } from '../src/shared/i18n'
import { h } from './h'
import { announce, present, type Host } from './host'

type Taped = Parameters<GuardUI['taped']>[0]
export type Chip = Pick<GuardUI, 'taped'> & { exposed(): void; retape(): void; close(): void }

const icon = () =>
  h('svg', { class: 'ico', viewBox: '0 0 22 22', 'aria-hidden': 'true' }, h('rect', { width: 22, height: 22, rx: 6, fill: '#F2E15B' }), h('path', { d: 'M6 8h10M6 12h10M6 16h6', stroke: '#1B1433', 'stroke-width': 2, 'stroke-linecap': 'round' }))

const counted = (key: string, n: number, types: string[]) => t(`${key}${n === 1 ? 'One' : 'Many'}`, [String(n), types.join(', ')])

export function createChip({ layer }: Host): Chip {
  let cur: Taped | undefined
  let el: HTMLElement | undefined
  let title: HTMLElement
  let helper: HTMLElement
  let dismiss: (() => void) | undefined
  let ro: ResizeObserver | undefined
  let swapTimer: ReturnType<typeof setTimeout> | undefined

  const place = (): void => {
    if (!el || !cur) return
    const r = cur.target.isConnected ? cur.target.getBoundingClientRect() : null
    el.removeAttribute('data-anchor')
    for (const v of ['--pg-bottom', '--pg-start', '--pg-width']) el.style.removeProperty(v)
    if (!r || !r.width) return
    el.setAttribute('data-anchor', 'composer')
    el.style.setProperty('--pg-start', `${Math.max(8, r.left)}px`)
    el.style.setProperty('--pg-width', `${Math.min(r.width, innerWidth - 16)}px`)
    if (r.top >= el.offsetHeight + 16) el.style.setProperty('--pg-bottom', `${innerHeight - r.top + 8}px`)
    else {
      el.removeAttribute('data-anchor')
      for (const v of ['--pg-start', '--pg-width']) el.style.removeProperty(v)
    }
  }

  const fill = (): void => {
    if (!cur || !el) return
    const exposed = el.dataset['state'] === 'exposed'
    title.textContent = counted(exposed ? 'chipExposed' : 'chipTaped', cur.count, cur.types)
    helper.textContent = t(exposed ? 'chipHelperExposed' : 'chipHelperTaped')
  }

  const build = (): HTMLElement => {
    title = h('b')
    helper = h('small')
    const node = h(
      'div',
      { class: 'chip', 'data-state': 'taped' },
      icon(),
      h('div', { class: 'msg swap' }, title, helper),
      h('div', { class: 'keys' }, h('kbd', {}, 'Enter'), t('keySend'), '·', h('kbd', {}, 'Esc'), t('keyUndo')),
    )
    return node
  }

  const swap = (): void => {
    const msg = el?.querySelector<HTMLElement>('.msg')
    if (!msg) return fill()
    clearTimeout(swapTimer)
    msg.classList.add('out')
    swapTimer = setTimeout(() => {
      fill()
      msg.classList.remove('out')
    }, 200)
  }

  const chip: Chip = {
    taped(r) {
      cur = r
      const n = r.count
      announce(layer, n === 1 ? t('annTapedOne') : t('annTapedMany', [String(n)]))
      if (el?.isConnected) {
        el.dataset['state'] = 'taped'
        ro?.disconnect()
        ro?.observe(r.target)
        place()
        return swap()
      }
      el = build()
      fill()
      ro = new ResizeObserver(place)
      ro.observe(r.target)
      addEventListener('resize', place)
      addEventListener('scroll', place, true)
      dismiss = present(layer, el)
      place()
    },
    exposed() {
      if (!el) return
      el.dataset['state'] = 'exposed'
      fill()
    },
    retape() {
      if (!el) return
      el.dataset['state'] = 'taped'
      fill()
    },
    close() {
      clearTimeout(swapTimer)
      ro?.disconnect()
      removeEventListener('resize', place)
      removeEventListener('scroll', place, true)
      dismiss?.()
      el = dismiss = ro = cur = undefined
    },
  }
  return chip
}
