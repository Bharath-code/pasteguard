/**
 * @typedef {{ status: 'missing' | 'found' | 'error', scoped?: boolean, createdAt?: number, weeklyDownloads?: number, lookalike?: string | null, now: number }} Facts
 * @typedef {{ kind: 'missing' | 'missing-scoped' | 'new' | 'low' | 'lookalike' | 'ok' | 'error', days?: number, downloads?: number, like?: string }} Verdict
 */

const DAY = 864e5
const NEW_DAYS = 30
const LOW_WEEKLY = 100

/** @param {Facts} f @returns {Verdict} */
export const verdict = f => {
  if (f.status === 'error') return { kind: 'error' }
  if (f.status === 'missing') return { kind: f.scoped ? 'missing-scoped' : 'missing' }
  if (f.lookalike) return { kind: 'lookalike', like: f.lookalike }
  if (f.createdAt !== undefined) {
    const days = Math.floor((f.now - f.createdAt) / DAY)
    if (days < NEW_DAYS) return { kind: 'new', days }
  }
  if (f.weeklyDownloads !== undefined && f.weeklyDownloads < LOW_WEEKLY) return { kind: 'low', downloads: f.weeklyDownloads }
  return { kind: 'ok' }
}
