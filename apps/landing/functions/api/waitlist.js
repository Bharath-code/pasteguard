const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/
const SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const LIMIT = 5
const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')

// ponytail: KV is eventually consistent, so bursts across edge locations can slightly exceed LIMIT; move to a WAF rule once on a custom domain
async function limited(request, env) {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  const key = `rl:${await hash(ip)}:${Math.floor(Date.now() / 60000)}`
  const n = Number(await env.WAITLIST.get(key)) || 0
  if (n >= LIMIT) return true
  await env.WAITLIST.put(key, String(n + 1), { expirationTtl: 120 })
  return false
}

export async function onRequestPost({ request, env }) {
  if (await limited(request, env)) return json({ error: 'too many requests' }, 429)
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'expected json' }, 415)
  if (Number(request.headers.get('content-length') ?? 0) > 2048) return json({ error: 'too large' }, 413)
  let body
  try { body = await request.json() } catch { return json({ error: 'bad json' }, 400) }
  if (body.website) return json({ ok: true })
  const email = String(body.email ?? '').trim().toLowerCase()
  const plan = body.plan === 'team' ? 'team' : 'individual'
  if (!EMAIL.test(email)) return json({ error: 'invalid email' }, 422)
  const company = String(body.company ?? '').trim().slice(0, 100)
  const size = SIZES.includes(body.size) ? body.size : null
  if (plan === 'team' && (!company || !size)) return json({ error: 'company and size required' }, 422)
  const key = `${plan}:${email}`
  if (!(await env.WAITLIST.get(key))) {
    await env.WAITLIST.put(key, JSON.stringify({ email, plan, company, size, country: request.cf?.country ?? null, ref: request.headers.get('referer') ?? null, at: new Date().toISOString() }))
  }
  return json({ ok: true })
}
