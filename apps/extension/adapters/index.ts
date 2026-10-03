import { chatgpt } from './chatgpt'
import { claude } from './claude'
import { gemini } from './gemini'
import { generic } from './generic'
import { mock } from './mock'
import type { Adapter } from './types'

export type { Adapter, AdapterId } from './types'

export const pickAdapter = (host: string): Adapter => {
  const h = host.toLowerCase().split(':')[0] ?? ''
  if (h === 'chatgpt.com' || h.endsWith('.chatgpt.com')) return chatgpt
  if (h === 'claude.ai' || h.endsWith('.claude.ai')) return claude
  if (h === 'gemini.google.com') return gemini
  if (import.meta.env.MODE === 'development' && h === 'localhost' && new URLSearchParams(location.search).get('adapter') !== 'generic') return mock
  return generic
}
