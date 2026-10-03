const RE = /\b(pg[\s_-]?secret)[\s_\-​]?(\d+)(?![\w])/gi

/** @typedef {{ id: string, n: number, from: { seg: number, off: number }, to: { seg: number, off: number }, exact: boolean }} Found */

/** @param {string[]} segments @param {{final?: boolean}} [opts] @returns {Found[]} */
export function findPlaceholders(segments, opts = {}) {
  /** @type {number[]} */
  const starts = []
  let text = ''
  for (const s of segments) { starts.push(text.length); text += s }
  const at = (/** @type {number} */ i) => { let seg = 0; while (seg + 1 < starts.length && starts[seg + 1] <= i) seg++; return { seg, off: i - starts[seg] } }
  const out = []
  for (const m of text.matchAll(RE)) {
    const end = m.index + m[0].length
    if (!opts.final && end === text.length) continue
    const n = +m[2]
    const id = `PG_SECRET_${n}`
    out.push({ id, n, from: at(m.index), to: endAt(end), exact: m[0] === id })
  }
  return out

  /** @param {number} i */
  function endAt(i) { const p = at(i - 1); return { seg: p.seg, off: p.off + 1 } }
}
