import { pickAdapter } from '../../adapters'
import { AI_MATCHES } from '../../src/shared/sites'
import { createChip, timing, type Chip } from '../../ui/chip'
import { announce, mountHost } from '../../ui/host'
import { createNotice } from '../../ui/notice'
import { createToast } from '../../ui/toast'
import { readChips, retryChip } from '../../ui/verdict'
import { installCopy } from './copy'
import { installGuard, type GuardUI } from './guard'
import { installLeakScan } from './leakscan'
import { installPackages } from './packages'
import { installRestorer, passMs, readRestored } from './restore'
import { settingsSource } from './settings'
import { installTestHook } from './testHook'
import { chromeSend, TabVault } from './vault'

let chip: Chip | undefined
let toast: ReturnType<typeof createToast> | undefined
let own = <T>(fn: () => T): T => fn()
const adapter = pickAdapter(location.host)
const ui: GuardUI = {
  taped: r => {
    const host = mountHost()
    ;(chip ??= createChip(host, { adapter, send: chromeSend, own: fn => own(fn) })).taped(r)
  },
  fallback: k => {
    const host = mountHost()
    ;(toast ??= createToast(host)).fallback(k)
  },
}
const dev = import.meta.env.MODE === 'development'

export default defineContentScript({
  matches: import.meta.env.MODE === 'production' ? AI_MATCHES : [...AI_MATCHES, 'http://localhost/*'],
  runAt: 'document_start',
  allFrames: false,
  main() {
    if (dev)
      installTestHook({
        'chip.blurDismissMs': ([n]) => void (timing.blurDismissMs = Number(n)),
        'restore.read': () => readRestored(),
        'restore.timings': () => [...passMs],
        'restore.clearTimings': () => void (passMs.length = 0),
        'pkg.read': () => readChips(),
        'pkg.retry': ([i]) => retryChip(Number(i)),
      })
    const settings = settingsSource(chromeSend)
    const vault = new TabVault()
    own = installGuard({
      adapter,
      vault,
      settings,
      ui,
      send: chromeSend,
      mark: dev ? n => performance.mark(`pg:${n}`) : undefined,
    }).own
    installRestorer({ adapter, vault, after: installPackages({ adapter, send: chromeSend, settings, announce: text => announce(mountHost().layer, text) }) })
    installCopy({ vault, adapter })
    installLeakScan({ adapter, send: chromeSend, settings, show: hits => createNotice(mountHost()).leak(hits) })
  },
})
