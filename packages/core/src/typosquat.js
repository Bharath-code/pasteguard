import npmList from '../data/top-npm.json' with { type: 'json' }
import pypiList from '../data/top-pypi.json' with { type: 'json' }

/** @type {Record<'npm' | 'pypi', string[]>} */
const LISTS = { npm: npmList, pypi: pypiList }

const SETS = { npm: new Set(LISTS.npm), pypi: new Set(LISTS.pypi) }

/** @param {string} a @param {string} b @param {number} max @param {boolean} swaps */
const dist = (a, b, max, swaps) => {
  const n = a.length, m = b.length
  if (Math.abs(n - m) > max) return max + 1
  let p2 = /** @type {number[]} */ ([]), p1 = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    const cur = [i]
    let min = i
    for (let j = 1; j <= m; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + c)
      if (swaps && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, p2[j - 2] + 1)
      cur[j] = v
      if (v < min) min = v
    }
    if (min > max) return max + 1
    p2 = p1
    p1 = cur
  }
  return p1[m]
}

/** @param {string} name @param {'npm' | 'pypi'} eco @returns {string | null} */
export const nearest = (name, eco) => {
  const q = eco === 'pypi' ? name.toLowerCase().replace(/[_.]+/g, '-') : name.toLowerCase()
  const list = LISTS[eco]
  if (SETS[eco].has(q)) return null
  const short = q.length <= 4
  const max = short ? 1 : 2
  let best = null, bestD = max + 1
  for (const c of list) {
    if (Math.abs(c.length - q.length) > max) continue
    const d = dist(q, c, max, !short)
    if (d < bestD) { best = c; bestD = d; if (d === 1) break }
  }
  return best
}
