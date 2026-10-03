import { makeAdapter } from './base'

export const generic = makeAdapter({
  id: 'generic',
  composer: '[contenteditable=true], textarea',
  answers: '',
  userTurns: '',
  conversation: /(?!)/,
  streaming: '',
  send: '',
})
