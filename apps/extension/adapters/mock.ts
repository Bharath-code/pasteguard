import { makeAdapter } from './base'

export const mock = /* @__PURE__ */ makeAdapter({
  id: 'mock',
  composer: '[data-composer]',
  answers: '[data-answer]',
  userTurns: '[data-user-turn]',
  conversation: /(?!)/,
  conversationId: () => document.body.dataset['conversation'] || null,
  streaming: '[data-streaming]',
  send: '[data-send]',
})
