export type AdapterId = 'chatgpt' | 'claude' | 'gemini' | 'generic'

export interface Adapter {
  id: AdapterId
  composer(): HTMLElement | null
  insert(el: HTMLElement, text: string): boolean
  answers(): HTMLElement[]
  userTurns(): HTMLElement[]
  conversationId(): string | null
  isStreaming(el: HTMLElement): boolean
}

export interface SiteConfig {
  id: AdapterId
  composer: string
  answers: string
  userTurns: string
  conversation: RegExp
  streaming: string
}
