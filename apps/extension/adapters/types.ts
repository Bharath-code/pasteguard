export type AdapterId = 'chatgpt' | 'claude' | 'gemini' | 'generic' | 'mock'

export interface Adapter {
  id: AdapterId
  composer(): HTMLElement | null
  insert(el: HTMLElement, text: string): boolean
  read(el: HTMLElement): string
  replace(el: HTMLElement, text: string): boolean
  send(): boolean
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
  send: string
  conversationId?: () => string | null
}
