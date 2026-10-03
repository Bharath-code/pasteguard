import { rotateUrl } from '@pasteguard/core/rotate'
import { t } from '../src/shared/i18n'
import { h } from './h'
import { announce, present, type Host } from './host'

export interface LeakHit {
  rule: string
  type: string
}

const article = (type: string): string => (/^[aeiou]/i.test(type) ? 'an' : 'a')

export function createNotice({ layer }: Host): { leak(hits: LeakHit[]): void } {
  let dismiss: (() => void) | undefined
  return {
    leak(hits) {
      dismiss?.()
      const types = [...new Set(hits.map(x => x.type))]
      const text = hits.length === 1 ? t('leakOne', [article(types[0] ?? ''), types[0] ?? '']) : t('leakMany', [String(hits.length), types.join(', ')])
      const url = hits.map(x => rotateUrl(x.rule)).find(Boolean)
      const el = h(
        'div',
        { class: 'chip', 'data-state': 'leak' },
        h('div', { class: 'msg' }, h('b', {}, text)),
        h(
          'div',
          { class: 'actions' },
          url ? h('a', { class: 'btn', 'data-rotate': true, href: url, target: '_blank', rel: 'noopener noreferrer' }, t('rotateIt')) : null,
          h('button', { class: 'btn', type: 'button', 'data-dismiss': true, onClick: () => dismiss?.() }, t('dismissLabel')),
        ),
      )
      dismiss = present(layer, el)
      announce(layer, text)
    },
  }
}
