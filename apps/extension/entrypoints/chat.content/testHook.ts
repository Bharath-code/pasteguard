import { pickAdapter } from '../../adapters'

type Req = { __pgTest: 'req'; id: number; op: string; args: unknown[] }
type Op = (args: unknown[]) => unknown

const roots: ShadowRoot[] = []

export const exposeShadowRoot = (root: ShadowRoot): void => {
  roots.push(root)
}

const text = (els: HTMLElement[]) => els.map(e => e.innerText || e.textContent || '')
const adapter = () => pickAdapter(location.host)
const root = () => {
  const r = roots[roots.length - 1]
  if (!r) throw new Error('no shadow root exposed')
  return r
}
const rootAll = (sel: string) => [...root().querySelectorAll<HTMLElement>(sel)]

const readers: Record<string, (el: HTMLElement | undefined, arg: string) => unknown> = {
  text: el => el?.textContent ?? null,
  exists: el => !!el,
  attr: (el, a) => el?.getAttribute(a) ?? null,
  style: (el, p) => (el ? getComputedStyle(el).getPropertyValue(p) : null),
  rect: el => {
    const r = el?.getBoundingClientRect()
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
  },
}

const ops: Record<string, Op> = {
  adapterId: () => adapter().id,
  hasComposer: () => !!adapter().composer(),
  insert: ([t]) => {
    const a = adapter()
    const c = a.composer()
    return c ? a.insert(c, String(t)) : false
  },
  answers: () => text(adapter().answers()),
  userTurns: () => text(adapter().userTurns()),
  conversationId: () => adapter().conversationId(),
  'shadow.hosts': () => roots.length,
  'shadow.read': ([sel, reader, arg]) => {
    const fn = readers[String(reader)]
    if (!fn) throw new Error(`unknown reader ${String(reader)}`)
    return fn(rootAll(String(sel))[0], String(arg ?? ''))
  },
  'shadow.count': ([sel]) => rootAll(String(sel)).length,
  'shadow.texts': ([sel]) => rootAll(String(sel)).map(e => e.textContent ?? ''),
}

const isReq = (d: unknown): d is Req => typeof d === 'object' && d !== null && (d as Req).__pgTest === 'req'

export const installTestHook = (extra: Record<string, Op> = {}): void => {
  Object.assign(ops, extra)
  ;(globalThis as { __pgTestHook?: boolean }).__pgTestHook = true
  window.addEventListener('message', e => {
    if (e.source !== window || !isReq(e.data)) return
    const { id, op, args } = e.data
    const fn = ops[op]
    let result: unknown
    let error: string | undefined
    try {
      if (!fn) error = `unknown op ${op}`
      else result = fn(Array.isArray(args) ? args : [])
    } catch (err) {
      error = String(err)
    }
    window.postMessage({ __pgTest: 'res', id, result, error }, location.origin)
  })
}
