# PasteGuard monorepo

@DESIGN.md

A local-first Chrome extension that stops secrets being pasted into AI chats and flags hallucinated packages inside AI answers. Paid Team tier = AI-tool register for audits. Solo founder, zero budget, pre-MVP.

## Layout
| Path | What | Commands |
|---|---|---|
| `apps/landing` | Static site (no framework, incl. `/what-we-see/` data table; keep it true to the code) on Cloudflare Pages + `functions/api/waitlist.js` (KV `WAITLIST`, 5 req/min per hashed IP). Live: https://pasteguard-landing.pages.dev | `npm test` · `npm run dev` · `npm run deploy` |
| `packages/core` | `src/detect.js` is the single source of truth for secret detection rules + `redact()`; `apps/landing/public/detect.js` is a synced copy (`npm run sync`). | `npm test -w packages/core` |
| `apps/extension` | MV3 extension (WXT + Preact). Layout in its `README.md`. | `npm run dev\|build\|lint\|typecheck\|size\|zip -w apps/extension` |
| `apps/extension/design/index.html` | Living UI/UX design doc: surfaces, motion tokens, a11y, budgets, state matrix, voice. Interactive demos import `detect.js`. | preview `ext-design` (serves `apps/` on :4322 → `/extension/design/`) |
| `research/slopsquatting` | Zero-dependency study: how often LLMs recommend nonexistent packages. Feeds the "Slopsquatting Index" content. | `npm test` · `node study.mjs prompts\|run\|check\|report` |
| `.claudedocs` | Strategy reports: `extension-decision-report.md` (product, feasibility, kill criteria), `gtm-strategy.md` (market size, moat, GTM), `product-strategy.md` (competitor matrix, wow moments, horizons, north star), `extension-prd-architecture.md` (PRD, stack, architecture, screen flow, build plan). | — |

Node ≥ 22 everywhere. Tests use `node --test`, no frameworks.

## Before building, read
- Extension UI → `apps/extension/design/index.html` first; its specs (durations, easing, states, copy) are binding.
- Extension logic → `.claudedocs/extension-decision-report.md` §11 (feasibility spike results, component matrix, hard limits).
- Anything user-facing → copy rules in `DESIGN.md` and the design doc's Voice table.

## Product decisions (don't relitigate without new evidence)
- Warn and redact, never block by default. Sending the original takes press-and-hold.
- Detection 100% on-device. Server only ever gets metadata (tool, timestamp, user, event type), never content.
- Placeholders are `PG_SECRET_n` (identifier-style, so syntax highlighters keep them as one token). Vault = `chrome.storage.session`, memory only.
- Package check only parses install commands (`npm i`, `pnpm add`, `pip install`, `uv add`…) in code blocks, never Python imports.
- Two builds, one codebase: public (AI chat domains + registries only) and team (adds `webNavigation`, `management`, `identity.email`, force-installed).
- Kill criteria and 30/60/90-day gates live in the decision report §9. Check them before adding scope.

## Rules
- Security: never use `innerHTML` with user input (use `textContent`/`createElement`). Never log, store or display secret values outside the user's own conversation.
- Landing: stay dependency-free. Keep the CSP in `apps/landing/public/_headers` in sync when adding origins.
- Extension: MV3, no remote code, no remote fonts or network requests on AI pages. In-page UI lives in a closed shadow root in the top layer (`popover="manual"`). Minimal host permissions, never `<all_urls>`.
- Motion: follow the design doc's frequency table. Keyboard actions never animate; animate only transform/opacity/clip-path/filter; always honour `prefers-reduced-motion`.
- Research ethics: never install or execute packages, never register hallucinated names, report malicious packages to the registry before publishing.
- Claims: every stat needs a numbered source. Never invent users, logos, testimonials or data. Sample data must be labelled as sample.
- Mock AI sites in docs and marketing use generic names (`chat.example.ai`), not real brands.

## Verify changes
- Logic: run the relevant `npm test`.
- Landing or design doc: open the preview (`landing` on :4321, `ext-design` on :4322), check the console, click through the demo, check phone width (375px) and reduced motion.
