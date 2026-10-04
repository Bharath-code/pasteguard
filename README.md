# PasteGuard

A local-first Chrome extension that stops secrets being pasted into AI chats and flags made-up packages in AI answers.

[![ci](https://github.com/Bharath-code/pasteguard/actions/workflows/ci.yml/badge.svg)](https://github.com/Bharath-code/pasteguard/actions/workflows/ci.yml)

Status: pre-launch. Version 0.1.1 builds and passes CI. It is not on the Chrome Web Store yet, and the real-site check on chatgpt.com, claude.ai and gemini.google.com is still open (see [`apps/extension/RELEASE.md`](apps/extension/RELEASE.md)).

Live landing page: https://pasteguard-landing.pages.dev

## What it does
- **Paste guard.** Detects a secret as you paste, replaces it with a `PG_SECRET_n` placeholder and shows a chip. `Enter` sends the placeholder, `Esc` undoes, holding `Enter` for one second sends the original.
- **Restore.** Your real value is shown again in the AI's answer, in that tab only. The site's Copy button returns the real value.
- **Package check.** Install commands in code blocks (`npm i`, `pnpm add`, `pip install`, `uv add`) are checked against npm and PyPI.
- **Chat-leak scan.** Names the key type in an old conversation and links to the provider's rotate page. It never shows the value.

Supported sites: chatgpt.com, claude.ai, gemini.google.com.

## Privacy model
- Detection runs on the device. Chat content is never sent anywhere.
- The vault is `chrome.storage.session`: memory only, cleared when the browser closes.
- The allow list stores a SHA-256 of a value, never the value.
- The only network calls are public package registries (package name only) and the landing page (waitlist email, uninstall survey).
- Every piece of data touched is listed on the [What we see page](apps/landing/public/what-we-see/index.html). Update that table in the same change whenever data handling changes.

## Try it
Requires Node 22 or later.

```bash
npm ci
npm run build -w apps/extension
```

Open `chrome://extensions`, turn on Developer mode, choose Load unpacked and select `apps/extension/.output/chrome-mv3`. The welcome tab walks you through a first catch with a fake key. Use only fake keys when testing on real sites.

## Repository layout
| Path | What |
|---|---|
| `apps/extension` | MV3 extension built with WXT and Preact. See its [README](apps/extension/README.md) and [release checklist](apps/extension/RELEASE.md). |
| `apps/extension/design` | Living UI and UX spec: motion, states, accessibility, budgets, voice. |
| `packages/core` | `src/detect.js` is the single source of truth for secret detection and `redact()`. |
| `apps/landing` | Static landing page, waitlist and survey API on Cloudflare Pages. |
| `research/slopsquatting` | Zero-dependency study of how often LLMs recommend packages that do not exist. |
| `.claudedocs` | Product decision report, GTM, PRD and architecture. |

## Development
| Task | Command |
|---|---|
| All unit tests | `npm test` |
| Detection accuracy gates | `npm run gates -w packages/core` |
| Extension dev build with HMR | `npm run dev -w apps/extension` |
| Lint, types, size budget | `npm run lint\|typecheck\|size -w apps/extension` |
| End-to-end tests (Playwright, mock AI pages) | `npm run e2e -w apps/extension` |
| Store package | `npm run zip -w apps/extension` |
| Landing page locally | `npm run dev -w apps/landing` |
| Sync detector copy to landing | `npm run sync -w apps/landing` |

Conventions:
- Tests use `node --test`, with Playwright for end-to-end. No other test frameworks.
- The landing site stays dependency-free. Keep the CSP in `apps/landing/public/_headers` in sync when adding origins.
- Never use `innerHTML` with user input. Never log, store or display a secret value outside the user's own conversation.
- The extension is MV3 with no remote code and minimal host permissions, never `<all_urls>`.
- Every statistic needs a numbered source. Sample data is labelled as sample.

## Quality gates
CI runs on every push and pull request: core tests and typecheck, then extension lint, typecheck, build, size and end-to-end checks. The content script must stay under 25 KB gzip, and accessibility checks (axe) must report no violations.

## Releasing
1. Bump `version` in `apps/extension/package.json`, merge, then tag `vX.Y.Z`.
2. The tag run builds the zip and uploads it as the `pasteguard-extension-zip` artifact. CI never publishes.
3. Work through [`apps/extension/RELEASE.md`](apps/extension/RELEASE.md) and upload the zip to the Chrome Web Store yourself.

## Deploy the landing page
```bash
cd apps/landing
npx wrangler kv namespace create WAITLIST   # paste the id into wrangler.toml
npm run deploy
```
The waitlist API allows 5 requests per minute per hashed IP, counted in KV under `rl:` keys that expire after 2 minutes. Export signups:

```bash
npx wrangler@latest kv key list --binding WAITLIST --remote --prefix team:
```

Use `--prefix individual:` for individual signups.

## Reporting a security issue
Please use GitHub's private vulnerability reporting on this repository rather than a public issue.

## License
No license file has been added yet. Until one is, all rights are reserved.
