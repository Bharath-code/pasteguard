import type { GuardUI } from '../entrypoints/chat.content/guard'
import { t } from '../src/shared/i18n'
import { h } from './h'
import { announce, present, type Host } from './host'

const COPY = { 'inserted-to-clipboard': 'toastClipboard', failed: 'toastFailed' } as const
const SHOW_MS = 6000

export function createToast({ layer }: Host): Pick<GuardUI, 'fallback'> {
  let dismiss: (() => void) | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    fallback(kind) {
      clearTimeout(timer)
      dismiss?.()
      const text = t(COPY[kind])
      dismiss = present(layer, h('div', { class: 'chip toast', 'data-state': kind }, h('div', { class: 'msg' }, text)))
      announce(layer, text)
      timer = setTimeout(() => dismiss?.(), SHOW_MS)
    },
  }
}
