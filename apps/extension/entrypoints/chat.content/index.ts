import { pickAdapter } from '../../adapters'
import { AI_MATCHES } from '../../src/shared/sites'
import { createChip, type Chip } from '../../ui/chip'
import { mountHost } from '../../ui/host'
import { createToast } from '../../ui/toast'
import { installGuard, type GuardUI } from './guard'
import { settingsSource } from './settings'
import { installTestHook } from './testHook'
import { chromeSend, TabVault } from './vault'

let chip: Chip | undefined
let toast: ReturnType<typeof createToast> | undefined
const ui: GuardUI = {
  taped: r => {
    const host = mountHost()
    ;(chip ??= createChip(host)).taped(r)
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
    if (dev) installTestHook()
    installGuard({
      adapter: pickAdapter(location.host),
      vault: new TabVault(),
      settings: settingsSource(chromeSend),
      ui,
      send: chromeSend,
      mark: dev ? n => performance.mark(`pg:${n}`) : undefined,
    })
  },
})
