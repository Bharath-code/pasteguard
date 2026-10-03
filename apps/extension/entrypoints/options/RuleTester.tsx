import { useEffect, useRef } from 'preact/hooks'
import { t } from '../../src/shared/i18n'
import { validateRule, type RuleResult } from '../../src/shared/rules'

export type Tested = { result: RuleResult; count: number; ms: number }

export function runTest(source: string, sample: string): Tested {
  const result = validateRule(source)
  if (!result.ok) return { result, count: 0, ms: 0 }
  const t0 = performance.now()
  const count = [...sample.matchAll(result.re)].length
  return { result, count, ms: performance.now() - t0 }
}

function highlight(out: HTMLElement, sample: string, re: RegExp | null): void {
  const nodes: Node[] = []
  let at = 0
  if (re) {
    for (const m of sample.matchAll(re)) {
      const i = m.index ?? 0
      if (i > at) nodes.push(document.createTextNode(sample.slice(at, i)))
      const mark = document.createElement('mark')
      mark.textContent = m[0]
      nodes.push(mark)
      at = i + m[0].length
    }
  }
  nodes.push(document.createTextNode(sample.slice(at)))
  out.replaceChildren(...nodes)
}

export const meta = (r: Tested): string => {
  if (!r.result.ok) return r.result.message
  const ms = r.ms.toFixed(1)
  return r.count === 0 ? t('optionsNoMatch', [ms]) : r.count === 1 ? t('optionsMatchOne', [ms]) : t('optionsMatchCount', [String(r.count), ms])
}

type Props = { pattern: string; sample: string; onPattern(v: string): void; onSample(v: string): void; tested: Tested }

export function RuleTester({ pattern, sample, onPattern, onSample, tested }: Props) {
  const out = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (out.current) highlight(out.current, sample, tested.result.ok ? tested.result.re : null)
  }, [sample, tested])
  const invalid = pattern !== '' && !tested.result.ok
  return (
    <>
      <label for="rx">{t('optionsPattern')}</label>
      <input id="rx" value={pattern} spellcheck={false} autocomplete="off" aria-invalid={invalid} aria-describedby="rx-meta" onInput={e => onPattern(e.currentTarget.value)} />
      <label for="rx-sample">{t('optionsSample')}</label>
      <textarea id="rx-sample" value={sample} spellcheck={false} onInput={e => onSample(e.currentTarget.value)} />
      <div class="rule-out" ref={out} role="group" aria-label={t('optionsMatches')} />
      <p class={invalid ? 'rule-meta err' : 'rule-meta'} id="rx-meta" role="status">{pattern === '' ? '' : meta(tested)}</p>
    </>
  )
}
