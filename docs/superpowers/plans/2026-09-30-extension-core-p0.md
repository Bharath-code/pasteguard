# PasteGuard extension core (P0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the P0 public build of PasteGuard to the Chrome Web Store: paste guard, reversible restore, copy-returns-real-values, package check, chat-leak scan, toolbar/popup/welcome/options, on chatgpt.com, claude.ai and gemini.google.com.

**Architecture:** Pure, dependency-free logic lives in `packages/core` (detect, redact, placeholder matching, install-command parsing, verdicts, typosquat, rotate links) and runs in Node, the extension and the landing page. The WXT extension has one isolated-world content script (adapters → guard, restorer, package scanner, UI host in a closed shadow root), one ~40-line MAIN-world clipboard shim that holds nothing, and a service worker that owns storage, the vault mirror, registry fetches and the badge. Real values never leave isolated-world memory and `chrome.storage.session`.

**Tech Stack:** Node ≥ 22, `node --test`, WXT (MV3, Vite), TypeScript `strict`, Preact + `@preact/signals` (extension pages only), `zod/mini` (SW + pages only), Playwright (E2E against mock chat pages), plain CSS tokens from `DESIGN.md`, GitHub Actions.

**Spec (read both before any task):**
- `.claudedocs/extension-prd-architecture.md` (PRD, stack, trust boundaries, data model, flows)
- `apps/extension/design/index.html` (surfaces A–I, motion tokens, a11y, budgets, state matrix, voice) — **binding**
- `.claudedocs/extension-spike-report.md` (the three design changes: light-DOM placeholder in `<pg-v>`, wrap `write` + `writeText`, isolated `copy` handler with range extension)
- `.claudedocs/extension-decision-report.md` §9 (kill criteria), §11 (feasibility, hard limits)
- `CLAUDE.md`, `DESIGN.md`

## Decisions this plan locks (flag in review if you disagree)

| # | Decision | Source |
|---|---|---|
| D1 | `packages/core` is plain ESM `.js` with JSDoc types, type-checked by `tsc --checkJs --strict`. Keeps `node --test` zero-build and lets the landing page copy `detect.js` verbatim. | PRD §3 "zero deps, pure functions"; CLAUDE.md "landing stays dependency-free" |
| D2 | Vault is mirrored to `chrome.storage.session` keyed by tab and survives reload; cleared on `tabs.onRemoved` and browser quit. The state-matrix row becomes "Value cleared when the tab closed". Design doc is updated in Task 14. | PRD §4 "Open decision: vault on reload" (recommended) |
| D3 | Personal-data rules (email, phone, Aadhaar, PAN) are **off** by default; cards stay on (Luhn). | PRD §2 "Default rule set" |
| D4 | Service worker calls npm/PyPI directly; no Worker proxy in P0 ($0 infra). Decision report §9 mentions a proxy; the PRD (newer) supersedes it. | PRD §6 CFO row |
| D5 | Team build (`webNavigation`, `management`, `identity.email`, managed storage) is **out of scope**. `wxt.config.ts` reads `mode` but only `public` exists until the day-60 gate. | PRD §2 P2, decision report §9 |
| D6 | Allow-list check happens after `preventDefault`: detect is sync, hashing is async (`crypto.subtle`), insertion awaits the hash filter. The page never sees the original either way. | PRD §1c + §2 item 7 |
| D7 | Positive-corpus secrets are **generated at test time** from per-rule templates, never committed, so GitHub push protection and secret scanners don't flag the repo. | Practical constraint |

## Global Constraints

- Node ≥ 22. Tests use `node --test`; no test frameworks in `packages/core`. Playwright only for extension E2E.
- Runtime dependencies in the extension: **Preact, @preact/signals, zod only**. Everything else dev-only. Pin exact versions, commit the lockfile.
- MV3, no remote code, no remote fonts, **0 network requests on AI pages**. `externally_connectable`: none. `web_accessible_resources`: none.
- Host permissions (public build), exactly: `https://chatgpt.com/*`, `https://claude.ai/*`, `https://gemini.google.com/*`, `https://registry.npmjs.org/*`, `https://api.npmjs.org/*`, `https://pypi.org/*`. Never `<all_urls>`. API permissions: `storage` only (content-script senders give us `sender.tab`; host permissions expose AI-tab URLs to the popup).
- Never `innerHTML`/`outerHTML`/`insertAdjacentHTML`/`eval`/`new Function` (ESLint `no-restricted-properties` + `no-restricted-syntax`). Build DOM with `createElement` + `textContent`.
- Never log, store or display secret values outside the user's own conversation. Our UI names secret **types** only. `console.*` stripped in production (`esbuild.drop: ['console']`).
- Placeholders: `PG_SECRET_n`, `n` ≥ 1, unique per tab. Regex: `/PG_SECRET_(\d+)/g`.
- In-page UI: one host element per page, **closed** shadow root, `:host { all: initial }`, `popover="manual"`, always paper surface, system font stack.
- Motion tokens (verbatim from design doc): `--ease-out: cubic-bezier(.23,1,.32,1)`, `--ease-in-out: cubic-bezier(.77,0,.175,1)`, `--d-press: 120ms`, `--d-pop: 180ms`, `--d-exit: 120ms`, `--d-tape: 260ms`, `--d-peel: 320ms`, `--d-hold: 1200ms`. Animate only transform/opacity/clip-path/filter. No `transition: all`. Never from `scale(0)`. Keyboard actions never animate. `prefers-reduced-motion`: keep opacity/blur, drop movement.
- Budgets (CI-enforced where marked ✱): content script ≤ 25 KB gzip ✱; detect 10 KB ≤ 5 ms p95 ✱; idle on AI page 0 timers, 1 observer; restore ≤ 2 ms per mutation, 50 ms debounce; package verdict ≤ 600 ms, cached 24 h; popup first paint ≤ 100 ms.
- Accuracy gates ✱: recall ≥ 98% per rule and ≥ 99% overall on positive corpus; ≤ 1 false positive per MB of negative corpus.
- Copy: all user-facing strings go through `chrome.i18n` (`_locales/en/messages.json`). Sentence case, no all-caps, no arrows in buttons. Use the design doc Voice table verbatim (e.g. "2 secrets taped: Stripe key, AWS key", "Restored on this screen only", "Not on npm", "Registered 4 days ago", "All quiet on this tab", "Sent with 2 secrets. Rotate the Stripe key."). Numbers via `Intl.NumberFormat`, relative dates via `Intl.RelativeTimeFormat`. UI tolerates +40% string length. Logical CSS properties only.
- A11y: WCAG 2.2 AA. Chip `role=status aria-live=polite`; exposed send uses `assertive` (the only one). Targets ≥ 24 px (≥ 44 px on welcome/uninstall). Color never the only signal. Forced-colors: outlines on pills.
- Mock sites in tests/docs use `chat.example.ai`-style names, never real brands.
- Commit after every task. Messages: imperative, what + why. End with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

Failure modes the spec implies but no happy-path test hits. Each has a test in its owning task.

1. **Placeholder split across streaming chunks** (`PG_SEC` arrives, then `RET_1`): expect no partial swap and a correct swap once complete. → Task 4 (`match` unit test) + Task 14 (E2E streaming mock).
2. **Adapter insert fails on a redesigned site** (both synthetic paste and `execCommand` do nothing): expect the original never lands, the taped text is put on the clipboard, and the fallback toast says so. → Task 10.
3. **Page forges `pg-copy` / calls the shim without a user gesture**: expect no clipboard write and no value echoed to page world. → Task 15.
4. **Huge paste (5 MB log with one key at the end)**: expect the key redacted, no long task > 50 ms, and the chip shown. → Task 10.
5. **Same secret pasted twice in one tab, and in two tabs**: expect the same `PG_SECRET_n` within a tab, independent numbering across tabs, and tab close purges only that tab. → Task 3 (unit) + Task 8 (SW vault).

---

## File structure

```
package.json                      npm workspaces: packages/*, apps/*
.github/workflows/ci.yml          core tests, gates, typecheck, lint, build, size, E2E
packages/core/
  package.json  jsconfig.json
  src/detect.js                   RULES + detect(text, opts) + redact(text, hits, state) — single file, copied to landing
  src/rules-extra.js              gitleaks-derived rules, keyword prefilters (imported by detect.js)
  src/entropy.js                  shannon(s)
  src/hash.js                     sha256Hex(s) (async, crypto.subtle)
  src/match.js                    findPlaceholders(segments)
  src/install.js                  parseInstalls(code)
  src/typosquat.js                nearest(name, eco) with top-N lists
  src/verdict.js                  verdict(registryFacts)
  src/rotate.js                   rotateUrl(type)
  data/top-npm.json data/top-pypi.json
  scripts/top-packages.mjs        regenerates data/*.json
  test/*.test.js
  corpus/negative/*               committed real-world non-secret text
  corpus/positive.js              per-rule generators (no literal keys committed)
  bench/gates.mjs                 recall / FP / p95 gates, exits 1 on fail
apps/extension/
  package.json  wxt.config.ts  tsconfig.json  eslint.config.js
  public/_locales/en/messages.json  public/icon/{idle,active,paused}-{16,32,48,128}.png
  src/shared/messages.ts          message types + zod/mini schemas
  src/shared/storage.ts           Settings/Stats/PkgCache schemas + read-with-migration
  src/shared/i18n.ts              t(key, subs)
  entrypoints/background.ts       SW: router, vault mirror, badge/icon, registry, stats, install/uninstall
  entrypoints/chat.content/index.ts   wires adapter → guard/restore/packages/leakscan/ui
  entrypoints/chat.content/vault.ts   TabVault (in-memory, sync)
  entrypoints/chat.content/guard.ts   paste guard
  entrypoints/chat.content/restore.ts restorer + <pg-v>
  entrypoints/chat.content/copy.ts    pg-copy relay + native copy handler
  entrypoints/chat.content/packages.ts package scanner
  entrypoints/chat.content/leakscan.ts chat-leak scan
  entrypoints/clipboard.content.ts   world: MAIN shim
  entrypoints/popup/  entrypoints/options/  entrypoints/welcome/
  adapters/types.ts adapters/{chatgpt,claude,gemini,generic}.ts adapters/index.ts
  ui/h.ts ui/host.ts ui/chip.ts ui/verdict.ts ui/toast.ts ui/tokens.css ui/inpage.css
  e2e/fixtures.ts e2e/mock/{prosemirror,textarea,contenteditable}.html e2e/*.spec.ts
  scripts/size.mjs                gzip budget check
apps/landing/
  public/detect.js                COPY of packages/core/src/detect.js (+ rules-extra.js), via `npm run sync`
  public/bye/index.html  functions/api/bye.js  public/what-we-see/index.html
```

---

## Milestone M0 — Core logic (`packages/core`)

### Task 1: Workspace, move detection into `packages/core`, CI skeleton

**Files:**
- Create: `package.json`, `packages/core/package.json`, `packages/core/jsconfig.json`, `.github/workflows/ci.yml`
- Move: `apps/landing/public/detect.js` → `packages/core/src/detect.js`; `apps/landing/test/detect.test.mjs` → `packages/core/test/detect.test.js`
- Modify: `apps/landing/package.json` (add `sync`), `apps/extension/design/index.html:808` (import path unchanged — landing copy still exists), `CLAUDE.md` (layout row)

**Interfaces:**
- Produces: `packages/core/src/detect.js` exports `detect(text)`, `redact(text, hits?)` (unchanged API for now); `npm test -w packages/core`; `npm run sync -w apps/landing` copies core → `apps/landing/public/detect.js`.

- [ ] **Step 1: Root workspace**

```json
{
  "name": "pasteguard",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "engines": { "node": ">=22" },
  "scripts": { "test": "npm test --workspaces --if-present" }
}
```

- [ ] **Step 2: Core package**

`packages/core/package.json`:
```json
{
  "name": "@pasteguard/core",
  "private": true,
  "type": "module",
  "exports": { "./*": "./src/*.js" },
  "scripts": {
    "test": "node --test test/",
    "typecheck": "tsc -p jsconfig.json",
    "gates": "node bench/gates.mjs"
  },
  "devDependencies": { "typescript": "5.9.3" }
}
```
`packages/core/jsconfig.json`:
```json
{ "compilerOptions": { "checkJs": true, "strict": true, "noEmit": true, "module": "nodenext", "target": "es2024", "lib": ["es2024", "dom"] }, "include": ["src", "test"] }
```

- [ ] **Step 3: Move files with history**

```bash
mkdir -p packages/core/src packages/core/test
git mv apps/landing/public/detect.js packages/core/src/detect.js
git mv apps/landing/test/detect.test.mjs packages/core/test/detect.test.js
sed -i '' "s#'../public/detect.js'#'../src/detect.js'#" packages/core/test/detect.test.js
```

- [ ] **Step 4: Landing sync script + drift test**

`apps/landing/package.json` scripts: `"sync": "cp ../../packages/core/src/detect.js public/detect.js"`, and change `"test"` to `"npm run sync && node --test test/"`. Add `apps/landing/test/sync.test.mjs`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('landing detect.js is an exact copy of core', async () => {
  const [a, b] = await Promise.all([
    readFile(new URL('../public/detect.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../packages/core/src/detect.js', import.meta.url), 'utf8'),
  ])
  assert.equal(a, b)
})
```
Run `npm run sync -w apps/landing`. (Task 2 turns `detect.js` into two files; update `sync` to copy both then.)

- [ ] **Step 5: CI**

`.github/workflows/ci.yml`:
```yaml
name: ci
on: [push, pull_request]
jobs:
  core:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test -w packages/core
      - run: npm run typecheck -w packages/core
      - run: npm test -w apps/landing
```

- [ ] **Step 6: Verify**

Run: `npm install && npm test`
Expected: 4 core tests pass, sync test passes. Open preview `ext-design`, paste the sample `.env` in the core-loop demo, confirm it still tapes (design doc imports the landing copy).

- [ ] **Step 7: Update CLAUDE.md** — `detect.js` row: "`packages/core/src/detect.js` is the single source of truth; `apps/landing/public/detect.js` is a synced copy (`npm run sync`)."

- [ ] **Step 8: Commit** — `git commit -m "Move detection into packages/core and add CI"`

**Acceptance criteria**
- [ ] `npm test` at root is green on Node 22 locally and in CI.
- [ ] `git log --follow packages/core/src/detect.js` shows the old history.
- [ ] Landing page and design doc demos behave exactly as before (manual check, console clean).
- [ ] Editing core without running `sync` fails `npm test -w apps/landing`.

---

### Task 2: Production rule set, prefilters, entropy, PII toggle, custom rules

**Files:**
- Create: `packages/core/src/rules-extra.js`, `packages/core/src/entropy.js`, `packages/core/test/rules.test.js`
- Modify: `packages/core/src/detect.js`, `apps/landing/package.json` (`sync` copies `rules-extra.js` + `entropy.js` too)

**Interfaces:**
- Produces:
  - `detect(text: string, opts?: { pii?: boolean, extra?: {type:string, re:RegExp}[] }): Hit[]`
  - `type Hit = { start: number, end: number, type: string, value: string, rule: string }` (`rule` = stable id, e.g. `aws-access-key`, used for corpus and rotate links)
  - `RULES: Rule[]` exported, `type Rule = { id, type, re, group?, check?, keywords?: string[], pii?: true }`
  - `shannon(s: string): number` (bits/char)

- [ ] **Step 1: Failing tests** (`packages/core/test/rules.test.js`)

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detect, RULES } from '../src/detect.js'
import { shannon } from '../src/entropy.js'

test('pii rules are off by default and on with opts.pii', () => {
  assert.equal(detect('mail jane@acme.io').length, 0)
  assert.equal(detect('mail jane@acme.io', { pii: true })[0].type, 'Email address')
})

test('cards stay on by default (luhn)', () => {
  assert.equal(detect('4242 4242 4242 4242')[0].rule, 'card')
})

test('every rule has a unique id, a type and a global regex', () => {
  const ids = new Set()
  for (const r of RULES) {
    assert.ok(r.id && r.type, r.id)
    assert.ok(r.re.global, `${r.id} needs /g`)
    assert.ok(!ids.has(r.id), `dup ${r.id}`); ids.add(r.id)
  }
})

test('keyword prefilter skips a rule when none of its keywords appear', () => {
  const r = RULES.find(r => r.keywords?.length)
  assert.ok(r, 'at least one rule uses keywords')
  assert.equal(detect('nothing relevant here '.repeat(50)).length, 0)
})

test('generic assignment rule needs entropy', () => {
  assert.equal(detect('PASSWORD=aaaaaaaaaaaa').length, 0)
  assert.equal(detect('PASSWORD=Xk9#mQ2$vL7pR4').length, 1)
})

test('custom rules run and cannot hang on bad input', () => {
  const hits = detect('token acme_svc_9f2kq81xz', { extra: [{ type: 'Acme key', re: /acme_svc_[a-z0-9]{8,}/g }] })
  assert.equal(hits[0].type, 'Acme key')
})

test('shannon', () => {
  assert.equal(shannon('aaaa'), 0)
  assert.ok(shannon('Xk9#mQ2$vL7pR4') > 3.5)
})
```

- [ ] **Step 2: Run** `npm test -w packages/core` → FAIL (`RULES` not exported, `entropy.js` missing).

- [ ] **Step 3: Implement**

`packages/core/src/entropy.js`:
```js
/** @param {string} s */
export function shannon(s) {
  const f = new Map()
  for (const c of s) f.set(c, (f.get(c) ?? 0) + 1)
  let h = 0
  for (const n of f.values()) { const p = n / s.length; h -= p * Math.log2(p) }
  return h
}
```

`packages/core/src/rules-extra.js`: port from gitleaks `config/gitleaks.toml` (MIT, keep the license header and a link to the commit you ported from). Include at least: GitHub (fine-grained, app, oauth), GitLab PAT, Slack (bot, user, webhook URL), Twilio, SendGrid, Mailgun, npm token, PyPI token, Discord bot, Heroku, DigitalOcean, Shopify, Square, Azure storage key, GCP service-account JSON (`"private_key_id"`), Hugging Face, Cloudflare API token, Datadog, Linear, Notion, Supabase service key, Vercel, Doppler, 1Password service account, Postman, Atlassian. Rules for conversion:
- Go `(?i)` prefix → JS `i` flag on the whole regex. Mid-pattern `(?i)` → expand the literal to `[Aa][Bb]…`.
- Every regex gets `g` (and `d` when it uses `group`).
- Set `keywords` from gitleaks' `keywords` array (lowercase). Detection lowercases the input once and skips a rule whose keywords are all absent.
- Each rule object: `{ id, type, re, group?, keywords }`. `type` is the human name used in chip copy ("Slack token").

`packages/core/src/detect.js` changes:
```js
import { EXTRA } from './rules-extra.js'
import { shannon } from './entropy.js'

export const RULES = [
  { id: 'private-key', type: 'Private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, keywords: ['private key'] },
  { id: 'anthropic', type: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g, keywords: ['sk-ant-'] },
  { id: 'openai', type: 'OpenAI key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/g, keywords: ['sk-'] },
  { id: 'stripe', type: 'Stripe key', re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/g, keywords: ['_live_', '_test_'] },
  { id: 'aws-access-key', type: 'AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, keywords: ['akia', 'asia'] },
  { id: 'github', type: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/g, keywords: ['gh', 'github_pat_'] },
  { id: 'slack', type: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g, keywords: ['xox'] },
  { id: 'google-api', type: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}/g, keywords: ['aiza'] },
  { id: 'jwt', type: 'JWT', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, keywords: ['eyj'] },
  ...EXTRA,
  { id: 'db-password', type: 'Database password', re: /\b[a-z][a-z0-9+]*:\/\/[^\s:@/]+:([^\s@/]+)@/gid, group: 1, keywords: ['://'] },
  { id: 'assignment', type: 'Secret value', re: /\b[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*[=:]\s*["']?([^\s"']{8,})/gd, group: 1, check: v => shannon(v) >= 3.5, keywords: ['secret', 'token', 'passw', 'api_key', 'private_key'] },
  { id: 'card', type: 'Card number', re: /\b(?:\d[ -]?){12,18}\d\b/g, check: s => luhn(s.replace(/\D/g, '')) },
  { id: 'email', type: 'Email address', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, pii: true, keywords: ['@'] },
]

/** @param {string} text @param {{pii?: boolean, extra?: {type: string, re: RegExp}[]}} [opts] */
export function detect(text, opts = {}) {
  const lower = text.toLowerCase()
  const rules = [...RULES.filter(r => opts.pii || !r.pii), ...(opts.extra ?? []).map((r, i) => ({ id: `custom-${i}`, ...r }))]
  const hits = []
  for (const r of rules) {
    if (r.keywords && !r.keywords.some(k => lower.includes(k))) continue
    for (const m of text.matchAll(r.re)) {
      const [start, end] = r.group ? m.indices[r.group] : [m.index, m.index + m[0].length]
      const value = text.slice(start, end)
      if (!r.check || r.check(r.group ? value : m[0])) hits.push({ start, end, type: r.type, value, rule: r.id })
    }
  }
  return hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
    .filter((h, i, all) => !all.slice(0, i).some(p => h.start < p.end && p.start < h.end))
}
```
Note: the sort-then-filter keeps the earliest, then longest, hit on overlap; rule order still breaks exact ties because `Array.prototype.sort` is stable. The existing "anthropic wins over generic sk-" test must still pass (it does: same start, anthropic is longer or equal and listed first).

Custom rules come from the options page, which validated them (Task 21). `detect` does not re-time them.

- [ ] **Step 4: Run** `npm test -w packages/core` → PASS (all old + new). Update landing `sync` to copy `detect.js rules-extra.js entropy.js`; update the drift test to compare all three.

- [ ] **Step 5: Commit** — `git commit -m "Port gitleaks rules with keyword prefilters, entropy gate and PII toggle"`

**Acceptance criteria**
- [ ] ≥ 35 rules, each with a unique `id` and a human `type`.
- [ ] PII rules off by default; `{pii:true}` enables them.
- [ ] Rule file carries the gitleaks MIT notice and source commit.
- [ ] Landing and design-doc demos still work with the new file set.

---

### Task 3: Tab-stable `redact`, accuracy corpus and CI gates

**Files:**
- Create: `packages/core/corpus/positive.js`, `packages/core/corpus/negative/*.txt`, `packages/core/bench/gates.mjs`, `packages/core/test/redact.test.js`, `packages/core/src/hash.js`
- Modify: `packages/core/src/detect.js` (`redact` signature), `.github/workflows/ci.yml`

**Interfaces:**
- Produces:
  - `redact(text, hits = detect(text), state = { next: 1, ids: new Map() }): { text: string, parts: Part[], count: number, state }` — `state.ids: Map<value, 'PG_SECRET_n'>`, mutated in place so a tab reuses ids across pastes. `count` = distinct secrets in **this** paste.
  - `type Part = { text: string, hit?: Hit }`
  - `sha256Hex(s: string): Promise<string>`
  - `npm run gates -w packages/core` exits 1 when any gate fails.

- [ ] **Step 1: Failing tests** (`packages/core/test/redact.test.js`)

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { redact } from '../src/detect.js'
import { sha256Hex } from '../src/hash.js'

const K = 'AKIAIOSFODNN7EXAMPLE'

test('ids are stable across pastes in one tab', () => {
  const state = { next: 1, ids: new Map() }
  assert.equal(redact(`a ${K}`, undefined, state).text, 'a PG_SECRET_1')
  assert.equal(redact(`b sk_live_${'x'.repeat(20)} ${K}`, undefined, state).text, 'b PG_SECRET_2 PG_SECRET_1')
  assert.equal(state.next, 3)
})

test('two tabs number independently', () => {
  const a = { next: 1, ids: new Map() }, b = { next: 1, ids: new Map() }
  redact(K, undefined, a)
  assert.equal(redact(K, undefined, b).text, 'PG_SECRET_1')
})

test('default state keeps the landing API working', () => {
  assert.equal(redact(`${K} ${K}`).count, 1)
})

test('sha256Hex', async () => {
  assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

```js
/** @param {string} text @param {Hit[]} [hits] @param {{next: number, ids: Map<string,string>}} [state] */
export function redact(text, hits = detect(text), state = { next: 1, ids: new Map() }) {
  const seen = new Set()
  const parts = []
  let out = '', last = 0
  for (const h of hits) {
    if (!state.ids.has(h.value)) state.ids.set(h.value, `PG_SECRET_${state.next++}`)
    const token = /** @type {string} */ (state.ids.get(h.value))
    seen.add(token)
    parts.push({ text: text.slice(last, h.start) }, { text: token, hit: h })
    out += text.slice(last, h.start) + token
    last = h.end
  }
  parts.push({ text: text.slice(last) })
  return { text: out + text.slice(last), parts, count: seen.size, state }
}
```
`hash.js`:
```js
/** @param {string} s */
export async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 4: Corpus**

`corpus/positive.js` exports `positives(): {rule: string, text: string}[]`, ≥ 50 samples per rule, built from templates + a seeded PRNG so they are format-valid but random, e.g.:
```js
const rnd = seeded(42)
const pick = (set, n) => Array.from({ length: n }, () => set[Math.floor(rnd() * set.length)]).join('')
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', D = '0123456789', a = 'abcdefghijklmnopqrstuvwxyz'
export const TEMPLATES = {
  'aws-access-key': () => `AWS_ACCESS_KEY_ID=${'AKIA' + pick(A + D, 16)}`,
  'stripe': () => `stripe.key = "${'sk_' + 'live_' + pick(A + a + D, 24)}"`,
  // one entry per rule id; test asserts Object.keys(TEMPLATES) covers every RULES id except pii rules
}
```
Build prefixes by concatenation (`'sk_' + 'live_'`) so the source file itself never matches a scanner.

`corpus/negative/`: ≥ 2 MB total, committed: this repo's own `.md`/`.js`/`.html` files concatenated, a `package-lock.json` sample, 5k UUIDs, 5k git SHAs, 2k sha256 hex strings, a base64 PNG, an nginx access log sample, a Python stack trace sample, a Kubernetes YAML without secrets. Sample data files are labelled `sample` in their filename.

- [ ] **Step 5: Gates** (`bench/gates.mjs`)

```js
import { detect, RULES } from '../src/detect.js'
import { positives, TEMPLATES } from '../corpus/positive.js'
import { readdir, readFile } from 'node:fs/promises'

let fail = false
const need = RULES.filter(r => !r.pii).map(r => r.id).filter(id => !TEMPLATES[id])
if (need.length) { console.error('no positive template for', need); fail = true }

const byRule = new Map()
for (const { rule, text } of positives()) {
  const s = byRule.get(rule) ?? { n: 0, hit: 0 }; s.n++
  if (detect(text).some(h => h.rule === rule)) s.hit++
  byRule.set(rule, s)
}
let N = 0, H = 0
for (const [rule, { n, hit }] of byRule) {
  N += n; H += hit
  if (hit / n < 0.98) { console.error(`recall ${rule} ${(hit / n * 100).toFixed(1)}%`); fail = true }
}
if (H / N < 0.99) { console.error(`overall recall ${(H / N * 100).toFixed(2)}%`); fail = true }

const dir = new URL('../corpus/negative/', import.meta.url)
let bytes = 0, fps = 0
for (const f of await readdir(dir)) {
  const t = await readFile(new URL(f, dir), 'utf8'); bytes += t.length
  for (const h of detect(t)) { fps++; console.error(`FP ${f}: ${h.rule} at ${h.start}`) }
}
const perMB = fps / (bytes / 1e6)
if (perMB > 1) { console.error(`FP ${perMB.toFixed(2)}/MB`); fail = true }

const sample = (await readFile(new URL('package-lock.sample.json', dir), 'utf8')).slice(0, 10_000)
const times = []
for (let i = 0; i < 500; i++) { const t0 = performance.now(); detect(sample); times.push(performance.now() - t0) }
times.sort((a, b) => a - b)
const p95 = times[Math.floor(times.length * 0.95)]
if (p95 > 5) { console.error(`p95 ${p95.toFixed(2)}ms`); fail = true }

console.log(`recall ${(H / N * 100).toFixed(2)}% · FP ${perMB.toFixed(2)}/MB · p95 ${p95.toFixed(2)}ms`)
process.exit(fail ? 1 : 0)
```
FP output prints rule and offset, never the matched value.

- [ ] **Step 6: Run** `npm test -w packages/core && npm run gates -w packages/core`. Tune rules (tighter boundaries, more keywords, entropy) until green. Never lower a gate to pass.

- [ ] **Step 7: CI** — add `- run: npm run gates -w packages/core` to the `core` job.

- [ ] **Step 8: Commit** — `git commit -m "Add tab-stable redact, accuracy corpus and CI gates"`

**Acceptance criteria**
- [ ] Gate script prints recall, FP/MB and p95 and is green in CI: recall ≥ 98% per rule, ≥ 99% overall; FP ≤ 1/MB; p95 ≤ 5 ms on 10 KB.
- [ ] No literal secret-shaped string is committed (`git grep -E 'AKIA[0-9A-Z]{16}'` hits only the existing documented AWS example key).
- [ ] Review Focus #5 (unit part) covered by the two-tab test.

---

### Task 4: Placeholder matching across split text nodes

**Files:**
- Create: `packages/core/src/match.js`, `packages/core/test/match.test.js`

**Interfaces:**
- Produces: `findPlaceholders(segments: string[]): Found[]` where `type Found = { id: string /* 'PG_SECRET_3' */, n: number, from: { seg: number, off: number }, to: { seg: number, off: number /* exclusive */ }, exact: boolean }`. Matches `PG_SECRET_3`, and fuzzy forms `PG_SECRET 3`, `pg_secret_3`, `PG-SECRET-3`, `PG_SECRET_​3`. A match must not be followed by a digit or word char (so `PG_SECRET_1` inside `PG_SECRET_12` is not a hit, and a streaming `PG_SECRET_1` at the very end of the last segment is **held** because more digits may follow).

- [ ] **Step 1: Failing tests**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findPlaceholders } from '../src/match.js'

test('single node', () => {
  const [f] = findPlaceholders(['key=PG_SECRET_1;'])
  assert.deepEqual([f.id, f.from, f.to, f.exact], ['PG_SECRET_1', { seg: 0, off: 4 }, { seg: 0, off: 15 }, true])
})

test('split across highlighter spans', () => {
  const [f] = findPlaceholders(['`${', 'PG_SECRET', '_2', '}`'])
  assert.deepEqual([f.id, f.from, f.to], ['PG_SECRET_2', { seg: 1, off: 0 }, { seg: 2, off: 2 }])
})

test('fuzzy forms', () => {
  const ids = findPlaceholders(['PG_SECRET 3, pg_secret_4, PG-SECRET-5.']).map(f => [f.id, f.exact])
  assert.deepEqual(ids, [['PG_SECRET_3', false], ['PG_SECRET_4', false], ['PG_SECRET_5', false]])
})

test('no prefix match inside a longer id', () => {
  assert.deepEqual(findPlaceholders(['PG_SECRET_12 ']).map(f => f.id), ['PG_SECRET_12'])
})

test('streaming: trailing id at end of text is held', () => {
  assert.equal(findPlaceholders(['use PG_SEC']).length, 0)
  assert.equal(findPlaceholders(['use PG_SECRET_1']).length, 0)
  assert.equal(findPlaceholders(['use PG_SECRET_1', ' now']).length, 1)
})

test('streaming=false finalises trailing ids', () => {
  assert.equal(findPlaceholders(['use PG_SECRET_1'], { final: true }).length, 1)
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

```js
const RE = /\b(pg[\s_-]?secret)[\s_\-​]?(\d+)(?![\w])/gi

/** @param {string[]} segments @param {{final?: boolean}} [opts] */
export function findPlaceholders(segments, opts = {}) {
  const starts = []; let text = ''
  for (const s of segments) { starts.push(text.length); text += s }
  const at = i => { let seg = 0; while (seg + 1 < starts.length && starts[seg + 1] <= i) seg++; return { seg, off: i - starts[seg] } }
  const out = []
  for (const m of text.matchAll(RE)) {
    const end = m.index + m[0].length
    if (!opts.final && end === text.length) continue
    const n = +m[2]
    const id = `PG_SECRET_${n}`
    out.push({ id, n, from: at(m.index), to: endAt(end), exact: m[0] === id })
  }
  return out

  function endAt(i) { const p = at(i - 1); return { seg: p.seg, off: p.off + 1 } }
}
```

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `git commit -m "Add placeholder matcher for split and mangled placeholders"`

**Acceptance criteria**
- [ ] All six tests pass; the `to` position never points past a segment end (end positions are exclusive within the last contributing segment).
- [ ] Review Focus #1 (unit part) covered by the streaming tests.

---

### Task 5: Install-command parser, typosquat, verdicts

**Files:**
- Create: `packages/core/src/install.js`, `packages/core/src/typosquat.js`, `packages/core/src/verdict.js`, `packages/core/scripts/top-packages.mjs`, `packages/core/data/top-npm.json`, `packages/core/data/top-pypi.json`, tests for each

**Interfaces:**
- Produces:
  - `parseInstalls(code: string): Pkg[]`, `type Pkg = { eco: 'npm' | 'pypi', name: string, start: number, end: number }` (offsets into `code` for chip anchoring)
  - `nearest(name: string, eco): string | null` — a top-5k package within Damerau–Levenshtein ≤ 2 that is not `name` itself (normalised: lowercase; PyPI also `_`/`.` → `-`)
  - `verdict(f: Facts): Verdict`
    - `type Facts = { status: 'missing' | 'found' | 'error', scoped?: boolean, createdAt?: number, weeklyDownloads?: number, lookalike?: string | null, now: number }`
    - `type Verdict = { kind: 'missing' | 'missing-scoped' | 'new' | 'low' | 'lookalike' | 'ok' | 'error', days?: number, downloads?: number, like?: string }`
    - Precedence: error → missing(-scoped) → lookalike → new (< 30 days) → low (< 100/week, npm only) → ok

- [ ] **Step 1: Failing tests** (`test/install.test.js`)

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseInstalls } from '../src/install.js'
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
```
`test/verdict.test.js`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verdict } from '../src/verdict.js'
const now = Date.UTC(2026, 8, 30), day = 864e5
test('precedence', () => {
  assert.equal(verdict({ status: 'error', now }).kind, 'error')
  assert.equal(verdict({ status: 'missing', now }).kind, 'missing')
  assert.equal(verdict({ status: 'missing', scoped: true, now }).kind, 'missing-scoped')
  assert.equal(verdict({ status: 'found', lookalike: 'react', createdAt: now - 400 * day, weeklyDownloads: 9e6, now }).kind, 'lookalike')
  assert.deepEqual(verdict({ status: 'found', createdAt: now - 4 * day, now }), { kind: 'new', days: 4 })
  assert.equal(verdict({ status: 'found', createdAt: now - 400 * day, weeklyDownloads: 12, now }).kind, 'low')
  assert.equal(verdict({ status: 'found', createdAt: now - 400 * day, weeklyDownloads: 5000, now }).kind, 'ok')
})
```
`test/typosquat.test.js`:
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nearest } from '../src/typosquat.js'
test('near a popular name', () => { assert.equal(nearest('raect', 'npm'), 'react'); assert.equal(nearest('reqeusts', 'pypi'), 'requests') })
test('exact popular names and far names are fine', () => { assert.equal(nearest('react', 'npm'), null); assert.equal(nearest('zzqxv-unrelated', 'npm'), null) })
test('short names need distance 1', () => { assert.equal(nearest('zdo', 'npm'), null) })
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `install.js`: normalise `\\\n` → space, split on `\n`, `&&`, `;`, `||`; strip leading `$ `/`> `; tokenise on whitespace keeping quote groups; match command heads `npm (i|install|add)`, `pnpm (add|i|install)`, `yarn add`, `bun add`, `pip(3)? install`, `python(3)? -m pip install`, `uv (add|pip install)`, `poetry add`; skip flags (and the value after `-r`, `-c`, `-e`, `--index-url`, `-i`); drop args that start with `.`, `/`, contain `://`, start with `git+`/`github:`/`file:`; strip npm version (`@` after position 0) and PyPI extras/specifiers (`[`, `=`, `<`, `>`, `~`, `!`, `;`). Record `start`/`end` from the token's offset in the original string.

`typosquat.js`: load JSON lists at import (bundled; ~60 KB, SW only — never in the content script). Damerau–Levenshtein with early exit at 3; max distance 1 when `name.length ≤ 4`, else 2; prefilter candidates by `|len diff| ≤ 2`.

`verdict.js`: as specified in Interfaces.

`scripts/top-packages.mjs`: fetch `https://hugovk.github.io/top-pypi-packages/top-pypi-packages.min.json` (top 5k) and the `npm-high-impact` package list (MIT; `npx` not needed, read its JSON via `https://unpkg.com/npm-high-impact/lib/top.js` and slice 5k). Write sorted arrays. Run once, commit data with the fetch date in a `_meta` sibling file.

- [ ] **Step 4: Run** → PASS. **Step 5: Commit** — `git commit -m "Add install-command parser, typosquat check and verdicts"`

**Acceptance criteria**
- [ ] Never parses `import`/`require`/`from x import` lines (non-goal).
- [ ] Scoped npm 404 → `missing-scoped` (copy: "Not on public npm"), not "Not on npm".
- [ ] Data files ≤ 150 KB combined; not imported by any content-script module (checked in Task 7's size script).

---

### Task 6: Rotate links

**Files:**
- Create: `packages/core/src/rotate.js`, `packages/core/test/rotate.test.js`

**Interfaces:**
- Produces: `rotateUrl(rule: string): string | null`; `ROTATE: Record<ruleId, url>` for ~30 providers.

- [ ] **Step 1: Failing test**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ROTATE, rotateUrl } from '../src/rotate.js'
import { RULES } from '../src/detect.js'
test('all links are https and point at a rule that exists', () => {
  const ids = new Set(RULES.map(r => r.id))
  for (const [id, url] of Object.entries(ROTATE)) { assert.ok(ids.has(id), id); assert.match(url, /^https:\/\//) }
})
test('covers the headline providers', () => {
  for (const id of ['aws-access-key', 'stripe', 'openai', 'anthropic', 'github', 'slack', 'google-api']) assert.ok(rotateUrl(id), id)
  assert.equal(rotateUrl('card'), null)
})
```

- [ ] **Step 2–4:** implement the static map (verify each URL loads to the provider's key-management page by hand; record the check date in a comment), run, pass.
- [ ] **Step 5: Commit** — `git commit -m "Add rotate links for 30 providers"`

**Acceptance criteria**
- [ ] ≥ 30 entries, each manually opened once and confirmed as the key-management page.

---

## Milestone M1 — Extension shell

### Task 7: WXT scaffold, manifest, lint bans, size budget

**Files:**
- Create: `apps/extension/{package.json,wxt.config.ts,tsconfig.json,eslint.config.js}`, `apps/extension/scripts/size.mjs`, `apps/extension/public/_locales/en/messages.json`, `apps/extension/src/shared/i18n.ts`, stub entrypoints (`background.ts`, `chat.content/index.ts`, `clipboard.content.ts`)
- Move: `apps/extension/spike/` stays (reference only; excluded from build and lint)
- Modify: `apps/extension/README.md`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `npm run build -w apps/extension` → `.output/chrome-mv3/`; `npm run size` fails if `content-scripts/chat.js` > 25 KB gzip; `t(key: string, subs?: string[]): string`.

- [ ] **Step 1: Scaffold**

```bash
cd apps/extension && npm init -y && npm i -E preact @preact/signals zod && npm i -DE wxt typescript @preact/preset-vite eslint typescript-eslint @playwright/test
```
`wxt.config.ts`:
```ts
import { defineConfig } from 'wxt'
import preact from '@preact/preset-vite'

const AI = ['https://chatgpt.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*']
export const AI_MATCHES = AI

export default defineConfig({
  srcDir: '.',
  vite: ({ mode }) => ({ plugins: [preact()], esbuild: mode === 'production' ? { drop: ['console', 'debugger'] } : {} }),
  manifest: {
    name: '__MSG_name__',
    description: '__MSG_description__',
    default_locale: 'en',
    minimum_chrome_version: '125',
    permissions: ['storage'],
    host_permissions: [...AI, 'https://registry.npmjs.org/*', 'https://api.npmjs.org/*', 'https://pypi.org/*'],
    action: { default_popup: 'popup.html', default_title: '__MSG_name__' },
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'; connect-src https://registry.npmjs.org https://api.npmjs.org https://pypi.org" },
  },
})
```
Entry stubs:
```ts
// entrypoints/chat.content/index.ts
export default defineContentScript({ matches: AI_MATCHES, runAt: 'document_start', allFrames: false, main() {} })
// entrypoints/clipboard.content.ts
export default defineContentScript({ matches: AI_MATCHES, runAt: 'document_start', world: 'MAIN', main() {} })
```
(Import `AI_MATCHES` from a small `src/shared/sites.ts` rather than the config file.) In dev builds only, add `http://localhost/*` to matches and host permissions so E2E can load mock pages; assert in Task 23 that the production manifest has no `localhost`.

- [ ] **Step 2: Lint bans** (`eslint.config.js`)

```js
import tseslint from 'typescript-eslint'
export default tseslint.config(
  { ignores: ['.output', '.wxt', 'spike'] },
  ...tseslint.configs.strict,
  { rules: {
    'no-restricted-properties': ['error',
      ...['innerHTML', 'outerHTML'].map(property => ({ property, message: 'Use textContent/createElement' })),
      { property: 'insertAdjacentHTML', message: 'Use createElement' }],
    'no-restricted-syntax': ['error', { selector: "NewExpression[callee.name='Function']", message: 'No new Function' }],
    'no-eval': 'error', 'no-implied-eval': 'error',
    'no-restricted-imports': ['error', { paths: [{ name: '@pasteguard/core/typosquat', message: 'SW only' }] }],
  } },
  { files: ['entrypoints/background.ts', 'src/sw/**'], rules: { 'no-restricted-imports': 'off' } },
)
```

- [ ] **Step 3: Size budget** (`scripts/size.mjs`)

```js
import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
const f = new URL('../.output/chrome-mv3/content-scripts/chat.js', import.meta.url)
const kb = gzipSync(await readFile(f)).length / 1024
console.log(`chat.js ${kb.toFixed(1)} KB gzip`)
if (kb > 25) process.exit(1)
```
Scripts: `"build": "wxt build"`, `"dev": "wxt"`, `"zip": "wxt zip"`, `"size": "node scripts/size.mjs"`, `"lint": "eslint ."`, `"typecheck": "tsc --noEmit"`, `"e2e": "playwright test"`.

- [ ] **Step 4: i18n** — `messages.json` with `name` ("PasteGuard") and `description` ("Stop secret leaks in ChatGPT & Claude. Flags packages the AI made up."). `t()` wraps `chrome.i18n.getMessage` and throws in dev on a missing key.

- [ ] **Step 5: CI job**

```yaml
  extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint -w apps/extension
      - run: npm run typecheck -w apps/extension
      - run: npm run build -w apps/extension
      - run: npm run size -w apps/extension
```

- [ ] **Step 6: Verify** — build, load `.output/chrome-mv3` unpacked in Chrome, confirm the install warning lists only the three AI sites + registries ("Read and change your data on chatgpt.com, claude.ai, gemini.google.com and 3 other sites"). Screenshot it for the store listing folder.

- [ ] **Step 7: Commit** — `git commit -m "Scaffold WXT extension with lint bans and size budget"`

**Acceptance criteria**
- [ ] Manifest has exactly the Global Constraints host permissions, `storage` only, no `web_accessible_resources`, no `externally_connectable`.
- [ ] A test file containing `el.innerHTML = x` fails `npm run lint`.
- [ ] CI runs lint, typecheck, build, size on every push.

---

### Task 8: Message contracts, storage schemas, service-worker vault mirror

**Files:**
- Create: `src/shared/messages.ts`, `src/shared/storage.ts`, `src/sw/router.ts`, `src/sw/vault.ts`, `entrypoints/chat.content/vault.ts`, `test/storage.test.ts` (run with `node --test test/`; Node ≥ 22.18 strips TS types natively, so set `allowImportingTsExtensions` + `noEmit` in `tsconfig.json` and keep these modules free of enums/namespaces)
- Modify: `entrypoints/background.ts`

**Interfaces:**
- Produces:
  - Messages (content → SW), all validated with `zod/mini` in the SW; SW rejects if `sender.id !== chrome.runtime.id` or `!sender.tab?.id`:
    ```ts
    type Msg =
      | { t: 'vault.put', entries: [id: string, value: string, type: string][] , next: number }
      | { t: 'vault.get' }                                       // → { next: number, map: Record<id, {value, type}> }
      | { t: 'caught', types: string[], site: string }           // stats + badge
      | { t: 'sentOriginal', types: string[] }                   // stats (counts only)
      | { t: 'pkg', eco: 'npm' | 'pypi', name: string }         // → Verdict
      | { t: 'allow.has', hashes: string[] }                     // → boolean[]
      | { t: 'allow.add', hash: string, type: string }
      | { t: 'settings.get' }                                    // → Settings
      | { t: 'adapter.status', ok: boolean, site: string }
    ```
  - `type Settings = { v: 1, paused: string[], pii: boolean, rules: { type: string, source: string }[], allow: { hash: string, type: string, at: number }[], statsOptIn: false }` in `storage.local` key `settings`.
  - `type Stats = { v: 1, days: Record<'YYYY-MM-DD', { caught: number, byType: Record<string, number> }> }` (keep 14 days).
  - `type PkgCache = Record<'npm:name', { verdict: Verdict, at: number }>` key `pkg`, 24 h TTL, max 2000 entries (drop oldest).
  - Vault in `storage.session` key `vault:<tabId>` → `{ next, map }`. `tabs.onRemoved` deletes it. Access level stays `TRUSTED_CONTEXTS` (default) so content scripts can't read `storage.session` directly.
  - `readSettings()`: parse with schema; on failure or older `v`, migrate or reset to defaults — never throw.
  - Content `TabVault` class: `state: {next, ids: Map<value, id>}`, `byId: Map<id, {value, type}>`, `hydrate()` (from `vault.get`), `put(redactResult)` (sync update + fire-and-forget `vault.put`).

- [ ] **Step 1: Failing tests** for schema/migration (`test/storage.test.ts`):

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSettings, DEFAULT_SETTINGS } from '../src/shared/storage.ts'
test('garbage resets to defaults', () => assert.deepEqual(parseSettings({ v: 99, pii: 'yes' }), DEFAULT_SETTINGS))
test('defaults: pii off, nothing paused', () => { assert.equal(DEFAULT_SETTINGS.pii, false); assert.deepEqual(DEFAULT_SETTINGS.paused, []) })
test('valid settings round-trip', () => { const s = { ...DEFAULT_SETTINGS, paused: ['claude.ai'] }; assert.deepEqual(parseSettings(s), s) })
```
And for the router (`test/router.test.ts`), with a fake `sender`:
```ts
test('rejects messages from other extensions or without a tab', async () => {
  assert.equal(await route({ t: 'vault.get' }, { id: 'other' } as any), undefined)
  assert.equal(await route({ t: 'vault.get' }, { id: SELF } as any), undefined)
})
test('rejects malformed messages', async () => {
  assert.equal(await route({ t: 'vault.put', entries: 'x' }, okSender), undefined)
})
test('vault is per tab and purged on close', async () => {
  await route({ t: 'vault.put', entries: [['PG_SECRET_1', 'v', 'AWS access key']], next: 2 }, tab(1))
  assert.equal((await route({ t: 'vault.get' }, tab(2))).next, 1)
  await onTabRemoved(1)
  assert.equal((await route({ t: 'vault.get' }, tab(1))).next, 1)
})
```
Provide an in-memory `chrome.storage` fake in `test/fake-chrome.ts` (get/set/remove over a `Map`).

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** schemas with `zod/mini` (`z.object`, `z.array`, `z.optional`, `z.literal`, `schema.safeParse`). Router: `chrome.runtime.onMessage.addListener((m, s, reply) => { route(m, s).then(reply); return true })`. **Step 4: Run** → PASS.

- [ ] **Step 5: Commit** — `git commit -m "Add validated message contracts, storage schemas and session vault mirror"`

**Acceptance criteria**
- [ ] Every SW handler is reachable only through a schema-validated message with a verified sender.
- [ ] `storage.session` access level is not widened.
- [ ] No handler returns vault data to any context except the owning tab's content script.
- [ ] Review Focus #5 (SW part) covered by the per-tab/purge test.

---

### Task 9: Site adapters and mock chat pages with Playwright harness

**Files:**
- Create: `adapters/types.ts`, `adapters/{chatgpt,claude,gemini,generic,index}.ts`, `e2e/mock/{prosemirror,textarea,contenteditable}.html`, `e2e/mock/server.ts`, `e2e/fixtures.ts`, `e2e/adapters.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Produces:
  ```ts
  interface Adapter {
    id: 'chatgpt' | 'claude' | 'gemini' | 'generic'
    composer(): HTMLElement | null                 // the editable element
    insert(el: HTMLElement, text: string): boolean // synthetic paste → execCommand('insertText') fallback; returns whether text landed
    answers(): HTMLElement[]                      // assistant turn containers
    userTurns(): HTMLElement[]                    // for chat-leak scan
    conversationId(): string | null               // from location.pathname
    isStreaming(el: HTMLElement): boolean
  }
  pickAdapter(host: string): Adapter
  ```
  Selectors live only in the per-site files. `generic` uses `[contenteditable=true], textarea` for the composer and returns `[]` for answers (so restore is disabled, matching "Site adapter broken" in the state matrix).
- Mock pages served at `http://localhost:4323/{prosemirror,textarea,contenteditable}.html`, each with a composer, a Send button that "sends" by appending a user turn and POSTing the composer text to `/log`, and a scripted assistant reply that streams a canned answer containing whatever `PG_SECRET_n` tokens were sent, split across `<span>`s, in 30 ms chunks, plus a code block with `npm i react-form-utils-pro zod`.
- `e2e/fixtures.ts` fixtures used by later tasks: `ext`, `extId`, `sw` (seed storage / allow list via the SW), `paste(page, text)`, `clipboard(page)`, `leaks(page, value)`, `restored(page, kind, text)` (paste → send → wait for `pg-v`), `domHistory(page)` (answer `outerHTML` after every mutation), and shadow readers via `__pgTestHook`: `shadowText`, `shadowTexts(page, host)`, `shadow(page, sel, fn)`, `shadowLocator`, `shadowStyle`.
- `e2e/fixtures.ts` exports a Playwright `test` with `context` launched via `chromium.launchPersistentContext('', { headless: true, args: ['--disable-extensions-except=' + ext, '--load-extension=' + ext] })` (`channel: 'chromium'`), and a `leaks(page, value)` helper that checks the `/log` server record, `document.documentElement.outerHTML` (via `page.evaluate`, page world), `page.content()`, and all `postData` of requests seen by `page.on('request')`.

- [ ] **Step 1: Failing E2E** (`e2e/adapters.spec.ts`)

```ts
for (const kind of ['prosemirror', 'textarea', 'contenteditable']) {
  test(`${kind}: generic adapter inserts text`, async ({ page, ext }) => {
    await page.goto(`http://localhost:4323/${kind}.html`)
    const ok = await ext.evalInContent(page, `(${String((t: string) => {
      const a = pickAdapter(location.host); const c = a.composer()!; return a.insert(c, t)
    })})('hello PG_SECRET_1')`)
    expect(ok).toBe(true)
    await expect(page.locator('[data-composer]')).toContainText('hello PG_SECRET_1')
  })
}
```
(The content script exposes a dev-only test hook named `__pgTestHook` behind `import.meta.env.MODE === 'development'`: it answers `window.postMessage` requests to run adapter calls, read our closed shadow root's text/styles, and report restore timings. It must not exist in production; Task 23 asserts that.)

Per-site adapters get unit tests against saved DOM snapshots in `e2e/snapshots/{chatgpt,claude,gemini}.html` (captured by hand from a logged-out/own account, scrubbed of personal data, containing only our test prompt). Test: `composer()`, `answers().length`, `userTurns().length`, `conversationId()` on each snapshot.

- [ ] **Step 2–4:** implement, run `npm run e2e`, pass. Add E2E to CI (`npx playwright install --with-deps chromium && npm run e2e -w apps/extension`).
- [ ] **Step 5: Commit** — `git commit -m "Add site adapters, mock chat pages and Playwright harness"`

**Acceptance criteria**
- [ ] Adapters are the only files containing site selectors.
- [ ] All three mock editors accept insertion via synthetic paste or the `execCommand` fallback.
- [ ] Snapshot tests pass for all three real sites.
- [ ] E2E runs headless in CI.

---

## Milestone M2 — Paste guard (surface A)

### Task 10: Paste guard

**Files:**
- Create: `entrypoints/chat.content/guard.ts`, `e2e/guard.spec.ts`
- Modify: `entrypoints/chat.content/index.ts`

**Interfaces:**
- Consumes: `detect`, `redact` (Task 2–3), `sha256Hex` (Task 3), `Adapter` (Task 9), `TabVault` (Task 8), `Settings` (Task 8).
- Produces: `installGuard(ctx: { adapter, vault, settings: () => Settings, ui: GuardUI }): void` where
  ```ts
  interface GuardUI {
    taped(r: { types: string[], count: number, original: string, taped: string, target: HTMLElement }): void
    fallback(kind: 'inserted-to-clipboard'): void
  }
  ```

Flow (from PRD §4 "Paste"):
1. `window.addEventListener('paste', onPaste, { capture: true })` at `document_start`.
2. Ignore if site is paused, target isn't inside `adapter.composer()` (or any editable when adapter is generic), or `!e.clipboardData`.
3. `text = e.clipboardData.getData('text/plain')`. If `text.length > 256 * 1024`: `preventDefault()`, `stopImmediatePropagation()`, then `await chunkedDetect(text)` (64 KB chunks with 512-char overlap, `await scheduler.yield()` between chunks; dedupe hits by absolute offset).
4. Else `hits = detect(text, { pii, extra })` synchronously. No hits → return (site handles paste normally).
5. Hits → `preventDefault()` + `stopImmediatePropagation()` **synchronously**.
6. `allowed = await send({t:'allow.has', hashes: await Promise.all(hits.map(h => sha256Hex(h.value)))})`; drop allowed hits. If none remain, insert `text` unchanged and stop.
7. `r = redact(text, remaining, vault.state)`; `vault.put(r)`; `ok = adapter.insert(target, r.text)`.
8. `!ok` → `navigator.clipboard.writeText(r.text)` (the paste gesture's activation is still valid) and `ui.fallback('inserted-to-clipboard')`.
9. `ui.taped(...)`; `send({t:'caught', types, site: location.host})`.
10. The original text is kept only in the closure passed to `ui.taped` (for Esc and hold-to-send) and released on chip dismiss.

- [ ] **Step 1: Failing E2E** (`e2e/guard.spec.ts`)

```ts
const KEY = 'AKIA' + 'IOSFODNN7EXAMPLE'
for (const kind of ['prosemirror', 'textarea', 'contenteditable']) {
  test(`${kind}: secret never reaches the page`, async ({ page, paste, leaks }) => {
    await page.goto(`http://localhost:4323/${kind}.html`)
    await paste(page, `AWS_ACCESS_KEY_ID=${KEY}\nPORT=8080`)
    await expect(page.locator('[data-composer]')).toContainText('AWS_ACCESS_KEY_ID=PG_SECRET_1')
    await page.click('[data-send]')
    expect(await leaks(page, KEY)).toEqual([])
  })
}

test('no secret: paste passes through untouched', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html')
  await paste(page, 'hello world')
  await expect(page.locator('[data-composer]')).toHaveText('hello world')
})

test('page capture listeners never see the original', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html')
  await page.evaluate(() => { (window as any).seen = []; addEventListener('paste', e => (window as any).seen.push(e.clipboardData?.getData('text/plain')), true) })
  await paste(page, `k=${KEY}`)
  expect((await page.evaluate(() => (window as any).seen)).join()).not.toContain(KEY)
})

test('allow-listed value is pasted as-is', async ({ page, paste, sw }) => {
  await sw.allow(KEY, 'AWS access key')
  await page.goto('http://localhost:4323/textarea.html')
  await paste(page, `k=${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue(`k=${KEY}`)
})

test('ids stay stable across two pastes', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/textarea.html')
  await paste(page, `a=${KEY}\n`); await paste(page, `b=${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue('a=PG_SECRET_1\nb=PG_SECRET_1')
})

// Review Focus #2
test('adapter insert failure: taped text goes to the clipboard, original never lands', async ({ page, paste, clipboard }) => {
  await page.goto('http://localhost:4323/prosemirror.html?broken=1')   // mock rejects synthetic paste + execCommand
  await paste(page, `k=${KEY}`)
  await expect(page.locator('[data-composer]')).not.toContainText(KEY)
  expect(await clipboard(page)).toBe('k=PG_SECRET_1')
  await expect(page.getByRole('status')).toContainText('Couldn\'t paste here')
})

// Review Focus #4
test('5 MB paste with a key at the end: redacted, no long task over 50 ms', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/textarea.html')
  await page.evaluate(() => { (window as any).long = 0; new PerformanceObserver(l => l.getEntries().forEach(e => { if (e.duration > 50) (window as any).long++ })).observe({ type: 'longtask' }) })
  await paste(page, 'log line 12345 ok\n'.repeat(290_000) + `k=${KEY}`)
  await expect(page.locator('[data-composer]')).toHaveValue(/k=PG_SECRET_1$/)
  expect(await page.evaluate(() => (window as any).long)).toBe(0)
})
```
`paste` fixture dispatches a trusted paste by writing to the clipboard (`context.grantPermissions(['clipboard-read','clipboard-write'])`) then pressing `ControlOrMeta+V` in the composer.

Note on the 5 MB test: textarea insertion of 5 MB may itself cause a long task in the mock page; if so, measure only between `paste` dispatch and the `insert` call (mark with `performance.mark` via the dev hook) and document why.

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `guard.ts` per the flow. **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add paste guard with sync detect, allow list and insert fallback"`

**Acceptance criteria**
- [ ] 0 leaks across network log, page DOM and page-world listeners on all three mock editors (the PRD §0 gate).
- [ ] `preventDefault` runs inside the event, before any `await`.
- [ ] Idle cost on a page with no paste: 0 timers, no observers from the guard.
- [ ] Review Focus #2 and #4 tests pass.

---

### Task 11: UI host, tokens, guard chip rendering (surface A)

**Files:**
- Create: `ui/h.ts`, `ui/host.ts`, `ui/tokens.css`, `ui/inpage.css`, `ui/chip.ts`, `ui/toast.ts`, `e2e/chip.spec.ts`
- Modify: `public/_locales/en/messages.json`

**Interfaces:**
- Produces:
  - `h(tag, props?, ...children): HTMLElement` — sets attributes/`dataset`/listeners, appends strings as text nodes only. ~20 lines.
  - `mountHost(): { root: ShadowRoot, layer: HTMLElement }` — one `<pg-host>` on `document.documentElement`, `attachShadow({ mode: 'closed' })`, adopts `inpage.css` via `CSSStyleSheet` + `adoptedStyleSheets`, `layer` has `popover="manual"` and is re-`showPopover()`ed if the site closes all popovers.
  - `createChip(host): GuardUI & { exposed(): void, retape(): void, close(): void }`
- Visual spec (design doc surface A, binding):
  - Paper surface, anchored above composer rect via `ResizeObserver` + `position: fixed` using `getBoundingClientRect`; fallback bottom-center toast when no composer.
  - Enter `translateY(6px) scale(.98) → none` · `var(--d-pop)` `var(--ease-out)`. Exit `opacity` · `var(--d-exit)` ease.
  - Repeat paste while open: update text in place with 200 ms blur swap, no re-entry.
  - Copy: title `"{n} secret(s) taped: {types}"`, helper `"The AI will see placeholders. Your answer is restored on this screen."`, key hints `Enter send · Esc undo`. Exposed: `"{n} secret(s) visible: {types}"`, helper `"Press Esc to tape them again."`, coral ring.
  - `role=status`, `aria-live=polite`; announcement text "2 secrets replaced with placeholders."
  - Never calls `.focus()` on anything unless `Alt+Shift+P` (Task 12).
  - Reduced motion: opacity only.
  - Forced colors: outline on pills.

- [ ] **Step 1: Failing E2E**

```ts
test('chip appears with types, never values', async ({ page, paste, shadowText }) => {
  await page.goto('http://localhost:4323/prosemirror.html')
  await paste(page, `STRIPE_SECRET_KEY=sk_${'live'}_${'a'.repeat(24)}\nAWS=AKIA${'IOSFODNN7EXAMPLE'}`)
  const t = await shadowText(page)          // dev hook returns host shadow textContent
  expect(t).toContain('2 secrets taped: Stripe key, AWS access key')
  expect(t).not.toContain('IOSFODNN7EXAMPLE')
})
test('page cannot reach our UI', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html'); await paste(page, 'k=AKIA' + 'IOSFODNN7EXAMPLE')
  expect(await page.evaluate(() => document.querySelector('pg-host')!.shadowRoot)).toBeNull()
})
test('focus stays in the composer', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html'); await paste(page, 'k=AKIA' + 'IOSFODNN7EXAMPLE')
  expect(await page.evaluate(() => document.activeElement?.hasAttribute('data-composer'))).toBe(true)
})
test('host styles cannot leak in', async ({ page, paste, shadowStyle }) => {
  await page.goto('http://localhost:4323/prosemirror.html?hostile=1')  // mock adds * { all: unset; color: red !important }
  await paste(page, 'k=AKIA' + 'IOSFODNN7EXAMPLE')
  expect(await shadowStyle(page, '.chip', 'color')).not.toBe('rgb(255, 0, 0)')
})
```

- [ ] **Step 2–4:** implement; lift `tokens.css` values verbatim from `apps/extension/design/index.html:14-29`; `inpage.css` uses `system-ui` font stack only. Run → PASS.
- [ ] **Step 5: Visual check** — screenshot chip on each mock page in light and dark host themes at 375 px and 1280 px; compare side by side with the design doc surface A. Record screenshots in the PR.
- [ ] **Step 6: Commit** — `git commit -m "Add closed-shadow UI host and guard chip"`

**Acceptance criteria**
- [ ] Matches design doc surface A spec table row by row (mount, anchor, enter, exit, repeat paste, focus).
- [ ] `document.querySelector('pg-host').shadowRoot === null` from page world.
- [ ] No `@import`, `url()` or font file loaded on AI pages (0 network requests; assert via `page.on('request')` filter to non-mock hosts).
- [ ] All strings come from `messages.json`.

---

### Task 12: Chip interactions: Enter, Esc, hold-to-send, Alt+Shift+P, dismissal, rotate link

**Files:**
- Modify: `ui/chip.ts`, `entrypoints/chat.content/guard.ts`
- Create: `e2e/chip-keys.spec.ts`

**Interfaces:**
- Consumes: `rotateUrl` (Task 6), `Adapter.insert`, `TabVault`.
- Behaviour (design doc surface A + a11y section + voice):
  - `Enter` in composer: site sends as normal (we do nothing); chip closes on send (observe composer emptied or user-turn added via adapter).
  - `Esc` (1st) in composer while taped: replace taped text in composer with the original (via adapter select-all + insert), chip → exposed state, coral ring. No animation (keyboard). `Esc` (2nd) while exposed: re-tape. Chip dismisses on second `Esc` **only when** there was nothing to toggle back to (spec: "Esc twice" dismisses).
  - Sending while exposed → counts as "sent original".
  - Hold-to-send button: `pointerdown` or held `Space` for `var(--d-hold)` (1200 ms) with a fill animation (`transform: scaleX`) that resets instantly on release before completion; on completion insert original, trigger `adapter` send button click, then assertive announcement **"Sent with {n} secret(s). Rotate the {type}."** plus a rotate link (`rotateUrl`) for the first type that has one. Send `{t:'sentOriginal'}`.
  - "Always allow this" (secondary button in chip): hashes each value in this paste, `allow.add`, re-inserts the original, closes chip.
  - `Alt+Shift+P`: focus moves into the chip (first button); `Esc` from inside the chip returns focus to the composer.
  - Auto-dismiss 8 s after the composer loses focus; timer cleared on refocus. No timers otherwise.
  - Team-policy lock is P2: not implemented.

- [ ] **Step 1: Failing E2E**

```ts
test('Esc exposes, Esc again re-tapes, without animation', async ({ page, paste, shadow }) => {
  await page.goto('http://localhost:4323/prosemirror.html'); await paste(page, 'k=AKIA' + 'IOSFODNN7EXAMPLE')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-composer]')).toContainText('IOSFODNN7EXAMPLE')
  expect(await shadow(page, '.chip', el => el.dataset.state)).toBe('exposed')
  expect(await shadow(page, '.chip', el => getComputedStyle(el).transitionDuration)).toMatch(/^0s/)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-composer]')).toContainText('PG_SECRET_1')
})
test('hold under 1200 ms does nothing; full hold sends original and announces rotate', async ({ page, paste, shadowLocator }) => {
  await page.goto('http://localhost:4323/prosemirror.html'); await paste(page, 'k=sk_' + 'live_' + 'a'.repeat(24))
  const hold = await shadowLocator(page, '[data-hold]')
  await hold.hover(); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up()
  await expect(page.locator('[data-user-turn]')).toHaveCount(0)
  await page.mouse.down(); await page.waitForTimeout(1300); await page.mouse.up()
  await expect(page.locator('[data-user-turn]').last()).toContainText('sk_live_')
  expect(await page.evaluate(() => document.querySelector('pg-host')?.textContent ?? '')).toBe('')   // nothing in light DOM
  await expect(page.getByRole('alert')).toContainText('Sent with 1 secret. Rotate the Stripe key.')
})
test('held Space also works', async ({ page, paste }) => { /* focus [data-hold] via Alt+Shift+P, hold Space 1300 ms */ })
test('Alt+Shift+P moves focus in, Esc returns it', async ({ page, paste }) => { /* assert activeElement round-trip */ })
test('chip auto-dismisses 8 s after blur only', async ({ page, paste }) => { /* use page.clock.install() and fastForward */ })
```
Write the three abbreviated tests in full using the same fixtures; use `page.clock` for timers.

- [ ] **Step 2–4:** implement; run → PASS.
- [ ] **Step 5: Commit** — `git commit -m "Add chip keyboard, hold-to-send, allow and rotate actions"`

**Acceptance criteria**
- [ ] Enter/Esc behave exactly as without the extension except for the documented toggles.
- [ ] Hold-to-send requires ≥ 1200 ms continuous press (pointer or Space) and resets on release.
- [ ] Exposed-send is the only `assertive` announcement in the product.
- [ ] Allow list stores hashes only (inspect `chrome.storage.local` in test: no value substring present).

---

### Task 13: Chat-leak scan

**Files:**
- Create: `entrypoints/chat.content/leakscan.ts`, `e2e/leakscan.spec.ts`
- Modify: `src/shared/storage.ts` (`scanned: string[]` of hashed conversation ids, max 500)

**Interfaces:**
- Consumes: `Adapter.userTurns()`, `Adapter.conversationId()`, `detect`, `rotateUrl`, chip host.
- Behaviour (PRD §2 item 9): on first visit to each conversation id (hash with `sha256Hex` before storing), after the page is idle (`requestIdleCallback`, timeout 2 s), run `detect` over each user turn's text. If any hits, show **one** chip: "This conversation contains an {type}. Rotate it" with the rotate link; multiple types → "…contains 2 secrets: AWS key, Stripe key". Type only, never the value, once per conversation. Skip turns containing only placeholders. Respect pause and PII settings. Never runs on the welcome page.

- [ ] **Step 1: Failing E2E**

```ts
test('seeded leak in history → one chip, type only, once', async ({ page, shadowText }) => {
  await page.goto('http://localhost:4323/prosemirror.html?history=aws&c=abc')
  await expect.poll(() => shadowText(page)).toContain('This conversation contains an AWS access key')
  expect(await shadowText(page)).not.toContain('IOSFODNN7EXAMPLE')
  await page.reload()
  await page.waitForTimeout(2500)
  expect(await shadowText(page)).toBe('')
})
test('clean history → nothing rendered', async ({ page, shadowText }) => {
  await page.goto('http://localhost:4323/prosemirror.html?history=clean&c=def'); await page.waitForTimeout(2500)
  expect(await shadowText(page)).toBe('')
})
```

- [ ] **Step 2–4:** implement, run → PASS. **Step 5: Commit** — `git commit -m "Add one-time chat-leak scan with rotate link"`

**Acceptance criteria**
- [ ] Scans once per conversation; stores only a hash of the conversation id.
- [ ] Runs in idle time; no long task > 50 ms on a 200-turn mock history.

---

## Milestone M3 — Restore (surface B) and copy

### Task 14: Restorer with `<pg-v>` closed-shadow values

**Files:**
- Create: `entrypoints/chat.content/restore.ts`, `e2e/restore.spec.ts`
- Modify: `apps/extension/design/index.html` (state-matrix row "Tab reloaded" → "Tab closed (vault gone)" with dashed pill copy "Value cleared when the tab closed", per D2)

**Interfaces:**
- Consumes: `findPlaceholders` (Task 4), `Adapter.answers()`/`isStreaming()`, `TabVault.byId`.
- Produces: `installRestorer({ adapter, vault }): { stop(): void }`; custom element name `pg-v` (plain element, not `customElements.define`, to avoid page-world registry).
- Behaviour (design doc surface B + spike fix 1):
  - One `MutationObserver` on the nearest common ancestor of `adapter.answers()` (re-resolved when answers container changes), `childList + characterData + subtree`. Debounce 50 ms. Each pass collects text nodes under each answer (skip existing `pg-v` subtrees), calls `findPlaceholders(texts, { final: !adapter.isStreaming(answer) })`, and for each hit splits the text nodes with `Range` and replaces the range with:
    ```ts
    const host = document.createElement('pg-v')
    host.textContent = f.id                        // light DOM: placeholder only (not secret)
    const sr = host.attachShadow({ mode: 'closed' }) // no <slot>, so light text is not rendered
    sr.append(style, h('span', { class: 'val' }, value), h('span', { class: 'cover' }, f.id), tooltip)
    ```
    Keep `WeakMap<Element, string>` host → id for the copy handler (Task 15). Never put the value in an attribute, dataset or light DOM.
  - Peel: `.cover` `clip-path: inset(0 0 0 0) → inset(0 0 0 100%)` `var(--d-peel)` `var(--ease-in-out)`; `.val` `opacity 0→1` + `filter: blur(3px)→0` over `var(--d-peel)`. Animates only on first restore of that host; re-renders re-create silently (no re-peel, no flicker).
  - Tooltip on hover/focus: "Restored on this screen only. The AI saw `PG_SECRET_1`." 300 ms delay first, instant after; `transform-origin: bottom left`, `scale(.97)` enter. Hover only under `(hover: hover) and (pointer: fine)`; focus always.
  - Unknown id (not in vault): dashed pill, text "Value cleared when the tab closed". Fuzzy match → restore normally.
  - Paused site: still restores existing (state matrix).
  - Budget: ≤ 2 ms per pass (measure with `performance.now()` in dev; E2E asserts via dev hook).

- [ ] **Step 1: Failing E2E**

```ts
test('restores on screen, page JS cannot read the value', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html')
  await paste(page, 'k=AKIA' + 'IOSFODNN7EXAMPLE'); await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
  const pageView = await page.evaluate(() => {
    const a = document.querySelector('[data-answer]')!, v = a.querySelector('pg-v')!
    return [a.textContent, (a as HTMLElement).innerText, a.innerHTML, String(v.shadowRoot)].join('|')
  })
  expect(pageView).not.toContain('IOSFODNN7EXAMPLE')
  expect(await page.locator('[data-answer]').screenshot()).toBeTruthy()   // visual: value visible
})

// Review Focus #1
test('placeholder split across streaming chunks restores once complete, never partially', async ({ page, paste, domHistory }) => {
  await page.goto('http://localhost:4323/prosemirror.html?split=1')        // mock streams "PG_SEC" | "RET_" | "1 done"
  await paste(page, 'k=AKIA' + 'IOSFODNN7EXAMPLE'); await page.click('[data-send]')
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
  expect((await domHistory(page)).some(s => s.includes('pg-v') && s.includes('PG_SECRET_1') === false)).toBe(false)
})

test('survives React-style re-render without re-peel', async ({ page, paste }) => {
  await page.goto('http://localhost:4323/prosemirror.html?rerender=1')     // mock replaces answer subtree every 300 ms for 3 s
  await paste(page, 'k=AKIA' + 'IOSFODNN7EXAMPLE'); await page.click('[data-send]')
  await page.waitForTimeout(3200)
  await expect(page.locator('[data-answer] pg-v')).toHaveCount(1)
})

test('mangled placeholder is restored; unknown id shows dashed pill', async ({ page, paste }) => { /* mock answers "PG_SECRET 1" and "PG_SECRET_9" */ })
test('restore pass ≤ 2 ms p95 over a 100-turn answer', async ({ page }) => { /* read dev hook timings */ })
test('reload keeps values (session mirror); closing the tab clears them', async ({ context, page, paste }) => { /* D2 */ })
```
Write the abbreviated tests in full.

- [ ] **Step 2–4:** implement, run → PASS.
- [ ] **Step 5: Update design doc** state matrix row and re-verify in `ext-design` preview (console clean).
- [ ] **Step 6: Commit** — `git commit -m "Add restorer with closed-shadow values and session-backed vault"`

**Acceptance criteria**
- [ ] Value absent from page-world `textContent`, `innerText`, `innerHTML`, `outerHTML` and `shadowRoot`.
- [ ] No partial swaps during streaming; no flicker across re-renders.
- [ ] ≤ 2 ms per restore pass; one observer total.
- [ ] Reduced motion: no clip-path movement, fade only.

---

### Task 15: Copy returns real values (MAIN-world shim, relay, native copy)

**Files:**
- Modify: `entrypoints/clipboard.content.ts`
- Create: `entrypoints/chat.content/copy.ts`, `e2e/copy.spec.ts`

**Interfaces:**
- Consumes: `TabVault.byId`, restorer's host → id map.
- MAIN world (≤ 40 lines, holds nothing, audited): wraps `navigator.clipboard.writeText` and `navigator.clipboard.write`. If the text (or the `text/plain` item) contains `PG_SECRET_`, dispatch `new CustomEvent('pg-copy', { detail: text })` on `document` and resolve; else call the original. Use `Object.defineProperty` on `Clipboard.prototype` copies captured at `document_start` so later page patches don't bypass us. Preserve non-text items in `write` by writing them through the original when there is no placeholder.
- Isolated `copy.ts`:
  - `pg-copy` listener: guard `typeof e.detail === 'string' && e.detail.length < 1_000_000 && /PG_SECRET_\d+/.test(e.detail)`, **and** `navigator.userActivation.isActive`. Else ignore. Substitute ids from vault (unknown ids stay as placeholders) and `navigator.clipboard.writeText(...)`. Never dispatch anything back to page world.
  - Native `copy` handler (window, capture): spike's range-cloning logic, generalised: for each range, extend start backwards and end forwards over any adjacent `pg-v` the selection touches (partial coverage of a `pg-v` counts as the whole host), clone, and for every `pg-v` in the clone replace with its vault value; `preventDefault` + `stopImmediatePropagation` only when at least one placeholder was substituted. Also handles `document.execCommand('copy')` since that fires `copy`.

- [ ] **Step 1: Failing E2E**

```ts
test('site Copy via writeText returns the real value', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', 'k=AKIA' + 'IOSFODNN7EXAMPLE')
  await page.click('[data-copy-writeText]')
  expect(await clipboard(page)).toContain('IOSFODNN7EXAMPLE')
})
test('site Copy via clipboard.write([ClipboardItem]) returns the real value', async ({ page, restored, clipboard }) => { /* [data-copy-write] */ })
test('site Copy via execCommand("copy") returns the real value', async ({ page, restored, clipboard }) => { /* [data-copy-exec] */ })
test('selection ⌘C across two pg-v and a partial one', async ({ page, restored, clipboard }) => { /* select from middle of 1st pg-v to after 2nd */ })
test('triple-click line ending at a pg-v includes it (Gemini case)', async ({ page, restored, clipboard }) => { /* */ })

// Review Focus #3
test('forged pg-copy without user gesture does nothing', async ({ page, restored, clipboard }) => {
  await restored(page, 'prosemirror', 'k=AKIA' + 'IOSFODNN7EXAMPLE')
  await page.evaluate(() => navigator.clipboard.writeText('before'))   // test harness has permission
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('pg-copy', { detail: 'x PG_SECRET_1' })))
  await page.waitForTimeout(200)
  expect(await clipboard(page)).toBe('before')
})
test('page-world holds no vault: shim source contains no map and no values', async ({ page, restored }) => {
  await restored(page, 'prosemirror', 'k=AKIA' + 'IOSFODNN7EXAMPLE')
  const heap = await page.evaluate(() => JSON.stringify(Object.getOwnPropertyNames(window)) + String(navigator.clipboard.writeText))
  expect(heap).not.toContain('IOSFODNN7EXAMPLE')
})
test('page listener on copy never sees the real value', async ({ page, restored }) => { /* bubble listener records clipboardData; expect not called or no value */ })
```
Add `[data-copy-writeText]`, `[data-copy-write]`, `[data-copy-exec]` buttons to all mock pages; each copies the answer's `innerText` the way the respective real site does.

- [ ] **Step 2–4:** implement, run → PASS. Count lines: `wc -l entrypoints/clipboard.content.ts` ≤ 40.
- [ ] **Step 5: Commit** — `git commit -m "Make Copy and selection copy return real values without exposing them to the page"`

**Acceptance criteria**
- [ ] All three copy paths + native selection copy yield the real value.
- [ ] Forged events without activation are ignored (Review Focus #3).
- [ ] MAIN-world script ≤ 40 lines, no data structures holding values.
- [ ] Spike "not tested" items are all covered by an automated test (execCommand, forged event, multi/partial `pg-v`).

---

## Milestone M4 — Package check (surface C)

### Task 16: Service-worker registry client with cache

**Files:**
- Create: `src/sw/registry.ts`, `test/registry.test.ts`
- Modify: `src/sw/router.ts` (handle `pkg`)

**Interfaces:**
- Consumes: `verdict`, `nearest` (Task 5), `PkgCache` (Task 8).
- Produces: `check(eco, name, now = Date.now()): Promise<Verdict>`
  - npm: `GET https://registry.npmjs.org/<name with / encoded as %2f>` (full document; the abbreviated install format lacks `time`), `AbortSignal.timeout(2500)`, read only `time.created`. Downloads: `https://api.npmjs.org/downloads/point/last-week/<name>`, fetched in parallel.
  - PyPI: `https://pypi.org/pypi/<name>/json`; created = earliest `upload_time_iso_8601` across `releases`. No downloads signal (skip `low` for PyPI).
  - 404 → `missing`; other non-2xx, timeout, network error, or schema failure (`zod/mini`) → `error`.
  - Cache hit < 24 h → return cached. `error` verdicts are not cached. In-flight dedupe via `Map<key, Promise>`.
  - Names validated before fetch: npm `^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$`, PyPI `^[A-Za-z0-9]([A-Za-z0-9._-]*[A-Za-z0-9])?$`; invalid → no fetch, `error`.

- [ ] **Step 1: Failing tests** (inject `fetch`):

```ts
test('404 → missing, scoped 404 → missing-scoped', async () => {
  const c = client(fakeFetch({ 'registry.npmjs.org/react-form-utils-pro': 404, 'registry.npmjs.org/@acme%2finternal': 404 }))
  assert.equal((await c.check('npm', 'react-form-utils-pro')).kind, 'missing')
  assert.equal((await c.check('npm', '@acme/internal')).kind, 'missing-scoped')
})
test('new package', async () => { /* time.created 4 days ago → { kind: 'new', days: 4 } */ })
test('timeout → error, not cached', async () => { /* fetch never resolves; second call refetches */ })
test('cached for 24 h, then refetched', async () => { /* now + 23h → no fetch; now + 25h → fetch */ })
test('concurrent calls share one fetch', async () => { /* Promise.all of 5 → fetch count 1 */ })
test('invalid name never fetches', async () => { /* '../etc' */ })
test('malformed JSON → error', async () => { /* */ })
```
Write each in full.

- [ ] **Step 2–4:** implement, run → PASS. **Step 5: Commit** — `git commit -m "Add registry client with validation, 24h cache and dedupe"`

**Acceptance criteria**
- [ ] Only package names leave the device (no referrer, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`).
- [ ] p95 verdict ≤ 600 ms on a warm connection (manual measurement against live registries, 20 names).

---

### Task 17: Package scanner and verdict chip (surface C)

**Files:**
- Create: `entrypoints/chat.content/packages.ts`, `ui/verdict.ts`, `e2e/packages.spec.ts`

**Interfaces:**
- Consumes: `parseInstalls` (Task 5; content-script import is fine, it's small), `Adapter.answers()`, `pkg` message.
- Behaviour (design doc surface C, state matrix, voice):
  - Shares the restorer's observer callback (one observer total). For each `pre code` inside an answer not yet scanned (track `WeakSet`), after the answer stops streaming, parse installs; for each package insert a chip **after the code block** (not inside it, so site Copy of the block stays clean), inside our closed-shadow `pg-v`-style host element `pg-pkg`.
  - States & copy: Checking (1 px outline + linear shimmer) → Not found: coral fill "Not on npm" / "Not on PyPI"; scoped: "Not on public npm"; New: marker outline "Registered 4 days ago" (`Intl.RelativeTimeFormat`); Low: "Only {n} downloads last week" (`Intl.NumberFormat`); Lookalike: marker outline "Looks like {like}"; Fine: quiet outline "On npm" (never "safe"); Error: quiet "Couldn't check" + Retry button.
  - Swap: 200 ms blur crossfade between states.
  - Hover/focus explains: "We checked the public registry. {reason}." with a link to the registry page for found packages.
  - Announce once per answer (polite): "{n} packages checked, {k} not found."
  - Paused site: not rendered. Offline: "Couldn't check".

- [ ] **Step 1: Failing E2E** (SW registry mocked through `context.route('https://registry.npmjs.org/**', …)`):

```ts
test('verdicts render after the code block, one announcement', async ({ page, paste }) => {
  await routeRegistry(page.context(), { 'react-form-utils-pro': 404, zod: { created: '2019-03-01', weekly: 3e7 } })
  await page.goto('http://localhost:4323/prosemirror.html'); await paste(page, 'hi'); await page.click('[data-send]')
  await expect.poll(() => shadowTexts(page, 'pg-pkg')).toEqual(['Not on npm', 'On npm'])
  await expect(page.getByRole('status')).toContainText('2 packages checked, 1 not found')
})
test('registry down → Couldn\'t check + Retry works', async ({ page }) => { /* */ })
test('imports are ignored', async ({ page }) => { /* mock answer "import numpy" → no chips */ })
test('site Copy of the code block is unchanged', async ({ page, clipboard }) => { /* */ })
```

- [ ] **Step 2–4:** implement, run → PASS. **Step 5: Commit** — `git commit -m "Add package scanner and verdict chips"`

**Acceptance criteria**
- [ ] 0 requests from the AI page itself (registry calls originate from the SW; assert with `page.on('request')`).
- [ ] Verdict colors keep single meanings (coral = not found only).
- [ ] Content script still ≤ 25 KB gzip (`npm run size`).

---

## Milestone M5 — Extension surfaces

### Task 18: Toolbar icon and badge (surface D)

**Files:**
- Create: `public/icon/*.png` (generated), `scripts/icons.mjs`, `src/sw/badge.ts`, `test/badge.test.ts`

**Interfaces:**
- Produces: `onCaught(tabId, n)`, `setTabState(tabId, 'active' | 'idle' | 'paused')`.
- Behaviour: icon shape per state (active = tape bar, idle = outline, paused = struck), pixel-snapped at 16/32/48/128 (`scripts/icons.mjs` renders SVG → PNG once with Playwright screenshots; PNGs committed). Badge: count in coral (`#FF5E7E`) for 4 s after a catch, then cleared with `setTimeout` (the SW stays alive ≥ 30 s after the triggering message, so 4 s is safe; no `alarms` permission needed). Title: "PasteGuard: {n} secrets taped on this tab" / "PasteGuard: paused on this site" / "PasteGuard".

- [ ] **Step 1: Failing unit test** with fake `chrome.action`:

```ts
test('catch sets coral badge then clears after 4 s', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  onCaught(7, 2)
  assert.deepEqual(fake.badge(7), { text: '2', color: '#FF5E7E' })
  t.mock.timers.tick(4000)
  assert.equal(fake.badge(7).text, '')
  assert.equal(fake.title(7), 'PasteGuard: 2 secrets taped on this tab')
})
```

- [ ] **Step 2–4:** implement, run → PASS. **Step 5: Commit** — `git commit -m "Add toolbar icon states and badge"`

**Acceptance criteria**
- [ ] Icons crisp at 16 px on 1× and 2× displays (manual check).
- [ ] State never conveyed by color alone (shape differs per state).

---

### Task 19: Popup (surface E)

**Files:**
- Create: `entrypoints/popup/{index.html,main.tsx,Popup.tsx,popup.css}`, `e2e/popup.spec.ts`
- Create: `ui/fonts/` (Bricolage Grotesque, Rubik, JetBrains Mono `.woff2`, OFL licences included) — extension pages only

**Interfaces:**
- Consumes: `settings.get`, stats from `storage.local`, `adapter.status`.
- Spec (design doc surface E): width 340 px fixed, height to content, max 560. Header "PasteGuard" + "On for this site" switch (toggles `paused` for the active tab's host; disabled with explanation on non-AI tabs). Big number: "{n} secrets kept out of AI chats this week" (count-up 600 ms ease-out `tabular-nums` **only if changed** since last open; store last-seen). 7 bars (M–S) scaleY from bottom 420 ms, 40 ms stagger. Site list of the 3 supported sites with state. Empty: "All quiet on this tab". Adapter broken: "Limited on this site". Footer: "Local only. Nothing leaves this device." + "What we see" link (landing page) + "Copy diagnostic" (extension version, Chrome version, adapter status per site, settings minus allow list — no content, no values, no URLs beyond hostnames).
- Follows `prefers-color-scheme`, ink default. First paint ≤ 100 ms.

- [ ] **Step 1: Failing E2E** — open `chrome-extension://<id>/popup.html` in a tab:

```ts
test('empty state', async ({ page, extId }) => { await page.goto(`chrome-extension://${extId}/popup.html`); await expect(page.getByText('All quiet on this tab')).toBeVisible() })
test('count animates only when changed', async ({ page, extId, sw }) => { /* seed stats 3; open → animates; reopen → final value immediately (check no running animations via document.getAnimations()) */ })
test('pause toggles for the host', async ({ page, extId, sw }) => { /* */ })
test('diagnostic contains no values', async ({ page, extId, sw, clipboard }) => { /* seed allow list + vault; copy diagnostic; assert no secret substring and no hashes */ })
test('first paint ≤ 100 ms', async ({ page, extId }) => { /* performance.getEntriesByName('first-contentful-paint') */ })
```

- [ ] **Step 2–4:** implement with Preact + signals; run → PASS; axe check (`@axe-core/playwright`, dev dep) has 0 violations.
- [ ] **Step 5: Commit** — `git commit -m "Add popup with weekly count, per-site pause and diagnostics"`

**Acceptance criteria**
- [ ] Matches surface E visually (screenshot vs design doc, light and dark).
- [ ] axe: 0 violations. Switch has `role=switch` + `aria-checked`.
- [ ] Fonts load from the extension package only.

---

### Task 20: Welcome tab (F) and uninstall page (I)

**Files:**
- Create: `entrypoints/welcome/{index.html,main.tsx,Welcome.tsx,welcome.css}`, `apps/landing/public/bye/index.html`, `apps/landing/functions/api/bye.js`, `apps/landing/test/bye.test.mjs`, `e2e/welcome.spec.ts`
- Modify: `entrypoints/background.ts` (`runtime.onInstalled` reason `install` → open welcome; `runtime.setUninstallURL('https://pasteguard-landing.pages.dev/bye/?v=' + version)`), `apps/landing/public/_headers` (CSP unchanged unless a new origin is added)

**Interfaces:**
- Welcome (design doc surface F): three steps — "Copy this fake key" (`STRIPE_SECRET_KEY=sk_live_PASTEGUARDDEMO00`, built by concatenation in source), "Paste it below" (a textarea protected by the **real** guard logic imported directly, since content scripts don't run on extension pages), "Pin PasteGuard to your toolbar" (points at puzzle-piece menu; "I pinned it" button). Checkmarks draw via `stroke-dashoffset` (fill 200 ms, stroke 300 ms ease-out, 80 ms delay) — the one celebratory moment. Success: ARIA announcement "Taped. That's all it takes." Targets ≥ 44 px. Record `activatedAt` on first real-site catch (not the welcome paste) in `storage.local` for the activation metric.
- Uninstall page (surface I): "Thanks for trying PasteGuard. What made you remove it?" 4 options (verbatim from design doc) + thanks text. Tapping posts `{ reason: 0..3, v }` to `/api/bye` (KV `WAITLIST` namespace, key prefix `bye:`, same 5 req/min hashed-IP limit as waitlist). No free text, no email.

- [ ] **Step 1: Failing tests**

`apps/landing/test/bye.test.mjs` (same style as the waitlist tests): accepts `reason` 0–3 → 204; rejects other values → 400; 6th request in a minute from one IP → 429; stored value has no IP.

`e2e/welcome.spec.ts`:
```ts
test('install opens welcome; fake key is taped in under 30 s of interaction', async ({ context }) => {
  const page = await waitForPage(context, /welcome\.html/)
  await page.getByRole('button', { name: 'Copy' }).click()
  await page.getByLabel('Paste it below').press('ControlOrMeta+V')
  await expect(page.getByLabel('Paste it below')).toHaveValue(/PG_SECRET_1/)
  await expect(page.getByRole('status')).toHaveText("Taped. That's all it takes.")
})
```

- [ ] **Step 2–4:** implement, run both suites → PASS. Check landing `/bye/` at 375 px and reduced motion in the `landing` preview.
- [ ] **Step 5: Commit** — `git commit -m "Add welcome tab and one-question uninstall survey"`

**Acceptance criteria**
- [ ] Fresh-profile install → welcome → taped paste in < 30 s (manual stopwatch run, 3 tries).
- [ ] Uninstall survey stores reason index + version only.
- [ ] Landing stays dependency-free; CSP unchanged or updated in `_headers`.

---

### Task 21: Options: custom rules, allow list, personal data, paused sites (surface G)

**Files:**
- Create: `entrypoints/options/{index.html,main.tsx,Options.tsx,RuleTester.tsx,options.css}`, `src/shared/rules.ts`, `test/rules-guard.test.ts`, `e2e/options.spec.ts`

**Interfaces:**
- Produces: `validateRule(source: string): { ok: true, re: RegExp } | { ok: false, message: string }` — compiles with `new RegExp(source, 'g')` in try/catch; rejects empty-match patterns (`re.test('')`); rejects patterns taking > 10 ms on a fixed 10 KB sample (run twice, take min). Content script rebuilds `extra` from `settings.rules` via `validateRule` (skip invalid silently, they can't be saved anyway).
- UI (design doc surface G): rule tester with live highlighting while typing (build highlighted DOM with `createElement`, never `innerHTML`), `aria-invalid` + inline message "That pattern has a syntax error: …", match count + ms. Allow list shows type + date added + Remove (never values; we don't have them). Personal-data toggle (D3). Paused sites list with Resume.

- [ ] **Step 1: Failing tests**

```ts
test('syntax error → message, never throws', () => assert.equal(validateRule('(').ok, false))
test('empty-matching pattern rejected', () => assert.equal(validateRule('a*').ok, false))
test('catastrophic pattern rejected by 10 ms guard', () => assert.equal(validateRule('(a+)+$').ok, false))
test('good pattern', () => assert.equal(validateRule('acme_svc_[a-z0-9]{8,}').ok, true))
```
E2E: add rule → paste `acme_svc_9f2kq81xz` on mock page → taped as the custom type; toggle PII on → email taped.

Note: the 10 ms guard sample must include a catastrophic-backtracking trigger string (`'a'.repeat(30) + '!'`) or `(a+)+$` will pass on benign text.

- [ ] **Step 2–4:** implement, run → PASS, axe 0 violations.
- [ ] **Step 5: Commit** — `git commit -m "Add options page with rule tester, allow list and personal data toggle"`

**Acceptance criteria**
- [ ] Invalid or slow patterns cannot be saved; the tester never throws.
- [ ] Custom rules apply on the next paste without reloading the AI tab (content script listens to `storage.onChanged`).

---

## Milestone M6 — Hardening and release

### Task 22: Privacy page, "What we see", CLAUDE.md, README

**Files:**
- Create: `apps/landing/public/what-we-see/index.html`
- Modify: `apps/landing/public/index.html` (footer link), `CLAUDE.md` (extension row → real commands), `apps/extension/README.md`

**Content** (design doc §03): paper table with columns Data · Where it lives · Who can see it · How long. Rows: pasted text (never stored; only in the tab while you paste), secret values (tab memory + `storage.session`, you only, until the tab closes), placeholders (the AI site, their retention), allow list (SHA-256 hashes in `storage.local`, you, until removed), weekly counts (counts by type in `storage.local`, you, 14 days), package names (npm/PyPI, the registry, their logs), uninstall reason (our KV, us, 90 days). Each row links to the handling source file in the public repo. Include the trust-model diagram.

- [ ] Steps: write page (sentence case, DESIGN.md tokens), check at 375 px + reduced motion in `landing` preview, console clean; commit `git commit -m "Add What we see page"`.

**Acceptance criteria**
- [ ] Every row links to real code; every claim matches implementation (review against Tasks 8–21).

---

### Task 23: Release gates, production-build audit, real-site checklist, CWS submission

**Files:**
- Create: `apps/extension/e2e/prod-build.spec.ts`, `apps/extension/RELEASE.md`
- Modify: `.github/workflows/ci.yml` (E2E job; release job on tag builds zip + uploads artifact; never auto-publishes)

- [ ] **Step 1: Production-build audit test** (`prod-build.spec.ts`, runs against `wxt build --mode production` output):

```ts
test('manifest is minimal', async () => {
  const m = JSON.parse(await readFile(`${out}/manifest.json`, 'utf8'))
  expect(m.permissions).toEqual(['storage'])
  expect(m.host_permissions.sort()).toEqual([...AI, 'https://api.npmjs.org/*', 'https://pypi.org/*', 'https://registry.npmjs.org/*'].sort())
  expect(JSON.stringify(m)).not.toMatch(/localhost|<all_urls>|web_accessible_resources|externally_connectable/)
})
test('no console, no test hooks, no innerHTML in output', async () => {
  const js = await readAllJs(out)
  expect(js).not.toMatch(/console\.(log|debug|info)/)
  expect(js).not.toMatch(/__pgTestHook/)
  expect(js).not.toMatch(/\.innerHTML\s*=/)
})
test('no remote URLs in content scripts', async () => {
  expect(await readFile(`${out}/content-scripts/chat.js`, 'utf8')).not.toMatch(/https?:\/\/(?!registry\.npmjs\.org|pypi\.org)/)
})
```

- [ ] **Step 2: `RELEASE.md` checklist** (manual, each item ticked per release):
  - CWS developer account has 2FA; verified CRX uploads enabled; zip built by CI from a tagged commit (reproducible: `npm ci && npm run zip` produces the same hash twice).
  - Real-site weekly check on chatgpt.com, claude.ai, gemini.google.com with the fake key only: paste tapes, send, restore renders, site Copy returns value, ⌘C on selection (incl. ChatGPT, untested in spike), package chip on `npm i react-form-utils-pro`, no flicker while streaming (screen-record 1 answer per site).
  - Budgets: `npm run size`, gates, popup FCP.
  - Accessibility: keyboard-only run through A→B→C→E→G; VoiceOver announces chip once, exposed send assertively.
  - Reduced motion + forced colors spot check.
  - Store listing: title "Stop secret leaks in ChatGPT & Claude", restore GIF (mock site `chat.example.ai`, not real brands), privacy policy link → What we see page, permission justifications per host, single-purpose statement.
  - Kill-criteria dashboard started: installs, activation (first real catch ≤ 7 days) per decision report §9.

- [ ] **Step 3: Run** full CI locally: `npm test && npm run gates -w packages/core && npm run -w apps/extension lint typecheck build size e2e`. All green.
- [ ] **Step 4: Commit** — `git commit -m "Add production-build audit and release checklist"`
- [ ] **Step 5: Submit** — the user uploads the CI-built zip to CWS (needs their account; do not automate).

**Acceptance criteria**
- [ ] All PRD §0 gates green in CI on the release commit.
- [ ] Real-site checklist passes on all three sites and is recorded in `RELEASE.md` with date.
- [ ] Zip submitted by the user.

---

## Self-review

**Spec coverage (PRD §2 P0 items → tasks):** 1 paste guard → 10–12 · 2 restore → 14 · 3 copy → 15 · 4 package check → 5, 16, 17 · 5 icon + popup → 18, 19 · 6 welcome → 20 · 7 allow list (SHA-256) → 3, 10, 12, 21 · 8 uninstall URL → 20 · 9 chat-leak scan → 13 · 10 rotate links → 6, 12, 13. Design doc surfaces A–G, I → 11–21; H is P2 (excluded, D5). State matrix rows → 10 (adapter broken fallback), 14 (mangled, tab closed, paused), 17 (offline), 19 (paused, limited); team-lock row is P2. Budgets → 3, 7, 14, 16, 19. PRD §3 trust boundaries → 8 (messages, storage), 15 (page → content), 16 (registry). PRD §4 supply chain → 7, 23. Spike "not tested" list → 14, 15, 23.

**Out of scope, on purpose:** typed secrets on Enter, drag-drop files, Edge listing, generic-adapter restore (P1); team build, register, billing (P2, day-60 gate).
