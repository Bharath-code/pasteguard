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
  let from = 0
  let quote = ''
  /** @param {number} to */
  const flush = to => {
    const text = code.slice(from, to)
    const lead = /^\s*(?:[$>]\s+)?/.exec(text)?.[0].length ?? 0
    parseSegment(text.slice(lead), from + lead, out)
  }
  let i = 0
  while (i < code.length) {
    const c = code[i]
    if (quote) {
      if (c === quote) quote = ''
      i++
      continue
    }
    if (c === '\\' && (code[i + 1] === '\n' || (code[i + 1] === '\r' && code[i + 2] === '\n'))) {
      i += code[i + 1] === '\n' ? 2 : 3
      continue
    }
    if (c === '"' || c === "'") { quote = c; i++; continue }
    if (c === '#' && (i === from || /\s/.test(code[i - 1]))) {
      flush(i)
      const nl = code.indexOf('\n', i)
      i = nl === -1 ? code.length : nl
      from = i
      continue
    }
    const two = code.slice(i, i + 2)
    let len = 0
    if (c === '\n' || c === ';' || c === '<') len = 1
    else if (two === '&&' || two === '||') len = 2
    else if (c === '|' || (c === '>' && code.slice(from, i).trim() !== '')) len = 1
    if (len) {
      flush(i)
      i += len
      from = i
      continue
    }
    i++
  }
  flush(code.length)
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
