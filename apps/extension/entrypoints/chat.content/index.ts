import { pickAdapter } from '../../adapters'
import { AI_MATCHES } from '../../src/shared/sites'
import { installGuard, type GuardUI } from './guard'
import { settingsSource } from './settings'
import { installTestHook } from './testHook'
import { chromeSend, TabVault } from './vault'

const ui: GuardUI = { taped() {}, fallback() {} }
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
