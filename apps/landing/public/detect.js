// ponytail: demo subset of rules; the extension will port the full gitleaks set
const RULES = [
  { type: 'Private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { type: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  { type: 'OpenAI key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { type: 'Stripe key', re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { type: 'AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { type: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g },
  { type: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { type: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}/g },
  { type: 'JWT', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { type: 'Database password', re: /\b[a-z][a-z0-9+]*:\/\/[^\s:@/]+:([^\s@/]+)@/gid, group: 1 },
  { type: 'Secret value', re: /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*["']?([^\s"']{8,})/gd, group: 1 },
  { type: 'Card number', re: /\b(?:\d[ -]?){12,18}\d\b/g, check: s => luhn(s.replace(/\D/g, '')) },
  { type: 'Email address', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g },
]

function luhn(d) {
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i]
    if (i % 2) n = n * 2 > 9 ? n * 2 - 9 : n * 2
    sum += n
  }
  return d.length >= 13 && sum % 10 === 0
}

export function detect(text) {
  const hits = []
  for (const { type, re, group, check } of RULES) {
    for (const m of text.matchAll(re)) {
      const [start, end] = group ? m.indices[group] : [m.index, m.index + m[0].length]
      if (!check || check(m[0])) hits.push({ start, end, type, value: text.slice(start, end) })
    }
  }
  return hits
    .filter((h, i, all) => !all.slice(0, i).some(p => h.start < p.end && p.start < h.end))
    .sort((a, b) => a.start - b.start)
}

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
