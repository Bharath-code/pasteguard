const q = new URLSearchParams(location.search)
const flag = k => q.get(k) === '1'
const kind = document.body.dataset.kind
const composer = document.querySelector('[data-composer]')
const thread = document.querySelector('[data-thread]')

const line = t => {
  const d = document.createElement('div')
  if (t) d.textContent = t
  else d.appendChild(document.createElement('br'))
  return d
}
const readComposer = () => (kind === 'textarea' ? composer.value : composer.innerText.replace(/\n$/, ''))
const clearComposer = () => {
  if (kind === 'textarea') composer.value = ''
  else composer.replaceChildren(line(''))
}

if (flag('hostile')) {
  const s = document.createElement('style')
  s.textContent = '* { all: unset; color: red !important }'
  document.head.appendChild(s)
}

document.body.dataset.conversation = q.get('c') ?? ''

const addUserTurn = text => {
  const d = document.createElement('div')
  d.dataset.userTurn = ''
  d.textContent = text
  thread.appendChild(d)
}

const hist = q.get('history')
if (hist === 'many') {
  for (let i = 0; i < 200; i++) addUserTurn(`turn ${i}: ` + 'config value 12345 and some ordinary prose about deploys. '.repeat(8))
  addUserTurn('my key is ' + 'AKIA' + 'IOSFODNN7EXAMPLE')
} else if (hist === 'placeholder') {
  addUserTurn('use PG_SECRET_1 and PG_SECRET_2 please')
} else if (hist) {
  addUserTurn('earlier question about deploys')
  addUserTurn(hist === 'aws' ? 'my key is ' + 'AKIA' + 'IOSFODNN7EXAMPLE' + ' please rotate it' : 'earlier follow up with nothing sensitive')
}

if (kind !== 'textarea') clearComposer()

if (kind === 'prosemirror') {
  composer.addEventListener('paste', e => {
    if (flag('broken') && !e.isTrusted) return
    const text = e.clipboardData?.getData('text/plain')
    if (!text) return
    e.preventDefault()
    if (flag('asyncpaste')) setTimeout(() => place(text), 20)
    else place(text)
  })
}

function place(text) {
    const sel = getSelection()
    const lines = text.split('\n')
    let range = sel.rangeCount && composer.contains(sel.anchorNode) ? sel.getRangeAt(0) : null
    if (!range) {
      range = document.createRange()
      range.selectNodeContents(composer)
      range.collapse(false)
    }
    range.deleteContents()
    let block = range.startContainer
    while (block !== composer && block.parentNode !== composer) block = block.parentNode
    if (block === composer) {
      block = line('')
      composer.appendChild(block)
    }
    block.querySelector(':scope > br')?.remove()
    const first = document.createTextNode(lines[0])
    if (range.startContainer === composer) block.appendChild(first)
    else range.insertNode(first)
    let last = block
    for (const l of lines.slice(1)) {
      const d = line(l)
      last.after(d)
      last = d
    }
    const end = document.createRange()
    end.selectNodeContents(last)
    end.collapse(false)
    sel.removeAllRanges()
    sel.addRange(end)
}

if (flag('broken')) {
  const snap = () => (kind === 'textarea' ? composer.value : composer.innerHTML)
  const restore = v => (kind === 'textarea' ? (composer.value = v) : (composer.innerHTML = v))
  let prev = snap()
  composer.addEventListener('input', e => {
    if (e.inputType === 'insertText' && (e.data ?? '').length > 1) restore(prev)
    else prev = snap()
  })
}

const reply = sent => {
  const tokens = [...new Set(sent.match(/PG_SECRET_\d+/g) ?? [])]
  const pieces = ['Here is the setup. ']
  if (q.get('answer')) pieces.push(q.get('answer'))
  else if (flag('split')) pieces.push('PG_SEC', 'RET_', '1 done. ')
  else for (const t of tokens) pieces.push('Use ', t, ' for it. ')
  const answer = document.createElement('div')
  answer.dataset.answer = ''
  answer.dataset.streaming = 'true'
  thread.appendChild(answer)
  const model = []
  const render = () => {
    const p = document.createElement('p')
    for (const s of model) {
      const span = document.createElement('span')
      span.textContent = s
      p.appendChild(span)
    }
    const nodes = [p]
    if (model.length === pieces.length) {
      const pre = document.createElement('pre')
      const c = document.createElement('code')
      c.textContent = 'npm i react-form-utils-pro zod'
      pre.appendChild(c)
      nodes.push(pre)
    }
    answer.replaceChildren(...nodes)
  }
  let i = 0
  const timer = setInterval(() => {
    if (i < pieces.length) {
      model.push(pieces[i++])
      render()
      if (i < pieces.length) return
    }
    clearInterval(timer)
    delete answer.dataset.streaming
    if (flag('rerender')) {
      const end = Date.now() + 3000
      const rt = setInterval(() => {
        render()
        if (Date.now() > end) clearInterval(rt)
      }, 300)
    }
  }, 30)
}

const bulk = +(q.get('answers') ?? 0)
for (let i = 0; i < bulk; i++) {
  const a = document.createElement('div')
  a.dataset.answer = ''
  for (let p = 0; p < 4; p++) {
    const para = document.createElement('p')
    para.textContent = `Answer ${i} paragraph ${p}: ` + 'the PG tool and the secret handling doc are ordinary words here. '.repeat(6)
    a.appendChild(para)
  }
  thread.appendChild(a)
}

document.querySelector('[data-send]').addEventListener('click', () => {
  const text = readComposer()
  if (!text.trim()) return
  addUserTurn(text)
  fetch('/log', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) })
  clearComposer()
  reply(text)
})

const lastAnswerText = () => [...document.querySelectorAll('[data-answer]')].at(-1)?.innerText ?? ''
document.querySelector('[data-copy-writeText]').addEventListener('click', () => navigator.clipboard.writeText(lastAnswerText()))
document.querySelector('[data-copy-write]').addEventListener('click', () =>
  navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([lastAnswerText()], { type: 'text/plain' }) })]),
)
document.querySelector('[data-copy-exec]').addEventListener('click', () => {
  const t = document.createElement('textarea')
  t.value = lastAnswerText()
  document.body.appendChild(t)
  t.select()
  document.execCommand('copy')
  t.remove()
})
