type Child = string | Node | null | false | undefined | Child[]
type Props = Record<string, unknown> & { dataset?: Record<string, string> }

const SVG = new Set(['svg', 'path', 'rect'])

export function h(tag: string, props: Props = {}, ...children: Child[]): HTMLElement {
  const el = SVG.has(tag) ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue
    if (k === 'dataset') Object.assign((el as HTMLElement).dataset, v)
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener)
    else el.setAttribute(k, v === true ? '' : String(v))
  }
  const add = (c: Child): void => {
    if (Array.isArray(c)) c.forEach(add)
    else if (typeof c === 'string') el.append(document.createTextNode(c))
    else if (c) el.append(c)
  }
  children.forEach(add)
  return el as HTMLElement
}
