const THANKS = 'Got it, thank you. That goes straight to the person who can fix it.'
const FAILED = "Couldn't send that, but thank you for telling us."
const opts = [...document.querySelectorAll('.opt')]
const thanks = document.getElementById('thanks')
const v = new URLSearchParams(location.search).get('v')

for (const o of opts) {
  o.addEventListener('click', async () => {
    for (const x of opts) { x.disabled = true; x.setAttribute('aria-pressed', String(x === o)) }
    try {
      const r = await fetch('/api/bye', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: Number(o.dataset.reason), v }) })
      thanks.textContent = r.ok ? THANKS : FAILED
    } catch {
      thanks.textContent = FAILED
    }
  })
}
