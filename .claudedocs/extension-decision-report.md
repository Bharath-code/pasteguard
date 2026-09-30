# Chrome Extension Decision Report — 2026-09-29

## TL;DR
- **Build:** a merged version of #4 and #5, working name **"PasteGuard"**. It's a free, local-only guard for developers that stops secrets from being pasted into AI chats and flags hallucinated or brand-new packages *inside ChatGPT/Claude answers*. The paid **Team** tier turns it into an **AI-tool register** you can export as ISO 42001 / EU AI Act Art. 4 inventory evidence.
- **Kill:** #5 as a standalone product (Socket already ships it free), and #2 and #3 as revenue plays.
- **Keep as a side wedge:** #1, but only if it's repositioned (see below). As first pitched it has a fatal flaw.
- **Verdict:** proceed, **gated by kill criteria** (see §8). Don't pivot yet. None of these has been validated with users.

---

## 1. Reality check on each idea (the research changed the ranking)

| # | Idea | What research found | Verdict |
|---|------|---------------------|---------|
| 1 | LLM API DevTools panel | **Fatal flaw:** production apps call OpenAI and Anthropic *from the server* (keys can't live in the browser). The browser only sees your own backend's stream, so "decode OpenAI/Anthropic streams" rarely applies. Free SSE viewers already exist (SSE Inspector, SSE Viewer, Stream Panel, sse-devtools-panel), plus the OSS LLM-Inspector. Server-side observability (Helicone, Langfuse) owns cost tracking. | Reposition as an **AI SDK / AG-UI UI-stream inspector** (tool-call parts, reasoning, TTFT, tokens/sec). Good for building an audience; weak for revenue. |
| 2 | Docs → Markdown | Crowded, low willingness to pay, and Firecrawl and others already do it. | Skip. At most a weekend project to grow an audience. |
| 3 | Cloudflare dashboard power-ups | Small audience that expects it to be free, and every dashboard redesign breaks the extension. | Skip for revenue. |
| 4 | Shadow AI detector | The market is real and validated by money: SentinelOne bought Prompt Security for about $300M (2025), and Harmonic, LayerX, Nightfall and ShadowLock (MSP-focused) all compete. **Chrome Enterprise Premium has native GenAI DLP.** Enterprise buyers are taken. The **SMB, dev-team, compliance-evidence** segment is underserved. | **Build, with a narrowed angle.** |
| 5 | npm/GitHub risk badges | **Socket's free extension already does this** on npm/PyPI/Go/Maven pages, and it has VC funding. | Kill it standalone. **Salvage the unique slice:** flag hallucinated packages *in AI chat answers*, which Socket doesn't cover. That slice folds into #4. |
| 6 | PR context for GitHub | Overlaps with Refined GitHub. Team analytics competes with LinearB, Swarmia and Graphite. | Skip. |

### Scored ranking (1–5, higher is better)

| Idea | Pain intensity | Willingness to pay | Distribution | Defensibility | Fit with your assets | Speed to MVP | **Total** |
|---|---|---|---|---|---|---|---|
| **#4+5 merged (PasteGuard)** | 4 | 4 (team) | 4 | 3 | 5 (compliance scanner, git-scope) | 4 | **24** |
| #1 repositioned | 3 | 2 | 4 | 2 | 4 | 5 | 20 |
| #4 as pitched | 4 | 4 | 2 | 2 | 5 | 3 | 20 |
| #6 | 2 | 3 | 3 | 1 | 4 | 3 | 16 |
| #5 standalone | 3 | 2 | 3 | 1 | 3 | 4 | 16 |
| #2 | 2 | 1 | 4 | 1 | 2 | 5 | 15 |
| #3 | 2 | 1 | 2 | 2 | 5 | 4 | 16 |

---

## 2. The pain (why people pay)

**Individual devs:** "I just pasted a `.env` into ChatGPT." "The AI told me to `npm i` a package that doesn't exist, or one someone registered last week." Both are real and documented:
- Slopsquatting is now in the OWASP NPM Security and Secure-Coding-with-AI cheat sheets. A hallucinated `huggingface-cli` package got 30k+ real downloads.
- Malicious "AI helper" extensions with 900k+ installs exfiltrated chat histories (OX Security, Jan 2026). Urban VPN intercepted AI chats from 8M users. **Trust is the whole game:** being local-only and open source is the differentiator, not a footnote.

**Team leads / CTO / compliance at 20–500-person companies:**
- "An auditor or customer security questionnaire asks: *which AI tools does your staff use, and with what data?* We have no answer."
- EU AI Act **Art. 4 AI literacy has applied since 2 Feb 2025**, and guidance recommends keeping an AI-system inventory. High-risk obligations moved to **2 Dec 2027** (Omnibus, in force 27 Jul 2026). That lowers the urgency for high-risk systems, but inventory and literacy evidence is needed *now*.
- ISO 42001 certification requires an AI-system inventory. Vanta and Drata customers are being asked for it in vendor reviews.

**Buyer ≠ user.** Devs install it free. The team lead pays for the register. This is the "individual first, then team budget" motion.

---

## 3. Competitor map

| Segment | Players | Their gap you can exploit |
|---|---|---|
| Enterprise AI DLP | Prompt Security (SentinelOne), Harmonic, LayerX, Nightfall, SquareX | Sales-led, priced for enterprise, heavy agents, long rollouts. Out of reach for a 40-person startup. |
| Browser-native | **Chrome Enterprise Premium** GenAI DLP | Paid add-on, Google-admin-centric, generic DLP rather than dev-specific (no package checks, no dev secret formats), and no compliance-register export. **This is the biggest platform risk.** |
| MSP tools | ShadowLock | Built for MSP resale, not self-serve for devs. |
| Free/OSS toys | Prompt Seal, ShadowGuard, SHADOW-AI (GitHub) | No team tier, no register, no maintenance commitment. Validates demand but isn't a business. |
| Package risk | Socket extension, slopcheck CLI, Aikido | Registry pages and CI only. **None annotate AI chat answers in place.** |

**Positioning line:** *"The AI safety net for dev teams. Catches secrets and fake packages before they happen, and gives you the AI-tool register your auditor asks for. Local-first, open source, set up in 10 minutes."*

---

## 4. How to beat competitors and take share
1. **Win the bottom they ignore.** Self-serve, flat pricing, and a 10-minute Google Workspace force-install. Enterprise vendors won't chase $150/mo accounts.
2. **Trust as a weapon.** Open-source client, narrow host permissions (AI domains only, not `<all_urls>`), detection 100% on-device, and the server gets metadata only (tool, timestamp, user, event type; never content). Publish a "what we see" page. Every exfiltration headline becomes free marketing for you.
3. **Dev-specific detection** that generic DLP misses: gitleaks-grade secret rules, `.env` blocks, private keys, JWTs, connection strings, internal hostnames, plus in-chat package verification.
4. **Compliance output, not dashboards.** One click exports an AI-system register (CSV/PDF), mapped to ISO 42001 inventory and AI Act Art. 4 evidence. Your existing code scanner adds the "AI APIs used in code" half. **Browser plus code together gives a complete AI inventory**, and no single competitor has both.
5. **Built-in virality:** every blocked secret shows a small "Protected by PasteGuard" line on the team's weekly digest. A "Share your AI hygiene score" card works for build-in-public posts.

---

## 5. Product: wow moments, UX, DX, AX

### Holy-sh*t moments (design these first)
> **Updated 2026-09-30:** the store scan found reversible redaction already shipped by several free competitors, so it is now a supporting feature, not the headline. See `product-strategy.md` §0 and §3.

1. **"This chat already has a leak."** On the first visit to an AI chat after install, a local scan of the visible conversation says *"This conversation contains an AWS key you sent earlier. Rotate it →"*. It shows the type only, never the value. This is the start of the demo GIF.
2. **Fake-package flag inside the AI answer.** Claude suggests `npm i react-form-utils-pro` and a red inline badge appears: *"Not on npm."* Or: *"Registered 4 days ago · 11 downloads · 1 maintainer"*.
3. **Reversible redaction (supporting).** You paste `AKIA…`, it's sent as `PG_SECRET_1`, and the real value is restored on your screen only, where the site's own scripts can't read it.
4. **Team setup in 10 minutes.** The admin force-installs through Workspace, and within an hour the dashboard shows *"Your team used 9 AI tools this week"*. That tends to be a shock, because they thought it was 2.

### UX principles
- Stay silent until something matters. **Never block by default; warn and redact** (a DLP that nags gets uninstalled).
- One-key actions: `Enter` = send redacted, `Esc` = edit, "Always allow this pattern" = learn.
- Zero onboarding. It works immediately on install. The first success is simulated with a harmless "try pasting this fake key" demo on the welcome page. **Time-to-wow under 30 s.**
- Accessibility: chips are keyboard-reachable with aria-live announcements, and meet contrast in both themes.

### DX (developer experience)
- An open-source rules file (YAML) with custom patterns, e.g. `acme_internal_*`, shared across the team.
- A CLI and pre-commit hook that reuse the same rules (fits the git-scope brand).

### AX (agent experience)
- A read-only register API plus an MCP server so compliance agents (Vanta/Drata automations, Claude) can pull "AI tools in use" as evidence.

---

## 6. Business model & pricing

| Tier | Price | What's in it |
|---|---|---|
| Free (individual) | ₹0 / $0 | Secret guard, reversible redaction, package check, local stats |
| Pro (individual) | $5/mo | Custom rules, more AI sites, history export (optional, low priority) |
| **Team** | **$4/user/mo, min $49/mo** | Force-install, admin policies (`chrome.storage.managed`), AI-tool register, weekly digest, audit log |
| Compliance add-on | +$99/mo | ISO 42001 / AI Act evidence export, code-scanner merge, 12-month retention |

**Math to ₹1Cr ARR (~$120k, ~$10k MRR):**
- Team route: avg 30 seats × $4 = $120, +$99 add-on on half = ~$170/account → **~60 paying teams**.
- Pure-PLG route (#1 style, $9/mo): ~1,100 payers. At a 2–5% freemium conversion (vendor-blog benchmarks, likely optimistic) that needs 25k–55k active users.
- Team is roughly 20× fewer customers. That's why #4 wins.

Payments: Stripe checkout on your own site (the Chrome Web Store has no payments). Licenses are verified by a Cloudflare Worker, and team seats sync from Google Workspace.

Exit option: extensions reportedly sell for 24–40× MRR (Chrome Goldmine / ExitBid, vendor data), so it can be sold even as a lifestyle business.

---

## 7. Finding users (distribution system, not a launch)

Following your pasted playbook, pick **one** repeatable channel producing 100+ visitors/week before stacking more:
1. **Primary: reply-marketing.** Spend 10 min/day on Reddit (r/webdev, r/devops, r/sysadmin, r/cybersecurity, r/ExperiencedDevs) and HN threads about "leaked key in ChatGPT", "slopsquatting" or "shadow AI policy". Answer helpfully and link only when asked.
2. **Chrome Web Store SEO.** Title and first 132 chars: "Catch fake packages and leaked keys in ChatGPT & Claude". Target keywords: *chatgpt privacy, api key leak, fake npm package, slopsquatting, prompt security*. Screenshot 1 is the chat-leak scan and package-flag GIF (updated 2026-09-30, see `product-strategy.md` §3).
3. **Newsjacking.** Every AI-extension breach or slopsquatting story → a same-day X/LinkedIn post with the GIF.
4. **Later (once the funnel converts):** MSP and vCISO partners, a Vanta/Drata marketplace listing, and a free "AI Policy Generator" tool as lead magnet (programmatic SEO).

**Funnel: track these 4 numbers from day 1**

| Stage | Metric | Target (first 90 days) |
|---|---|---|
| Visitor → install | CWS listing conversion | ≥ 15% |
| Install → activated | first redaction/package flag within 7 days | ≥ 40% |
| Activated → retained | W4 retention | ≥ 30% |
| Retained → team | installs from companies that start team trial | ≥ 3% |

Instrument with PostHog. Opt-in only, and events carry no content. Talk to every uninstaller (uninstall URL → 1-question survey) and every trial that doesn't convert.

---

## 8. Risks & mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| **Chrome Enterprise Premium / Microsoft Purview bundle it** | High | Target orgs not paying for CEP. Lead with dev-specific detection + compliance export. Support Edge, Brave and Firefox too. |
| **Trust**: "read and change data on sites" warning scares users | High | Narrow host permissions, OSS client, local detection, a published data map, and aim for the CWS "Featured" badge. |
| Desktop apps & CLIs (ChatGPT app, Claude Code, Cursor) bypass the browser | Medium | Be upfront about it. Cover the gap with the pre-commit/CLI and your code scanner. The browser is still the main surface for chat AI. |
| AI sites change their DOM and break the content scripts | Medium | Hook at the `paste`/`beforeinput` event level, not DOM selectors. Run synthetic Playwright tests daily against each site. |
| Regulatory urgency softened (high-risk → Dec 2027) | Medium | Sell on security-questionnaire / ISO 42001 pain today; AI Act is a secondary argument. |
| Enterprise sales cycles | Medium | Keep deals self-serve under $500/mo. No SSO/SOC 2 until pulled by 3+ customers. |
| CWS review delays or policy strikes | Low–Med | Minimal permissions, a clear privacy policy, no remote code (MV3). |

---

## 9. Kill criteria (proceed vs pivot)

**Ship MVP in 2 weeks** (MV3, no backend: secret guard + reversible redaction on chatgpt.com, claude.ai, gemini.google.com, plus the package check via a cached Cloudflare Worker proxy of npm/PyPI metadata).

| Checkpoint | Proceed if | Else |
|---|---|---|
| Day 30 | ≥ 500 installs, ≥ 40% activation | Rewrite the CWS listing and GIF once; if it still misses, pivot to #1-repositioned |
| Day 60 | ≥ 25 team-waitlist signups from company emails, 10 user interviews done | Keep it free as an audience asset, and point effort at the compliance scanner |
| Day 90 | ≥ 3 paid teams | Scale: MSP partners and marketplace listings |

---

## 10. Next 14 days
1. **Day 1–2:** Search the CWS for "chatgpt privacy", "prompt security", "redact". Record install counts and **1–2★ complaints** in a table (that's the feature spec). *Not done in this report: CWS install numbers weren't verified.*
2. **Day 1–2:** Build the landing page and waitlist ("Team: AI-tool register"). Post a demo mock GIF to X and r/webdev as a demand smoke test before coding the team tier.
3. **Day 3–10:** Build the MVP (paste interception, gitleaks-derived rules, reversible redaction, package badge).
4. **Day 11–12:** Put the privacy/data-map page and the OSS repo live.
5. **Day 13–14:** Show HN ("I built a local-only guard that stops secrets and fake packages in ChatGPT"), and start the daily reply-marketing routine.

---

## Sources
- [LLM-Inspector](https://github.com/PradSharma554/LLM-Inspector) · [SSE Inspector](https://sse-inspector.onecat.dev/) · [SSE Viewer](https://github.com/maltoze/sse-viewer) · [sse-devtools-panel](https://github.com/FatMii/sse-devtools-panel)
- [SentinelOne acquires Prompt Security](https://www.sentinelone.com/press/sentinelone-to-acquire-prompt-security-to-advance-genai-security/) · [Harmonic DLP for GenAI](https://www.harmonic.security/solutions/dlp-for-genai) · [ShadowLock](https://shadowlock.io/) · [LayerX ChatGPT security tools](https://layerxsecurity.com/generative-ai/best-chatgpt-security-tools/)
- [CSA: AI browser extension attack surface](https://labs.cloudsecurityalliance.org/research/csa-research-note-ai-browser-extension-attack-surface-202604/) · [ShadowGuard](https://github.com/Ahmad-Amin/shadow-guard) · [SHADOW-AI](https://github.com/anurag123-lab/SHADOW-AI) · [Prompt Seal (Medium)](https://medium.com/code-your-own-path/stop-leaking-secrets-into-chatgpt-free-browser-extension-for-safer-ai-prompts-41cb8c837a09)
- [Chrome Enterprise GenAI DLP](https://security.googleblog.com/2024/04/prevent-generative-ai-data-leaks-with.html) · [Chrome Enterprise Premium](https://chromeenterprise.google/products/chrome-enterprise-premium/)
- [Socket web extension](https://socket.dev/blog/socket-web-extension) · [Aikido on slopsquatting](https://www.aikido.dev/blog/slopsquatting-ai-package-hallucination-attacks) · [Cloudsmith slopsquatting](https://cloudsmith.com/blog/slopsquatting-and-typosquatting-how-to-detect-ai-hallucinated-malicious-packages) · [slopcheck](https://github.com/0xToxSec/slopcheck)
- [Gibson Dunn: AI Act Omnibus](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/) · [Jones Walker: Aug 2 still matters](https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html?id=102nbon) · [Inside Privacy: AI literacy guidance](https://www.insideprivacy.com/artificial-intelligence/european-commission-provides-guidance-on-ai-literacy-requirement-under-the-eu-ai-act/)
- [ExtensionPay revenue examples](https://extensionpay.com/articles/browser-extensions-make-money) · [Chrome Goldmine revenue benchmarks](https://chromegoldmine.com/blog/chrome-extension-monetization/chrome-extension-revenue-benchmarks/) · [Fungies monetization guide](https://fungies.io/monetize-chrome-extension-2026/)

---

## 11. Technical feasibility (verified 2026-09-29)

**Verdict: feasible.** Paste guard + package check are low-risk. Reversible redaction is feasible but the most brittle part → ship it as "best-effort, this tab only".

### Spike results (actually tested)
| Test | Result |
|---|---|
| Capture-phase `paste` listener cancels a paste in ProseMirror (ChatGPT/Claude editor family) and re-inserts redacted text via synthetic `ClipboardEvent` + `DataTransfer` | ✅ secret absent, placeholder inserted |
| Fallback `document.execCommand('insertText')` into ProseMirror | ✅ works |
| npm registry / downloads API / PyPI JSON: CORS | ✅ `access-control-allow-origin: *` |
| Nonexistent package → registry status | ✅ clean `404` on both npm & PyPI (deterministic "doesn't exist" signal) |
| highlight.js keeps `{{SECRET_1}}` in one DOM text node | ⚠️ bash/python yes; **JS template literal split it** → restore must match on concatenated text & map back to nodes, or use identifier-style placeholder (`PG_SECRET_1`) that highlighters keep as one token |

### Component matrix
| Component | Feasibility | Approach | Main risk |
|---|---|---|---|
| Secret detection | High | Port gitleaks rules (MIT) to JS regex + entropy + keyword prefilter; Luhn cards, Verhoeff Aadhaar, PAN | False positives → "allow pattern" learning; Go RE2 `(?i)` → JS flags |
| Paste interception | High (tested) | `window` capture-phase `paste` | Site adds own capture handler first (unlikely) |
| Typed secrets / Enter-to-send | Medium | Capture `keydown` Enter + send-button click, scan editor text, block & offer redact | Races with site handlers; DOM selector per site |
| File/drag-drop upload | Medium | Intercept `drop`/`input[type=file]` change, FileReader for text files | PDF/images out of scope v1 |
| Reversible restore in answer | Medium | MutationObserver on response container, text-node replace, re-apply on each React re-render during streaming | Flicker while streaming; model mangles placeholder; mapping lost on reload (keep in `chrome.storage.session` = memory only, never disk) |
| Copy button returns real secret | Medium | `world: "MAIN"` content script wraps `navigator.clipboard.writeText` to substitute placeholders | Patching page globals — keep tiny & audited |
| Package check in answers | High (tested) | Parse only install commands (`npm i`, `pnpm add`, `pip install`, `uv add`) in code blocks → background SW fetch (host perms for registries) → 404 / age / weekly downloads / edit-distance to top-N list | Python import≠package name (only check install cmds); private scopes → org allowlist |
| Team force-install | High | Google Admin `ExtensionInstallForcelist` (free Chrome Browser Cloud Mgmt) / Intune for Edge | BYOD & unmanaged browsers not covered |
| Team policy | High | `chrome.storage.managed` + `managed_schema` | — |
| User identity | High | `chrome.identity.getProfileUserInfo` (`identity.email`) | Only on signed-in profiles |
| AI-tool register | High | Team build: `webNavigation` hostname → match curated AI-domain list locally, report hostname only | Needs history-level permission → team build only (admin-installed, no scary prompt) |
| AI-extension inventory (bonus wow) | High | `chrome.management.getAll()` → flag AI extensions installed | `management` permission → team build only |
| Backend | High | Cloudflare Worker + D1 (events, licenses), Stripe checkout on site | — |
| MV3 rules | High | Rules = JSON data (allowed), no remote code; SW is event-driven | 30s SW idle — nothing long-running needed |

### Hard limits (be honest in marketing)
- Can't see desktop apps (ChatGPT/Claude apps), CLIs (Claude Code, Cursor), mobile, or API calls → pair with pre-commit/CLI + code scanner.
- Users can disable it unless force-installed; Incognito off unless allowed/forced.
- Per-site adapters (chatgpt.com, claude.ai, gemini.google.com, …) break on redesigns → daily Playwright synthetic tests.

### Two builds, one codebase
- **Public (CWS):** host perms = AI chat domains + registries only. Minimal warning, fast review.
- **Team (unlisted/force-installed):** + `webNavigation`, `management`, `identity.email`.
