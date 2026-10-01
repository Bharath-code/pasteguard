import { makeAdapter } from './base'

export const gemini = makeAdapter({
  id: 'gemini',
  composer: 'rich-textarea .ql-editor[contenteditable="true"], div.ql-editor[contenteditable="true"]',
  answers: 'model-response, .model-response-text',
  userTurns: 'user-query, .query-text',
  conversation: /\/app\/([A-Za-z0-9]+)/,
  streaming: '[aria-busy="true"], .pending',
})
