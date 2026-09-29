import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractPackages } from './extract.mjs'

const names = text => extractPackages(text).map(p => `${p.ecosystem}:${p.name}`)

test('npm install variants, versions, scopes, flags', () => {
  assert.deepEqual(
    names('npm i -D zod@^3 @types/node\nyarn add react-dom\npnpm add @hono/zod-validator@1.2.0 --save-exact\nbun add hono'),
    ['npm:zod', 'npm:@types/node', 'npm:react-dom', 'npm:@hono/zod-validator', 'npm:hono'],
  )
})

test('npm skips paths, urls, git shorthands, aliases', () => {
  assert.deepEqual(names('npm install ./local file:../x github:user/repo user/repo npm:foo@1 https://x.io/a.tgz'), [])
})

test('pip variants, extras, specifiers, value flags, normalization', () => {
  assert.deepEqual(
    names('pip install -r requirements.txt "fastapi[all]>=0.110" Requests==2.31 --index-url https://x.io/simple\npython -m pip install -U Pillow\nuv add pydantic_settings\npoetry add httpx'),
    ['pypi:fastapi', 'pypi:requests', 'pypi:pillow', 'pypi:pydantic-settings', 'pypi:httpx'],
  )
})

test('pip skips editable, git and wheels', () => {
  assert.deepEqual(names('pip install -e . git+https://github.com/a/b.git dist/x-1.0.whl'), [])
})

test('package.json dependency keys, dedupe across sources, stops at shell separators', () => {
  const text = '```json\n{ "dependencies": { "express": "^4", "@acme/ui": "1.0.0" } }\n```\nnpm i express && node app.js # comment npm i fake'
  assert.deepEqual(names(text), ['npm:express', 'npm:@acme/ui'])
})

test('ignores placeholders', () => {
  assert.deepEqual(names('npm install <package-name>\npip install $PKG'), [])
})

test('classify', async () => {
  const { classify } = await import('./study.mjs')
  const now = Date.parse('2026-09-29')
  assert.equal(classify({ exists: false }, now), 'hallucinated')
  assert.equal(classify({ exists: true, created: '2026-09-01', weeklyDownloads: 12 }, now), 'suspicious')
  assert.equal(classify({ exists: true, created: '2026-09-01', weeklyDownloads: 90000 }, now), 'real')
  assert.equal(classify({ exists: true, created: '2015-01-01', weeklyDownloads: 3 }, now), 'real')
  assert.equal(classify({ error: 500 }, now), 'unknown')
})
