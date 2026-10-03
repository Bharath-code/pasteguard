const LIMIT = 5
const hash = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('')

// ponytail: KV is eventually consistent, so bursts across edge locations can slightly exceed LIMIT; move to a WAF rule once on a custom domain
export async function limited(request, env, scope = 'rl') {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  const key = `${scope}:${await hash(ip)}:${Math.floor(Date.now() / 60000)}`
  const n = Number(await env.WAITLIST.get(key)) || 0
  if (n >= LIMIT) return true
  await env.WAITLIST.put(key, String(n + 1), { expirationTtl: 120 })
  return false
}
