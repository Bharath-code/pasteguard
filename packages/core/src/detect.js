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
  { id: 'github', type: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g, keywords: ['gh', 'github_pat_'] },
  { id: 'slack', type: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, keywords: ['xox'] },
  { id: 'google-api', type: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}/g, keywords: ['aiza'] },
  { id: 'jwt', type: 'JWT', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, keywords: ['eyj'] },
  ...EXTRA,
  { id: 'db-password', type: 'Database password', re: /\b[a-z][a-z0-9+]*:\/\/[^\s:@/]+:([^\s@/]+)@/gid, group: 1, keywords: ['://'] },
  { id: 'assignment', type: 'Secret value', re: /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*["']?([^\s"']{8,})/gd, group: 1, check: v => shannon(v) >= 3.5, keywords: ['secret', 'token', 'passw', 'api_key', 'private_key'] },
  { id: 'card', type: 'Card number', re: /\b(?:\d[ -]?){12,18}\d\b/g, check: s => luhn(s.replace(/\D/g, '')) },
  { id: 'email', type: 'Email address', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, pii: true, keywords: ['@'] },
]

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
  for (const r of rules) {
    if (r.keywords && !r.keywords.some(k => lower.includes(k))) continue
    for (const m of text.matchAll(r.re)) {
      const [start, end] = r.group ? /** @type {RegExpIndicesArray} */ (m.indices)[r.group] : [m.index, m.index + m[0].length]
      const value = text.slice(start, end)
      if (!r.check || r.check(r.group ? value : m[0])) hits.push({ start, end, type: r.type, value, rule: r.id })
    }
  }
  return hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .filter((h, i, all) => !all.slice(0, i).some(p => h.start < p.end && p.start < h.end))
}

/** @param {string} text @param {ReturnType<typeof detect>} [hits] */
export function redact(text, hits = detect(text)) {
  const ids = new Map()
  let out = ''
  let last = 0
  const parts = []
  for (const h of hits) {
    if (!ids.has(h.value)) ids.set(h.value, `PG_SECRET_${ids.size + 1}`)
    const token = ids.get(h.value)
    parts.push({ text: text.slice(last, h.start) }, { text: token, hit: h })
    out += text.slice(last, h.start) + token
    last = h.end
  }
  parts.push({ text: text.slice(last) })
  return { text: out + text.slice(last), parts, count: ids.size }
}
