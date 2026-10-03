import { sha256Hex } from '@pasteguard/core/hash'
import { rotateUrl } from '@pasteguard/core/rotate'
import type { Adapter } from '../adapters'
import type { GuardUI } from '../entrypoints/chat.content/guard'
import { t } from '../src/shared/i18n'
import type { Msg } from '../src/shared/messages.ts'
import { h } from './h'
import { announce, present, type Host } from './host'

type Taped = Parameters<GuardUI['taped']>[0]
type State = 'taped' | 'exposed' | 'sent'
export type Chip = Pick<GuardUI, 'taped'> & { exposed(): boolean; retape(): boolean; close(): void }
export interface ChipCtx {
  adapter: Adapter
  send: (m: Msg) => Promise<unknown>
  own: <T>(fn: () => T) => T
}

export const timing = { blurDismissMs: 8000, holdMs: 1200 }

const icon = () =>
  h('svg', { class: 'ico', viewBox: '0 0 22 22', 'aria-hidden': 'true' }, h('rect', { width: 22, height: 22, rx: 6, fill: '#F2E15B' }), h('path', { d: 'M6 8h10M6 12h10M6 16h6', stroke: '#1B1433', 'stroke-width': 2, 'stroke-linecap': 'round' }))

const many = (n: number) => (n === 1 ? 'One' : 'Many')
const counted = (key: string, n: number, types: string[]) => t(`${key}${many(n)}`, [String(n), types.join(', ')])

export function createChip({ layer }: Host, { adapter, send, own }: ChipCtx): Chip {
  const hostEl = (layer.getRootNode() as ShadowRoot).host
  let cur: Taped | undefined
  let el: HTMLElement | undefined
  let state: State = 'taped'
  let title: HTMLElement
  let helper: HTMLElement
  let dismiss: (() => void) | undefined
  let ro: ResizeObserver | undefined
  let mo: MutationObserver | undefined
  let swapTimer: ReturnType<typeof setTimeout> | undefined
  let blurTimer: ReturnType<typeof setTimeout> | undefined
  let holdTimer: ReturnType<typeof setTimeout> | undefined
  let turns0 = 0
  let intent = false
  let unbind: (() => void) | undefined

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

  const rotate = (c: Taped): { url: string; type: string } | undefined => {
    for (const x of c.hits) {
      const url = rotateUrl(x.rule)
      if (url) return { url, type: x.type }
    }
    return undefined
  }

  const sentText = (c: Taped): string => {
    const r = rotate(c)
    return t(`sent${many(c.count)}${r ? '' : 'Plain'}`, [String(c.count), r?.type ?? ''])
  }

  const fill = (): void => {
    if (!cur) return
    if (state === 'sent') {
      title.textContent = sentText(cur)
      return
    }
    title.textContent = counted(state === 'exposed' ? 'chipExposed' : 'chipTaped', cur.count, cur.types)
    helper.textContent = t(state === 'exposed' ? 'chipHelperExposed' : 'chipHelperTaped')
  }

  const swapIn = (to: 'original' | 'taped'): boolean => {
    const c = cur
    if (!c) return false
    const text = adapter.read(c.target)
    const [from, into] = to === 'original' ? [c.taped, c.original] : [c.original, c.taped]
    const i = text.indexOf(from)
    return i >= 0 && own(() => adapter.replace(c.target, text.slice(0, i) + into + text.slice(i + from.length)))
  }

  const cancelHold = (btn?: HTMLElement): void => {
    clearTimeout(holdTimer)
    btn?.classList.remove('holding')
  }

  const finishSent = (c: Taped): void => {
    state = 'sent'
    render()
    void send({ t: 'sentOriginal', types: c.types }).catch(() => undefined)
    announce(layer, sentText(c), 'assertive')
  }

  const sendOriginal = (): void => {
    const c = cur
    if (!c) return
    if (state !== 'exposed' && !swapIn('original')) return chip.close()
    if (!adapter.send()) {
      state = 'exposed'
      return render()
    }
    finishSent(c)
  }

  const allowAlways = (): void => {
    const c = cur
    if (!c) return
    if (state === 'taped') swapIn('original')
    const seen = new Set<string>()
    for (const x of c.hits) {
      if (seen.has(x.value)) continue
      seen.add(x.value)
      void sha256Hex(x.value).then(hash => send({ t: 'allow.add', hash, type: x.type })).catch(() => undefined)
    }
    chip.close()
  }

  const holdButton = (): HTMLElement => {
    const btn = h('button', { class: 'btn hold', type: 'button', 'data-hold': true }, h('span', { class: 'fill', 'aria-hidden': 'true' }), h('span', { class: 'lbl' }, t('holdLabel')))
    const start = (): void => {
      if (btn.classList.contains('holding')) return
      btn.classList.add('holding')
      holdTimer = setTimeout(() => {
        cancelHold(btn)
        sendOriginal()
      }, timing.holdMs)
    }
    btn.addEventListener('pointerdown', e => (e.button === 0 ? start() : undefined))
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) btn.addEventListener(ev, () => cancelHold(btn))
    btn.addEventListener('keydown', e => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      e.preventDefault()
      if (e.key === ' ' && !e.repeat) start()
    })
    btn.addEventListener('keyup', e => (e.key === ' ' ? cancelHold(btn) : undefined))
    btn.addEventListener('click', e => e.preventDefault())
    return btn
  }

  const render = (): void => {
    if (!el || !cur) return
    el.dataset['state'] = state
    title = h('b')
    helper = h('small')
    const closeBtn = h('button', { class: 'btn', type: 'button', 'data-dismiss': true, onClick: () => (chip.close(), cur?.target.focus()) }, t('dismissLabel'))
    const link = state === 'sent' ? rotate(cur) : undefined
    const kids = [
      icon(),
      h('div', { class: 'msg swap' }, title, state === 'sent' ? null : helper),
      state === 'sent' ? null : h('div', { class: 'keys' }, h('kbd', {}, 'Enter'), t('keySend'), '·', h('kbd', {}, 'Esc'), t('keyUndo')),
      h(
        'div',
        { class: 'actions' },
        state === 'sent' ? null : [holdButton(), h('button', { class: 'btn', type: 'button', 'data-allow': true, onClick: allowAlways }, t('allowLabel'))],
        link ? h('a', { class: 'btn', 'data-rotate': true, href: link.url, target: '_blank', rel: 'noopener noreferrer' }, t('rotateLabel')) : null,
        closeBtn,
      ),
    ]
    el.replaceChildren(...kids.filter((k): k is HTMLElement => !!k))
    fill()
    place()
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

  const arm = (): void => {
    clearTimeout(blurTimer)
    blurTimer = setTimeout(() => chip.close(), timing.blurDismissMs)
  }
  const disarm = (): void => clearTimeout(blurTimer)

  const focusChip = (): void => el?.querySelector<HTMLElement>('button, a')?.focus()

  const onKey = (e: KeyboardEvent): void => {
    const c = cur
    if (!c || !el) return
    if (e.altKey && e.shiftKey && e.code === 'KeyP') {
      e.preventDefault()
      e.stopImmediatePropagation()
      return focusChip()
    }
    const path = e.composedPath()
    if (e.key === 'Enter' && !e.shiftKey && path.includes(c.target)) {
      intent = true
      setTimeout(() => (intent = false), 1000)
    }
    if (e.key !== 'Escape' || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
    if (path.includes(hostEl)) {
      e.preventDefault()
      e.stopImmediatePropagation()
      return c.target.focus()
    }
    if (!path.includes(c.target)) return
    const done = state === 'taped' ? chip.exposed() : state === 'exposed' ? chip.retape() : false
    if (done) {
      e.preventDefault()
      e.stopImmediatePropagation()
    } else chip.close()
  }

  const checkSent = (): void => {
    const c = cur
    if (!c || state === 'sent' || adapter.read(c.target).trim() !== '') return
    const sent = intent || adapter.userTurns().length > turns0
    intent = false
    if (state === 'exposed' && sent) finishSent(c)
    else if (state === 'taped') chip.close()
  }

  const bind = (target: HTMLElement): (() => void) => {
    const onBlur = (e: FocusEvent): void => (e.relatedTarget === hostEl ? undefined : arm())
    const onChipOut = (e: FocusEvent): void => (e.relatedTarget === cur?.target ? undefined : arm())
    target.addEventListener('blur', onBlur)
    target.addEventListener('focus', disarm)
    target.addEventListener('input', checkSent)
    el?.addEventListener('focusin', disarm)
    el?.addEventListener('focusout', onChipOut)
    addEventListener('keydown', onKey, true)
    mo = new MutationObserver(checkSent)
    mo.observe(target, { childList: true, characterData: true, subtree: true })
    if (!target.matches(':focus-within')) arm()
    return () => {
      target.removeEventListener('blur', onBlur)
      target.removeEventListener('focus', disarm)
      target.removeEventListener('input', checkSent)
      removeEventListener('keydown', onKey, true)
      mo?.disconnect()
    }
  }

  const chip: Chip = {
    taped(r) {
      const prev = cur
      cur = r
      turns0 = adapter.userTurns().length
      announce(layer, r.count === 1 ? t('annTapedOne') : t('annTapedMany', [String(r.count)]))
      if (el?.isConnected && prev && prev.target === r.target && state !== 'sent') {
        state = 'taped'
        el.dataset['state'] = 'taped'
        place()
        return swap()
      }
      if (el?.isConnected) chip.close()
      cur = r
      state = 'taped'
      el = h('div', { class: 'chip' })
      render()
      ro = new ResizeObserver(place)
      ro.observe(r.target)
      addEventListener('resize', place)
      addEventListener('scroll', place, true)
      dismiss = present(layer, el)
      place()
      unbind = bind(r.target)
    },
    exposed() {
      if (state !== 'taped' || !swapIn('original')) return false
      state = 'exposed'
      render()
      return true
    },
    retape() {
      if (state !== 'exposed' || !swapIn('taped')) return false
      state = 'taped'
      render()
      return true
    },
    close() {
      for (const tm of [swapTimer, blurTimer, holdTimer]) clearTimeout(tm)
      ro?.disconnect()
      unbind?.()
      removeEventListener('resize', place)
      removeEventListener('scroll', place, true)
      dismiss?.()
      el = dismiss = ro = cur = unbind = undefined
    },
  }
  return chip
}
