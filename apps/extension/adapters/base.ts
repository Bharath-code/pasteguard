import type { Adapter, SiteConfig } from './types'

export const readText = (el: HTMLElement): string =>
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

const syntheticPaste = (el: HTMLElement, text: string): boolean => {
  const data = new DataTransfer()
  data.setData('text/plain', text)
  const ev = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true })
  el.dispatchEvent(ev)
  return ev.defaultPrevented
}

const squash = (s: string): string => s.replace(/\s+/g, ' ').trim()

const HUGE = 256 * 1024

const setRangeInsert = (el: HTMLTextAreaElement | HTMLInputElement, text: string): boolean => {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  el.setRangeText(text, start, end, 'end')
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste' }))
  return true
}

export const insertText = (el: HTMLElement, text: string): boolean => {
  el.focus()
  if (text.length > HUGE && (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) {
    caretToEnd(el)
    return setRangeInsert(el, text)
  }
  caretToEnd(el)
  const before = readText(el)
  const needle = squash(text)
  const landed = () => {
    const after = readText(el)
    return after !== before && squash(after).includes(needle)
  }
  if (syntheticPaste(el, text)) return true
  if (landed()) return true
  el.ownerDocument.execCommand('insertText', false, text)
  return landed()
}

export const replaceText = (el: HTMLElement, text: string): boolean => {
  el.focus()
  const field = el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement
  if (field) el.select()
  else {
    const sel = el.ownerDocument.getSelection()
    const r = el.ownerDocument.createRange()
    r.selectNodeContents(el)
    sel?.removeAllRanges()
    sel?.addRange(r)
    if (syntheticPaste(el, text)) return true
  }
  el.ownerDocument.execCommand('insertText', false, text)
  return squash(readText(el)) === squash(text)
}

const all = (sel: string): HTMLElement[] => {
  if (!sel) return []
  const out: HTMLElement[] = []
  let outer: HTMLElement | undefined
  for (const el of document.querySelectorAll<HTMLElement>(sel)) {
    if (outer?.contains(el)) continue
    out.push((outer = el))
  }
  return out
}

export const makeAdapter = (c: SiteConfig): Adapter => ({
  id: c.id,
  composer: () => document.querySelector<HTMLElement>(c.composer),
  insert: insertText,
  read: readText,
  replace: replaceText,
  send: () => {
    const b = c.send ? document.querySelector<HTMLElement>(c.send) : null
    b?.click()
    return !!b
  },
  answers: () => all(c.answers),
  userTurns: () => all(c.userTurns),
  conversationId: c.conversationId ?? (() => c.conversation.exec(location.pathname)?.[1] ?? null),
  isStreaming: el => !!c.streaming && (el.matches(c.streaming) || !!el.closest(c.streaming) || !!el.querySelector(c.streaming)),
})
