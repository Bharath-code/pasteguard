import { makeAdapter } from './base'

export const claude = makeAdapter({
  id: 'claude',
  composer: '[data-testid="chat-input"], div.ProseMirror[contenteditable="true"]',
  answers: '.font-claude-response, [data-testid="assistant-message"]',
  userTurns: '[data-testid="user-message"]',
  conversation: /\/chat\/([A-Za-z0-9-]+)/,
  streaming: '[data-is-streaming="true"]',
  send: 'button[aria-label="Send message"]',
})
