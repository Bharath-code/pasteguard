import { EXTRA } from './rules-extra.js'
import { shannon } from './entropy.js'

/** @typedef {import('./rules-extra.js').Rule} Rule */
/** @typedef {{ start: number, end: number, type: string, value: string, rule: string }} Hit */

/** @type {Rule[]} */
export const RULES = [
  { id: 'private-key', type: 'Private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, keywords: ['private key'] },
  { id: 'anthropic', type: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, keywords: ['sk-ant-'] },
  { id: 'openai', type: 'OpenAI key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, keywords: ['sk-'] },
  { id: 'stripe', type: 'Stripe key', re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g, keywords: ['_live_', '_test_'] },
  { id: 'aws-access-key', type: 'AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, keywords: ['akia', 'asia'] },
  { id: 'github', type: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g, keywords: ['ghp_', 'gho_', 'ghu_', 'ghs_', 'ghr_', 'github_pat_'] },
  { id: 'slack', type: 'Slack token', re: /\bxox(?:[abrs]-|p-(?!\d{10,13}-\d{10,13}-\d{10,13}-[a-zA-Z0-9-]{28,34}(?![\w-])))[A-Za-z0-9-]{10,}/g, keywords: ['xox'] },
  { id: 'google-api', type: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}/g, keywords: ['aiza'] },
  { id: 'jwt', type: 'JWT', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, keywords: ['eyj'] },
  ...EXTRA,
  { id: 'db-password', type: 'Database password', re: /\b[a-z][a-z0-9+]*:\/\/[^\s:@/]+:([^\s@/]+)@/gid, group: 1, keywords: ['://'] },
  { id: 'assignment', type: 'Secret value', re: /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*["']?([^\s"']{8,})/gd, group: 1, check: v => shannon(v) >= 3.5, generic: true, keywords: ['secret', 'token', 'passw', 'api_key', 'private_key'] },
  { id: 'card', type: 'Card number', re: /(?<![\w-])(?:\d[ -]?){12,18}\d\b/g, check: s => cardShape(s.replace(/\D/g, '')) && luhn(s.replace(/\D/g, '')) },
  { id: 'email', type: 'Email address', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, pii: true, keywords: ['@'] },
]

const CARD_SHAPES = [
  /^4(?:\d{12}|\d{15}|\d{18})$/,
  /^(?:5[1-5]\d{2}|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)\d{12}$/,
  /^3[47]\d{13}$/,
  /^(?:6011|65\d{2}|64[4-9]\d)\d{12}(?:\d{3})?$/,
  /^3(?:0[0-5]|[68]\d)\d{11,16}$/,
  /^35(?:2[89]|[3-8]\d)\d{12,15}$/,
  /^62\d{14,17}$/,
  /^(?:5018|5020|5038|5893|6304|6759|676[1-3])\d{8,15}$/,
]

/** @param {string} d */
const cardShape = d => CARD_SHAPES.some(re => re.test(d))

/** @param {string} d */
function luhn(d) {
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i]
    if (i % 2) n = n * 2 > 9 ? n * 2 - 9 : n * 2
    sum += n
  }
  return d.length >= 13 && sum % 10 === 0
}

/** @param {string} text @param {{ pii?: boolean, extra?: { type: string, re: RegExp }[] }} [opts] @returns {Hit[]} */
export function detect(text, opts = {}) {
  const lower = text.toLowerCase()
  /** @type {Rule[]} */
  const custom = (opts.extra ?? []).map((r, i) => ({ id: `custom-${i}`, type: r.type, re: r.re.global ? r.re : new RegExp(r.re.source, r.re.flags + 'g') }))
  const rules = [...RULES.filter(r => opts.pii || !r.pii), ...custom]
  /** @type {Hit[]} */
  const hits = []
  /** @type {Set<Hit>} */
  const generic = new Set()
  for (const r of rules) {
    if (r.keywords && !r.keywords.some(k => lower.includes(k))) continue
    for (const m of text.matchAll(r.re)) {
      const [start, end] = r.group ? /** @type {RegExpIndicesArray} */ (m.indices)[r.group] : [m.index, m.index + m[0].length]
      const value = text.slice(start, end)
      if (r.check && !r.check(r.group ? value : m[0])) continue
      /** @type {Hit} */
      const hit = { start, end, type: r.type, value, rule: r.id }
      hits.push(hit)
      if (r.generic) generic.add(hit)
    }
  }
  return hits.sort((a, b) => a.start - b.start || +generic.has(a) - +generic.has(b) || (b.end - b.start) - (a.end - a.start))
    .reduce((/** @type {Hit[]} */ kept, h) => {
      const p = kept[kept.length - 1]
      if (!p || h.start >= p.end) kept.push(h)
      return kept
    }, [])
}

/** @typedef {{ text: string, hit?: Hit }} Part */

/** @param {string} text @param {Hit[]} [hits] @param {{ next: number, ids: Map<string, string> }} [state] */
export function redact(text, hits = detect(text), state = { next: 1, ids: new Map() }) {
  const seen = new Set()
  /** @type {Part[]} */
  const parts = []
  let out = '', last = 0
  for (const h of hits) {
    if (!state.ids.has(h.value)) state.ids.set(h.value, `PG_SECRET_${state.next++}`)
    const token = /** @type {string} */ (state.ids.get(h.value))
    seen.add(token)
    parts.push({ text: text.slice(last, h.start) }, { text: token, hit: h })
    out += text.slice(last, h.start) + token
    last = h.end
  }
  parts.push({ text: text.slice(last) })
  return { text: out + text.slice(last), parts, count: seen.size, state }
}
