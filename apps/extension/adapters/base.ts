import type { Adapter, SiteConfig } from './types'

const readText = (el: HTMLElement): string =>
  el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement ? el.value : (el.innerText ?? el.textContent ?? '')

const caretToEnd = (el: HTMLElement): void => {
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    el.setSelectionRange(el.value.length, el.value.length)
    return
  }
  const sel = el.ownerDocument.getSelection()
  if (!sel) return
  if (sel.rangeCount && el.contains(sel.anchorNode)) return
  const r = el.ownerDocument.createRange()
  r.selectNodeContents(el)
  r.collapse(false)
  sel.removeAllRanges()
  sel.addRange(r)
}

const syntheticPaste = (el: HTMLElement, text: string): void => {
  const data = new DataTransfer()
  data.setData('text/plain', text)
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
}

export const insertText = (el: HTMLElement, text: string): boolean => {
  el.focus()
  caretToEnd(el)
  const before = readText(el).length
  const landed = () => readText(el).length > before
  syntheticPaste(el, text)
  if (landed()) return true
  el.ownerDocument.execCommand('insertText', false, text)
  return landed()
}

const all = (sel: string): HTMLElement[] => {
  if (!sel) return []
  const hits = [...document.querySelectorAll<HTMLElement>(sel)]
  return hits.filter(h => !hits.some(o => o !== h && o.contains(h)))
}

export const makeAdapter = (c: SiteConfig): Adapter => ({
  id: c.id,
  composer: () => document.querySelector<HTMLElement>(c.composer),
  insert: insertText,
  answers: () => all(c.answers),
  userTurns: () => all(c.userTurns),
  conversationId: () => c.conversation.exec(location.pathname)?.[1] ?? null,
  isStreaming: el => !!c.streaming && (el.matches(c.streaming) || !!el.closest(c.streaming) || !!el.querySelector(c.streaming)),
})
