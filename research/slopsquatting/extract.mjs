const NPM_CMD = /\b(?:npm\s+(?:i|install|add)|yarn\s+(?:global\s+)?add|pnpm\s+(?:add|i|install)|bun\s+(?:add|i|install))\b([^\n;&|`#]*)/g
const PY_CMD = /\b(?:(?:pip3?|pipx|uv\s+pip|python3?\s+-m\s+pip)\s+install|(?:uv|poetry|pdm)\s+add)\b([^\n;&|`#]*)/g
const PKG_JSON = /"(?:dependencies|devDependencies|peerDependencies|optionalDependencies)"\s*:\s*\{([^}]*)\}/g

const VALUE_FLAGS = new Set(['-r', '--requirement', '-c', '--constraint', '-e', '--editable', '-i', '--index-url', '--extra-index-url', '-t', '--target', '-f', '--find-links', '--registry', '--prefix', '--group', '-G', '--python', '-p'])
const NPM_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i
const PY_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

const tokens = s => s.trim().split(/\s+/).map(t => t.replace(/^["'`]+|["'`,]+$/g, '')).filter(Boolean)

function* args(rest) {
  const ts = tokens(rest)
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i]
    if (t === '\\') continue
    if (t.startsWith('-')) {
      if (VALUE_FLAGS.has(t)) i++
      continue
    }
    yield t
  }
}

const isPathOrUrl = t => /^[./~]/.test(t) || t.includes('://') || /\.(whl|tar\.gz|zip|txt|tgz)$/i.test(t) || /[<>{}$]/.test(t.replace(/[<>=!~]=?[\d.*]+.*$/, ''))

export function npmName(t) {
  if (isPathOrUrl(t) || t.includes(':')) return null
  if (!t.startsWith('@') && t.includes('/')) return null
  const at = t.indexOf('@', 1)
  const name = at > 0 ? t.slice(0, at) : t
  return NPM_NAME.test(name) ? name : null
}

export function pyName(t) {
  if (isPathOrUrl(t) || t.startsWith('git+')) return null
  const name = t.split(/[[<>=!~;@\s]/)[0]
  return PY_NAME.test(name) ? name.toLowerCase().replace(/[-_.]+/g, '-') : null
}

export function extractPackages(raw) {
  const text = raw.replace(/[ \t]+#[^\n]*/g, '')
  const out = new Map()
  const add = (ecosystem, name, source) => name && !out.has(`${ecosystem}:${name}`) && out.set(`${ecosystem}:${name}`, { ecosystem, name, source })
  for (const [, rest] of text.matchAll(NPM_CMD)) for (const t of args(rest)) add('npm', npmName(t), 'cmd')
  for (const [, rest] of text.matchAll(PY_CMD)) for (const t of args(rest)) add('pypi', pyName(t), 'cmd')
  for (const [, body] of text.matchAll(PKG_JSON)) for (const [, k] of body.matchAll(/"([^"]+)"\s*:/g)) add('npm', npmName(k), 'package.json')
  return [...out.values()]
}
