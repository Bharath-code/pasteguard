/** @typedef {{ eco: 'npm' | 'pypi', name: string, start: number, end: number }} Pkg */

/** @type {{ re: RegExp, eco: 'npm' | 'pypi' }[]} */
const HEADS = [
  { re: /^npm\s+(?:i|install|add)(?=\s|$)/, eco: 'npm' },
  { re: /^pnpm\s+(?:add|i|install)(?=\s|$)/, eco: 'npm' },
  { re: /^yarn\s+add(?=\s|$)/, eco: 'npm' },
  { re: /^bun\s+add(?=\s|$)/, eco: 'npm' },
  { re: /^pip3?\s+install(?=\s|$)/, eco: 'pypi' },
  { re: /^python3?\s+-m\s+pip\s+install(?=\s|$)/, eco: 'pypi' },
  { re: /^uv\s+(?:add|pip\s+install)(?=\s|$)/, eco: 'pypi' },
  { re: /^poetry\s+add(?=\s|$)/, eco: 'pypi' },
]
const VALUE_FLAGS = new Set(['-r', '-c', '-e', '-i', '--requirement', '--constraint', '--editable', '--index-url', '--extra-index-url', '--find-links', '-f', '--target', '-t', '--prefix', '--python', '-p'])
const SKIP = /^(?:\.|\/|~|git\+|github:|gitlab:|bitbucket:|file:|link:|workspace:|npm:)|:\/\//
const NPM_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i
const PYPI_NAME = /^[a-z0-9][\w.-]*$/i

/** @param {string} code @returns {Pkg[]} */
export const parseInstalls = code => {
  /** @type {Pkg[]} */
  const out = []
  const sep = /\\\r?\n|\r?\n|&&|\|\||;/g
  const cont = /\\\r?\n/y
  let from = 0
  /** @param {number} to */
  const segment = to => {
    const text = code.slice(from, to)
    const lead = /^\s*(?:[$>#]\s+)?/.exec(text)?.[0].length ?? 0
    const base = from + lead
    parseSegment(text.slice(lead), base, out)
  }
  const joined = []
  let m
  while ((m = sep.exec(code))) {
    joined.push(m)
  }
  const bounds = []
  for (const x of joined) {
    cont.lastIndex = x.index
    if (cont.test(code)) continue
    bounds.push(x)
  }
  for (const x of bounds) { segment(x.index); from = x.index + x[0].length }
  segment(code.length)
  return out
}

/** @param {string} text @param {number} base @param {Pkg[]} out */
const parseSegment = (text, base, out) => {
  const flat = text.replace(/\\\r?\n/g, m => ' '.repeat(m.length))
  const head = HEADS.find(h => h.re.test(flat))
  if (!head) return
  const rest = flat.match(head.re)?.[0].length ?? 0
  const tok = /"([^"]*)"|'([^']*)'|(\S+)/g
  tok.lastIndex = rest
  let skipNext = false
  let t
  while ((t = tok.exec(flat))) {
    const quoted = t[1] ?? t[2]
    const raw = quoted ?? t[3]
    const off = t.index + (quoted === undefined ? 0 : 1)
    if (skipNext) { skipNext = false; continue }
    if (raw.startsWith('-')) {
      if (VALUE_FLAGS.has(raw)) skipNext = true
      continue
    }
    if (SKIP.test(raw)) continue
    if (head.eco === 'npm') {
      const at = raw.indexOf('@', 1)
      const name = at === -1 ? raw : raw.slice(0, at)
      if (NPM_NAME.test(name)) out.push({ eco: 'npm', name, start: base + off, end: base + off + name.length })
    } else {
      const name = raw.split(/[[=<>~!;\s]/, 1)[0]
      if (PYPI_NAME.test(name)) out.push({ eco: 'pypi', name, start: base + off, end: base + off + name.length })
    }
  }
}
