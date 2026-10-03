export const SLOW_MS = 10
export const SYNTAX_PREFIX = 'That pattern has a syntax error: '

// The tail is a backtracking trigger: without it, (a+)+$ looks fast on benign text. 24 not 30: same verdict, ~64x less main-thread stall on a hostile pattern.
const SAMPLE = 'The quick brown fox jumps over 13 lazy dogs; token=abc123 id: 42\n'.repeat(160) + 'a'.repeat(24) + '!'

export type RuleResult = { ok: true; re: RegExp } | { ok: false; message: string }

const bad = (message: string): RuleResult => ({ ok: false, message })

const timeOnce = (re: RegExp): number => {
  const t0 = performance.now()
  for (const _ of SAMPLE.matchAll(re)) void _
  return performance.now() - t0
}

// timed:false skips the speed gate: the content script uses it so a rule that passed at save time is never dropped by a slow moment.
export function validateRule(source: string, { timed = true } = {}): RuleResult {
  if (!source) return bad('Enter a pattern.')
  let re: RegExp
  try {
    re = new RegExp(source, 'g')
  } catch (e) {
    return bad(SYNTAX_PREFIX + (e instanceof Error ? e.message : String(e)))
  }
  if (re.test('')) return bad('That pattern matches empty text, so it would tape everything.')
  re.lastIndex = 0
  if (timed && timeOnce(re) > SLOW_MS && timeOnce(re) > SLOW_MS) return bad(`That pattern is too slow (over ${SLOW_MS} ms on a 10 KB sample).`)
  re.lastIndex = 0
  return { ok: true, re }
}
