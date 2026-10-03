import type { Adapter } from '../../adapters'

type Send = (m: { t: 'adapter.status'; ok: boolean; site: string }) => Promise<unknown>
type Opts = { adapter: Pick<Adapter, 'composer'>; send: Send; site: string; settleMs?: number; fastMs?: number; slowMs?: number }

// Reports "limited" when no composer shows up within settleMs (login wall, DOM change); flips back once one appears.
export function watchAdapter({ adapter, send, site, settleMs = 10_000, fastMs = 1000, slowMs = 5000 }: Opts): () => void {
  const t0 = Date.now()
  let last: boolean | undefined
  let timer: ReturnType<typeof setTimeout>
  const report = (ok: boolean) => {
    if (ok === last) return
    last = ok
    void send({ t: 'adapter.status', ok, site }).catch(() => undefined)
  }
  const tick = () => {
    const found = !!adapter.composer()
    if (found) report(true)
    else if (Date.now() - t0 >= settleMs) report(false)
    if (!found || last !== true) timer = setTimeout(tick, Date.now() - t0 < settleMs ? fastMs : slowMs)
  }
  tick()
  return () => clearTimeout(timer)
}
