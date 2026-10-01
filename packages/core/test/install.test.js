import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseInstalls } from '../src/install.js'
/** @param {string} c */
const names = c => parseInstalls(c).map(p => `${p.eco}:${p.name}`)

test('npm family', () => {
  assert.deepEqual(names('npm i zod @scope/pkg@1.2.0 -D'), ['npm:zod', 'npm:@scope/pkg'])
  assert.deepEqual(names('pnpm add -D p-retry\nyarn add left-pad@^1\nbun add hono'), ['npm:p-retry', 'npm:left-pad', 'npm:hono'])
  assert.deepEqual(names('npm install --save-dev typescript'), ['npm:typescript'])
})
test('python family', () => {
  assert.deepEqual(names('pip install fastapi-authx==0.1 "uvicorn[standard]>=0.30"'), ['pypi:fastapi-authx', 'pypi:uvicorn'])
  assert.deepEqual(names('uv add httpx\npip3 install -U requests\npython -m pip install rich'), ['pypi:httpx', 'pypi:requests', 'pypi:rich'])
})
test('ignores non-registry sources and imports', () => {
  assert.deepEqual(names('pip install -r requirements.txt\npip install ./local\nnpm i github:user/repo\nimport numpy as np\nnpm i https://x.y/z.tgz'), [])
})
test('handles $ prompts, line continuations and && chains', () => {
  assert.deepEqual(names('$ npm i a \\\n  b && pip install c'), ['npm:a', 'npm:b', 'pypi:c'])
})
test('offsets point at the name', () => {
  const [p] = parseInstalls('npm i zod'); assert.equal('npm i zod'.slice(p.start, p.end), 'zod')
})
test('offsets index the original string across continuations, quotes and scopes', () => {
  const src = '$ npm i a \\\n  @s/b@2 && pip install "uvicorn[standard]>=0.30" c'
  const got = parseInstalls(src)
  assert.equal(got.length, 4)
  for (const p of got) assert.equal(src.slice(p.start, p.end), p.name)
})
test('never parses import, require or from-import lines', () => {
  assert.deepEqual(names('import requests\nfrom flask import Flask\nconst x = require("left-pad")\nimport zod from "zod"'), [])
})
test('value flags and uv pip, poetry', () => {
  assert.deepEqual(names('pip install -i https://x/simple -c cons.txt foo\nuv pip install bar\npoetry add baz'), ['pypi:foo', 'pypi:bar', 'pypi:baz'])
  assert.deepEqual(names('pip install git+https://x/y.git file:./z'), [])
})
