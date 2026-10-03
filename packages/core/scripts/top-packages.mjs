import { writeFile } from 'node:fs/promises'

const N = Number(process.argv[2] ?? 4200)
const PYPI = 'https://hugovk.github.io/top-pypi-packages/top-pypi-packages.min.json'
const NPM = 'https://unpkg.com/npm-high-impact/lib/top.js'
const out = new URL('../data/', import.meta.url)

/** @param {string} url */
const get = async url => {
  const r = await fetch(url, { redirect: 'follow' })
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  return r.text()
}

const [pypiText, npmText] = await Promise.all([get(PYPI), get(NPM)])

const pypiJson = JSON.parse(pypiText)
const pypi = pypiJson.rows.slice(0, N).map((/** @type {{project: string}} */ r) => r.project.toLowerCase().replace(/[_.]+/g, '-'))
const npm = [...npmText.matchAll(/^\s*'([^']+)',?\s*$/gm)].map(m => m[1].toLowerCase()).slice(0, N)

const uniqSorted = (/** @type {string[]} */ a) => [...new Set(a)].sort()
await writeFile(new URL('top-npm.json', out), JSON.stringify(uniqSorted(npm)) + '\n')
await writeFile(new URL('top-pypi.json', out), JSON.stringify(uniqSorted(pypi)) + '\n')
await writeFile(new URL('top-meta.json', out), JSON.stringify({
  fetchedAt: new Date().toISOString().slice(0, 10),
  count: N,
  sources: { npm: NPM + ' (npm-high-impact, MIT)', pypi: PYPI + ' (hugovk/top-pypi-packages, last_update ' + pypiJson.last_update + ')' },
}, null, 2) + '\n')
console.log('npm', npm.length, 'pypi', pypi.length)
