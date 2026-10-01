import { detect, RULES } from '../src/detect.js'
import { positives, TEMPLATES, PER_RULE } from '../corpus/positive.js'
import { readdir, readFile } from 'node:fs/promises'

let fail = false
const need = RULES.filter(r => !r.pii).map(r => r.id).filter(id => !TEMPLATES[id])
if (need.length) { console.error('no positive template for', need); fail = true }

const typeOf = new Map(RULES.map(r => [r.id, r.type]))
const byRule = new Map()
for (const { rule, text } of positives()) {
  const s = byRule.get(rule) ?? { n: 0, hit: 0 }; s.n++
  if (detect(text).some(h => h.rule === rule || h.type === typeOf.get(rule))) s.hit++
  byRule.set(rule, s)
}
let N = 0, H = 0
for (const [rule, { n, hit }] of byRule) {
  N += n; H += hit
  if (n < PER_RULE) { console.error(`only ${n} samples for ${rule}`); fail = true }
  if (hit / n < 0.98) { console.error(`recall ${rule} ${(hit / n * 100).toFixed(1)}%`); fail = true }
}
if (H / N < 0.99) { console.error(`overall recall ${(H / N * 100).toFixed(2)}%`); fail = true }

const dir = new URL('../corpus/negative/', import.meta.url)
let bytes = 0, fps = 0
for (const f of await readdir(dir)) {
  const t = await readFile(new URL(f, dir), 'utf8'); bytes += t.length
  for (const h of detect(t)) { fps++; console.error(`FP ${f}: ${h.rule} at ${h.start}`) }
}
if (bytes < 2e6) { console.error(`negative corpus ${bytes} bytes, need 2 MB`); fail = true }
const perMB = fps / (bytes / 1e6)
if (perMB > 1) { console.error(`FP ${perMB.toFixed(2)}/MB`); fail = true }

const sample = (await readFile(new URL('package-lock.sample.json', dir), 'utf8')).slice(0, 10_000)
const times = []
for (let i = 0; i < 500; i++) { const t0 = performance.now(); detect(sample); times.push(performance.now() - t0) }
times.sort((a, b) => a - b)
const p95 = times[Math.floor(times.length * 0.95)]
if (p95 > 5) { console.error(`p95 ${p95.toFixed(2)}ms`); fail = true }

console.log(`recall ${(H / N * 100).toFixed(2)}% · FP ${perMB.toFixed(2)}/MB · p95 ${p95.toFixed(2)}ms`)
process.exit(fail ? 1 : 0)
