import { makeAdapter } from './base'

export const chatgpt = makeAdapter({
  id: 'chatgpt',
  composer: '#prompt-textarea, div.ProseMirror[contenteditable="true"]',
  answers: '[data-message-author-role="assistant"]',
  userTurns: '[data-message-author-role="user"]',
  conversation: /\/c\/([A-Za-z0-9-]+)/,
  streaming: '.result-streaming',
  send: '[data-testid="send-button"]',
})
