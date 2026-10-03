import { AI_MATCHES } from '../src/shared/sites'

export default defineContentScript({
  matches: import.meta.env.MODE === 'production' ? AI_MATCHES : [...AI_MATCHES, 'http://localhost/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const proto = Clipboard.prototype
    const { writeText, write } = proto
    const tagged = (s: string): boolean => /PG_SECRET_\d/.test(s)
    const emit = (detail: string): void => void document.dispatchEvent(new CustomEvent('pg-copy', { detail }))
    const lock = (name: 'writeText' | 'write', value: unknown): void =>
      void Object.defineProperty(proto, name, { value, writable: false, configurable: false, enumerable: true })
    lock('writeText', function (this: Clipboard, data: unknown): Promise<void> {
      const s = String(data)
      if (!tagged(s)) return writeText.call(this, s)
      emit(s)
      return Promise.resolve()
    })
    lock('write', async function (this: Clipboard, items: ClipboardItems): Promise<void> {
      for (const item of items) {
        if (!item.types.includes('text/plain')) continue
        const s = await (await item.getType('text/plain')).text()
        if (!tagged(s)) continue
        emit(s)
        return
      }
      return write.call(this, items)
    })
  },
})
