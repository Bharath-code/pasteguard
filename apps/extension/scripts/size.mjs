import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
const f = new URL('../.output/chrome-mv3/content-scripts/chat.js', import.meta.url)
const kb = gzipSync(await readFile(f)).length / 1024
console.log(`chat.js ${kb.toFixed(1)} KB gzip`)
if (kb > 25) process.exit(1)
