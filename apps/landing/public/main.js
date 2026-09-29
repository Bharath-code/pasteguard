import { detect, redact } from './detect.js'

const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n }

// hero: one orchestrated sequence
const stage = $('[data-stage]')
const aiText = $('[data-ai-text]')
const REPLY = [
  'Your key ', { real: 'sk_live_51HxQm8vT2cKp' }, ' is a live key, but checkout runs against test prices. Swap it for your test key or create the prices in live mode.',
]
let timers = []

function typeReply(instant) {
  aiText.textContent = ''
  const nodes = REPLY.map(p => typeof p === 'string' ? document.createTextNode('') : el('span', { className: 'tok' }))
  aiText.append(...nodes)
  const fill = (n, text) => { n.textContent = text }
  if (instant) return REPLY.forEach((p, i) => p.real ? swapIn(nodes[i], p.real) : fill(nodes[i], p))
  let t = 0
  REPLY.forEach((p, i) => {
    const text = p.real ? 'PG_SECRET_1' : p
    for (let c = 1; c <= text.length; c += 2) timers.push(setTimeout(() => fill(nodes[i], text.slice(0, c)), (t += 16)))
    timers.push(setTimeout(() => fill(nodes[i], text), t))
    if (p.real) timers.push(setTimeout(() => swapIn(nodes[i], p.real), t + 900))
  })
  return t + 900
}

function swapIn(node, real) {
  node.className = 'restored'
  node.textContent = real
  node.title = 'Restored on your screen only'
}

function playHero() {
  timers.forEach(clearTimeout)
  timers = []
  stage.className = 'stage'
  if (reduced) {
    stage.classList.add(...['s2', 's5', 's6', 's7', 's8'])
    typeReply(true)
    return
  }
  const at = (ms, cls, fn) => timers.push(setTimeout(() => { stage.classList.add(cls); fn?.() }, ms))
  at(300, 's1')
  at(1150, 's2')
  at(1700, 's3')
  at(2300, 's4')
  at(2900, 's5')
  at(4600, 's6')
  at(5200, 's7', () => { const d = typeReply(false); at(d + 200, 's8') })
}

if (stage) {
  void stage.offsetWidth
  playHero()
  $('[data-replay]').addEventListener('click', playHero)
}

// try-it: live redaction, DOM-built (no innerHTML with user input)
const input = $('#try-input')
const out = $('[data-try-out]')
const summary = $('[data-try-summary]')
const SAMPLE = `# .env — every value here is fake
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
OPENAI_API_KEY=sk-proj-7fHq2LmZr8XbN4vT0pWc9sYe
DATABASE_URL=postgres://admin:hunter2prod@db.acme.io/main
SUPPORT_EMAIL=priya@acme.io
NODE_ENV=production`

function renderTry() {
  const { parts, count } = redact(input.value)
  const hits = parts.filter(p => p.hit)
  out.replaceChildren(...(input.value ? parts.map(p => p.hit ? el('mark', { title: p.hit.type, textContent: p.text }) : document.createTextNode(p.text)) : []))
  if (!count) return summary.replaceChildren('Nothing sensitive yet.')
  const types = [...new Set(hits.map(h => h.hit.type))]
  summary.replaceChildren(el('b', { textContent: `${count} ${count === 1 ? 'secret' : 'secrets'} swapped for placeholders: ` }), types.join(', ') + '.')
}

if (input) {
  let raf
  input.addEventListener('input', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(renderTry) })
  $('[data-sample]').addEventListener('click', () => { input.value = SAMPLE; renderTry(); input.focus() })
}

// package checker: real registry lookups from the browser (both registries allow CORS)
const checker = $('[data-checker]')
const verdict = $('[data-verdict]')
const DAY = 864e5
const fmt = n => new Intl.NumberFormat('en', { notation: 'compact' }).format(n)
const since = iso => new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })

async function lookup(eco, raw) {
  const name = raw.trim()
  if (eco === 'npm') {
    if (!/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i.test(name)) return { invalid: true }
    const path = name.replace('/', '%2F')
    const d = await fetch(`https://api.npmjs.org/downloads/point/last-week/${name}`)
    const weekly = d.ok ? (await d.json()).downloads : null
    // ponytail: popular packages have multi-MB metadata docs; skip fetching them
    if (weekly >= 10000) return { exists: true, weekly }
    const r = await fetch(`https://registry.npmjs.org/${path}`)
    if (r.status === 404) return { exists: false }
    if (!r.ok) throw new Error(r.status)
    return { exists: true, created: (await r.json()).time?.created, weekly }
  }
  const norm = name.toLowerCase().replace(/[-_.]+/g, '-')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(norm)) return { invalid: true }
  const r = await fetch(`https://pypi.org/pypi/${norm}/json`)
  if (r.status === 404) return { exists: false }
  if (!r.ok) throw new Error(r.status)
  const j = await r.json()
  const created = Object.values(j.releases ?? {}).flat().map(f => f.upload_time_iso_8601).filter(Boolean).sort()[0]
  return { exists: true, created, weekly: null }
}

function card(kind, title, body) {
  verdict.replaceChildren(el('div', { className: `verdict-card v-${kind}` }, el('span', { className: 'verdict-dot' }), el('b', { textContent: title }), el('p', { textContent: body })))
}

if (checker) {
  checker.addEventListener('submit', async e => {
    e.preventDefault()
    const eco = checker.eco.value
    const reg = eco === 'npm' ? 'npm' : 'PyPI'
    const name = checker.name.value.trim()
    if (!name) return checker.name.focus()
    const btn = $('button', checker)
    btn.disabled = true
    verdict.replaceChildren(el('p', { className: 'fine', textContent: `Looking up ${name} on ${reg}…` }))
    try {
      const r = await lookup(eco, name)
      if (r.invalid) card('warn', 'That isn’t a valid package name', `Check the spelling. ${reg} names use letters, numbers, dots, dashes and underscores.`)
      else if (!r.exists) card('bad', `${name} doesn’t exist on ${reg}`, 'If an AI suggested it, don’t install it. Anyone could register this name tomorrow and put malware in it.')
      else {
        const young = r.created && Date.now() - Date.parse(r.created) < 180 * DAY
        const quiet = r.weekly !== null && r.weekly < 500
        const usage = r.weekly !== null ? `, ${fmt(r.weekly)} downloads last week` : ''
        if (young && (quiet || r.weekly === null)) card('warn', `${name} is new on ${reg}`, `First published ${since(r.created)}${usage}. New, little-used packages are how slopsquatting attacks start. Read the source before installing.`)
        else card('ok', `${name} is an established package`, `${r.created ? `First published ${since(r.created)}${usage}` : `${fmt(r.weekly)} downloads last week`}. Still check it’s the one you meant.`)
      }
    } catch {
      card('warn', 'Couldn’t reach the registry', 'Check your connection and try again.')
    } finally { btn.disabled = false }
  })
  $('#pkg-name').value = 'react-formguard-pro'
}

// run looping graphics only while visible
const io = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { threshold: .35 })
$$('[data-live]').forEach(n => io.observe(n))

// waitlist forms
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
$$('form[data-waitlist]').forEach(form => form.addEventListener('submit', async e => {
  e.preventDefault()
  const status = $('.form-status', form)
  const say = (state, msg) => { status.dataset.state = state; status.textContent = msg }
  const data = Object.fromEntries(new FormData(form))
  if (!EMAIL.test(data.email ?? '')) { say('error', 'Enter an email address like you@company.com.'); return form.email.focus() }
  if (form.dataset.plan === 'team' && (!data.company?.trim() || !data.size)) return say('error', 'Add your company name and team size.')
  const btn = $('button[type=submit]', form)
  btn.disabled = true
  try {
    const r = await fetch('/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...data, plan: form.dataset.plan }) })
    if (r.status === 429) return say('error', 'Too many tries from your network. Wait a minute and try again.')
    if (!r.ok) throw new Error(r.status)
    form.reset()
    say('ok', form.dataset.plan === 'team' ? 'You’re on the pilot list. We’ll email you within two working days to book setup.' : 'You’re on the list. We’ll email you once, on launch day.')
  } catch {
    say('error', 'That didn’t go through. Check your connection and try again.')
  } finally { btn.disabled = false }
}))
