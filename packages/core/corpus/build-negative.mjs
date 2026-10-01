import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { seeded } from './positive.js'

const out = new URL('./negative/', import.meta.url)
mkdirSync(out, { recursive: true })
const rnd = seeded(7)
const L = 'abcdefghijklmnopqrstuvwxyz', D = '0123456789', U = L.toUpperCase()
const pick = (set, n) => Array.from({ length: n }, () => set[Math.floor(rnd() * set.length)]).join('')
const hex = n => pick('0123456789abcdef', n)
const b64 = n => pick(U + L + D + '+/', n)
const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${pick('89ab', 1)}${hex(3)}-${hex(12)}`
const one = a => a[Math.floor(rnd() * a.length)]
const write = (name, text) => writeFileSync(new URL(name, out), text)

const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim()
const files = execFileSync('git', ['ls-files'], { cwd: root }).toString().split('\n')
  .filter(f => /\.(md|js|mjs|html)$/.test(f) && !f.includes('corpus/') && !/(^|\/)test\/|\.test\./.test(f) && !f.includes('node_modules'))
const AWS_DOC_KEY = 'AKIA' + 'IOSFODNN7EXAMPLE'
const bucket = { md: [], js: [], html: [] }
for (const f of files) {
  const t = readFileSync(`${root}/${f}`, 'utf8')
  if (t.includes(AWS_DOC_KEY)) continue
  bucket[f.endsWith('.md') ? 'md' : f.endsWith('.html') ? 'html' : 'js'].push(t)
}
for (const [k, v] of Object.entries(bucket)) write(`repo-${k}.txt`, v.join('\n'))

const words = ['alpha', 'beta', 'core', 'util', 'stream', 'parse', 'merge', 'lodash', 'react', 'left-pad', 'chalk', 'debug', 'semver', 'glob']
let lock = '{\n  "name": "sample-app",\n  "lockfileVersion": 3,\n  "packages": {\n'
const pk = []
for (let i = 0; i < 3500; i++) {
  const n = `${one(words)}-${one(words)}${i}`
  pk.push(`    "node_modules/${n}": {\n      "version": "${1 + (i % 9)}.${i % 40}.${i % 7}",\n      "resolved": "https://registry.npmjs.org/${n}/-/${n}-1.0.0.tgz",\n      "integrity": "sha512-${b64(86)}==",\n      "dev": true,\n      "license": "MIT"\n    }`)
}
write('package-lock.sample.json', lock + pk.join(',\n') + '\n  }\n}\n')

write('uuids.sample.txt', Array.from({ length: 5000 }, uuid).join('\n') + '\n')
write('git-shas.sample.txt', Array.from({ length: 5000 }, () => hex(40)).join('\n') + '\n')
write('sha256.sample.txt', Array.from({ length: 2000 }, () => hex(64)).join('\n') + '\n')
write('png-base64.sample.txt', 'data:image/png;base64,iVBORw0KGgo' + b64(200000) + '\n')

const paths = ['/', '/index.html', '/api/v1/users', '/static/app.js', '/login', '/health', '/docs/getting-started']
write('nginx-access.sample.log', Array.from({ length: 5000 }, (_, i) =>
  `${10 + (i % 200)}.${i % 256}.${(i * 7) % 256}.${(i * 13) % 256} - - [30/Sep/2026:10:${String(i % 60).padStart(2, '0')}:${String((i * 3) % 60).padStart(2, '0')} +0000] "GET ${one(paths)}?req=${uuid()} HTTP/1.1" ${one([200, 200, 304, 404, 500])} ${100 + (i * 37) % 9000} "-" "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0" rid=${hex(32)}`).join('\n') + '\n')

write('python-traceback.sample.txt', Array.from({ length: 1200 }, (_, i) =>
  `Traceback (most recent call last):\n  File "/srv/app/handlers/${one(words)}.py", line ${10 + i % 300}, in handle\n    result = process(payload["token_count"], request_id="${uuid()}")\n  File "/usr/lib/python3.12/site-packages/${one(words)}/core.py", line ${i % 500}, in process\n    raise ValueError("bad value at offset 0x${hex(8)}")\nValueError: bad value at offset 0x${hex(8)}\n`).join('\n'))

write('k8s.sample.yaml', Array.from({ length: 400 }, (_, i) =>
  `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: svc-${i}\n  namespace: prod\n  labels:\n    app: svc-${i}\n    tags.datadoghq.com/service: svc-${i}\n    release: ${uuid()}\nspec:\n  replicas: 3\n  template:\n    metadata:\n      annotations:\n        ad.datadoghq.com/svc.checks: '{"http_check": {"instances": [{"url": "http://%%host%%:8080/health"}]}}'\n    spec:\n      containers:\n        - name: svc\n          image: registry.example.com/svc-${i}@sha256:${hex(64)}\n          env:\n            - name: LOG_LEVEL\n              value: info\n            - name: TOKEN_TTL_SECONDS\n              value: "3600"\n            - name: DISCORD_CHANNEL_ID\n              value: "${num18()}"\n          resources:\n            limits: { cpu: 500m, memory: 256Mi }\n---\n`).join(''))
function num18() { return pick(D, 18) }
