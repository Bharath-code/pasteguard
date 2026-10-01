import { createServer } from 'node:http'
import type { IncomingMessage } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.MOCK_PORT ?? 4323)
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }
const log: { text: string; page: string; t: number }[] = []

const body = (req: IncomingMessage): Promise<string> =>
  new Promise(resolve => {
    let s = ''
    req.on('data', d => (s += d))
    req.on('end', () => resolve(s))
  })

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`)
  if (url.pathname === '/health') return void res.writeHead(200).end('ok')
  if (url.pathname === '/log') {
    if (req.method === 'POST') {
      const raw = await body(req)
      const page = req.headers.referer ?? ''
      try {
        const j = JSON.parse(raw) as { text?: unknown }
        log.push({ text: String(j.text ?? ''), page, t: Date.now() })
      } catch {
        log.push({ text: raw, page, t: Date.now() })
      }
      return void res.writeHead(204).end()
    }
    if (req.method === 'DELETE') {
      log.length = 0
      return void res.writeHead(204).end()
    }
    return void res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(log))
  }
  const rel = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
  const file = join(root, rel)
  const type = types[extname(file)]
  if (!file.startsWith(root) || !type) return void res.writeHead(404).end('not found')
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(data)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(port, () => console.log(`mock chat on http://localhost:${port}`))
