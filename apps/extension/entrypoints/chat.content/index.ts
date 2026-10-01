import { AI_MATCHES } from '../../src/shared/sites'
import { installTestHook } from './testHook'

export default defineContentScript({
  matches: import.meta.env.MODE === 'production' ? AI_MATCHES : [...AI_MATCHES, 'http://localhost/*'],
  runAt: 'document_start',
  allFrames: false,
  main() {
    if (import.meta.env.MODE === 'development') installTestHook()
  },
})
