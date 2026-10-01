import { AI_MATCHES } from '../../src/shared/sites'

export default defineContentScript({
  matches: import.meta.env.MODE === 'production' ? AI_MATCHES : [...AI_MATCHES, 'http://localhost/*'],
  runAt: 'document_start',
  allFrames: false,
  main() {},
})
