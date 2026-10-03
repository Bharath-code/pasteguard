import { limited } from '../../lib/limit.js'

const NINETY_DAYS = 90 * 24 * 60 * 60
const VERSION = /^\d{1,4}(\.\d{1,5}){0,3}$/

export async function onRequestPost({ request, env }) {
  if (await limited(request, env, 'rl:bye')) return new Response(null, { status: 429 })
  if (!request.headers.get('content-type')?.includes('application/json')) return new Response(null, { status: 415 })
  if (Number(request.headers.get('content-length') ?? 0) > 256) return new Response(null, { status: 413 })
  let body
  try { body = await request.json() } catch { return new Response(null, { status: 400 }) }
  if (!Number.isInteger(body?.reason) || body.reason < 0 || body.reason > 3) return new Response(null, { status: 400 })
  const v = typeof body.v === 'string' && VERSION.test(body.v) ? body.v : null
  await env.WAITLIST.put(`bye:${crypto.randomUUID()}`, JSON.stringify({ reason: body.reason, v }), { expirationTtl: NINETY_DAYS })
  return new Response(null, { status: 204 })
}
