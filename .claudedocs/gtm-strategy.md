# PasteGuard — Go-To-Market, Moat, Market Size, Blitz Plan (2026-09-29)

Companion to `extension-decision-report.md`. FX assumption: $1 ≈ ₹88 → **₹1Cr ≈ $113k ARR ≈ $9.5k MRR**.

## 0. Correction from new research
- ISO 42001: only **~350–500 orgs certified worldwide** (spring 2026). That's too small to lead with. Keep it as an add-on.
- **Lead trigger = SOC 2 and customer security questionnaires.** There are 15–20k SOC 2 reports a year, Vanta has 16k customers and Drata 8.5k. Questionnaires now routinely ask *"What AI tools do employees use, and how do you prevent data leakage into them?"*
- The pain is backed by data: **77% of employees paste data into GenAI tools, 82% of it from unmanaged accounts**, and ~35% of pasted data is sensitive (LayerX report). Cyberhaven puts it at **39.7% of AI interactions involving sensitive data**.

---

## 1. Market size

### Top-down (context only, analyst figures)
- Shadow AI Risk & Governance market: **$1.39B (2026) → $8.64B (2032), 35.6% CAGR**. North America is 44% of it (MarketsandMarkets).
- AI governance software: $0.61B (2026) → $2.63B (2030) (The Business Research Co.).

### Bottom-up (the numbers to plan with)
| Layer | Definition | Math | Size |
|---|---|---|---|
| **TAM** | Every professional developer plus the tech-org seats around them that use AI chat in a browser | 36.5M professional devs × $48/yr (the $4/mo seat price) | **~$1.75B/yr**, in line with the $1.39B analyst figure |
| **SAM** | Tech SMBs (10–500 staff) facing SOC 2 or security questionnaires, reachable self-serve, in English-speaking markets plus India | ~40k companies (GRC-platform users + SOC 2 filers, deduplicated estimate) × 60 avg seats × $48 | **~$115M/yr** |
| **SOM (36 mo)** | 0.5% of SAM accounts | 200 teams × ~$1.9k/yr, plus individual Pro | **~$0.4–0.5M ARR (≈ ₹3.5–4.4Cr)** |
| **Year-1 target** | ₹1Cr | 60 teams × $1.9k (~$115k); the individual plan is upside | **60 paying teams** |

The SAM company count is an estimate. Vanta (16k) + Drata (8.5k) + Secureframe/Sprinto/others, minus overlap, plus SOC 2 filers not using a GRC platform. Validate it by counting public "trust center" pages.

---

## 2. Two plans, two motions

### Individual: product-led, the plan exists for distribution
| | Free | **Pro — $4/mo · $36/yr · ₹199/mo India PPP** |
|---|---|---|
| Secret guard + reversible redaction | 3 AI sites | All AI sites (~40) |
| Fake-package check | ✅ | ✅ + PyPI/crates/Go |
| Custom rules (YAML) | — | ✅ |
| Sync rules across devices | — | ✅ |
| "Protection report" history | 7 days | Unlimited + export |

- **Job of this plan:** installs, reviews, CWS ranking, and a signal about which companies are using it. Revenue from it is a bonus. Expect 1–3% to pay.
- **Founding-member offer:** $49 lifetime Pro for the first 200 buyers. It brings in cash early, earns testimonials, and proves people will pay. Close it permanently after the 200.
- Upgrade triggers are in-context, never nags. Example: *"You've been protected 12 times this month. Add custom rules for your company's internal keys → Pro."*

### Team: product-led lead → founder-led close
| | **Team — $4/user/mo annual ($5 monthly), min $49/mo** | Compliance add-on +$99/mo |
|---|---|---|
| Force-install (Google Admin / Intune) | ✅ | |
| Org policies (block / warn / redact) | ✅ | |
| AI-tool register + AI-extension inventory | ✅ | |
| Weekly digest + audit log (12 mo) | ✅ | |
| Questionnaire answer pack (AI usage policy, controls, evidence PDF) | | ✅ |
| Code scanner merge (browser + codebase inventory) | | ✅ |
| ISO 42001 / AI Act Art. 4 evidence export | | ✅ |

Free for teams of 1–3 seats, so early-stage startups stay in the funnel.

**The bottom-up upgrade engine:**
1. **Domain clustering.** A free user signs in, optionally, to sync. Once **3+ users share one company domain**, email the most active one: *"3 people at acme.com use PasteGuard. You've blocked 9 secrets this month. Want the team dashboard free for 14 days?"*
2. **Champion kit.** A "Send to my security lead" button generates a 1-page **Leak Report** PDF: *"In 30 days, PasteGuard stopped 14 secrets (3 AWS, 2 Stripe, 9 .env) from reaching ChatGPT/Claude."* It is the most important upsell asset.
3. **Trigger-based outreach.** Reach teams at the moment they buy: SOC 2 audit prep, a customer questionnaire, a key-leak incident, or writing an AI policy. Lead magnets for each (see §6).
4. **Founder-led close.** A 15-minute demo, the admin install done live on the call, and a dashboard with real data before the call ends. No SSO or SOC 2 of your own until 3+ deals ask for it.
5. **Partners.** vCISOs, SOC 2 consultants, and MSPs (India and US) get 20% recurring revenue share. They bundle PasteGuard into their compliance packages.

---

## 3. Strategy in one page

1. **Wedge:** individual devs, with a free and delightful product (reversible redaction + fake-package flags).
2. **Beachhead:** 20–200-person SaaS startups going through SOC 2, especially India-based SaaS selling to US and EU customers. You know this market, and they're price-sensitive toward incumbents.
3. **Expand:** teams → compliance add-on → code + browser AI inventory (your scanner) → MSP channel.
4. **Positioning:** *"Answer 'how do you stop AI data leaks?' on your next security questionnaire, in 10 minutes, for $4/seat."*
5. **Principles:**
   - Trust beats features.
   - Warn and redact, don't block.
   - The team plan must be something employees don't hate: metadata only, never prompt content.
   - Price below the procurement threshold (under $500/mo, so it's a card purchase).

---

## 4. Moat (honest version)

**Not a moat:** regex rules, extension code, the idea. A funded competitor or Google could copy features in weeks.

**Moats to build deliberately, in order:**
| Moat | How it compounds | Starts |
|---|---|---|
| **Trust brand** | OSS client, local-only, published data map, public security audit later. Every "malicious AI extension" headline strengthens you. Trust is slow to build and hard to copy. | Day 1 |
| **Slopsquatting dataset** (data network effect) | Anonymized counts of *which package names LLMs hallucinate*, across all users and models. Published as a monthly **"Slopsquatting Index"**. Registries, Socket and security teams want it, and it feeds detection that only you have. | Month 1 |
| **Detection quality loop** | Every "false positive / allow" click (anonymized pattern class only) tunes rules. More users → fewer false positives → better reviews → more users. | Month 2 |
| **Audit-evidence switching cost** | Teams keep 12 months of register and audit log as SOC 2 evidence. Leaving means losing evidence mid-audit-cycle. | Month 3 |
| **Distribution compounding** | CWS reviews, ranking, SEO pages, and the Index all accumulate, and a later entrant starts at zero. | Ongoing |
| **Ecosystem lock-in** | Vanta/Drata integrations plus MCP/API, so evidence flows automatically into GRC platforms. | Month 6+ |
| **Code + browser inventory** | Your scanner covers the half that browser-only vendors can't reach. | Month 6+ |

---

## 5. Risk mitigation (expanded)

| Risk | Likelihood / impact | Mitigation | Early warning signal |
|---|---|---|---|
| No team willingness to pay | Med / High | Waitlist + pre-sell *before* building the team tier. Kill criteria at day 60 and 90. | <25 company-email waitlist signups by day 60 |
| Google / Microsoft bundle it in the browser | Med / High | Target orgs without Chrome Enterprise Premium. Stay dev-specific. Stay multi-browser (Chrome, Edge, Firefox, Brave). | CEP price cut or free tier |
| Trust / permission fear | High / High | Narrow host permissions, OSS, local detection, data-map page, no content ever leaves the device | Install→uninstall >30% in week 1 |
| **Employee-monitoring backlash (EU works councils, GDPR)** | Med / Med | Register is aggregate by default; pseudonymous users option; DPA template; EU data residency (Cloudflare jurisdiction) | Objections in demos |
| CWS takedown or review delay | Low / High | Clean MV3, no remote code, a clear privacy policy. Also list on Edge and Firefox stores. Team build can be self-hosted CRX via policy | Review >7 days |
| AI site redesign breaks features | High / Med | Paste guard is site-agnostic; restore is per-site adapter; daily Playwright checks; status page | Synthetic test fails |
| **Your own extension gets hijacked** (supply-chain irony) | Low / Catastrophic | Hardware 2FA on the CWS publisher account, signed releases, reproducible builds, no remote code | — |
| Solo-founder bandwidth | High / Med | Ship narrow. Automate support (docs + in-app FAQ). Kill Pro features nobody uses. | >20% time on support |
| Being copied by OSS | Med / Low | Being OSS yourself is the defense; the moats are the data and the trust | — |

---

## 6. Zero-budget blitz marketing

### The centerpiece: original research (worth more than any ad budget)
**"The 2026 Slopsquatting Report."** Ask GPT, Claude, Gemini and open models 1,000 real coding questions. Measure the % of hallucinated packages, which of those names **are already registered by someone**, and what the registered ones contain.
- Cost: ~$20–50 of API credits plus 3 days.
- Why it works: security press (The Register, BleepingComputer, Dark Reading), HN, and newsletters (tl;dr sec, JavaScript Weekly, Python Weekly) love new data. Every article links to the free extension.
- Re-run it monthly as the **Slopsquatting Index**, which doubles as a moat and a recurring PR hook.
- Responsible disclosure: report malicious squatted packages to npm and PyPI before publishing.

### Launch stack (weeks 3–4). Stagger it, one big bet per day
| Day | Channel | Asset |
|---|---|---|
| Mon | Publish report on your blog + X/LinkedIn thread | Charts, top-10 hallucinated names |
| Tue | **Show HN**, 8–10am PT | "I measured how often AI invents npm/PyPI packages, and built a guard" |
| Wed | Reddit: r/netsec (research), r/cybersecurity, r/webdev, r/devops, r/sysadmin, each with a tailored post and no cross-spam | Findings first, tool second |
| Thu | **Product Hunt** + Peerlist + IndieHackers | 30-s GIF: reversible redaction |
| Fri | Newsletter submissions: tl;dr sec, JS Weekly, Python Weekly, Console.dev, TLDR | Report link |
| Next week | dev.to / Hashnode deep-dive, a LinkedIn carousel, and pitches to 3 podcasts | |

### Always-on distribution system (the "100 visitors/week you can repeat")
1. **Reply marketing, 15 min a day.** Threads on "leaked API key", "ChatGPT privacy at work", "AI policy for startup", "slopsquatting".
2. **Free tools + programmatic SEO**, all sharing one backend:
   - "Is this package real?" checker page, one indexable page per hallucinated name in the Index
   - "Leaked your OpenAI/AWS/Stripe key? Rotate it in 5 min" guides (high-intent search)
   - **AI Acceptable-Use Policy generator** → team-trial lead magnet
   - **"AI usage" security-questionnaire answer template** → team-trial lead magnet
3. **Newsjacking.** Every AI-extension breach or leak story gets a same-day post with the GIF.
4. **Build in public.** Share installs, catches and MRR weekly on X and LinkedIn (you already do this).
5. **Directories:** CWS featured nomination, AlternativeTo, awesome-security / awesome-chrome-extensions PRs, SaaSHub, There's An AI For That.
6. **Talks:** OWASP chapters and Bangalore/Chennai meetups, titled *"I found N packages AI invented and attackers registered."*
7. **Signal-based cold email for teams:** 20/day, manual and personalized. Targets are companies with a public SOC 2 trust center, and domains clustering in your user base. Comply with CAN-SPAM/GDPR (B2B legitimate interest, easy opt-out).
8. **In-product loops:** "Protect a teammate" invites; the Leak Report PDF is shareable; the "Protected by PasteGuard" footer goes on the team digest.

---

## 7. How fast can we build (with Claude Code)

| Week | Build | Market |
|---|---|---|
| **1** | D1 CWS competitor scan (1–2★ reviews → spec). D1–2 1-day spike on real chatgpt.com/claude.ai. D2–6 MVP: paste guard, ported gitleaks rules, reversible redaction, package badge (3 sites). D7 onboarding page with a fake-key demo. **Submit to CWS.** | Landing page + waitlist (team). Start the Slopsquatting study run. Daily build-in-public. |
| **2** | CWS review buffer. Fix bugs, add Firefox/Edge builds, PostHog opt-in analytics, uninstall survey | Finish the report. Line up newsletter and press contacts. |
| **3–4** | Pro licensing (Stripe on site + Worker), sync | **Launch blitz** (§6) |
| **5–7** | Team build: Worker + D1, admin dashboard, force-install guide, register, Leak Report PDF | Domain-cluster emails, first 10 demos |
| **8–10** | Compliance add-on v0 (questionnaire pack) | First paid pilots; partner outreach to 10 vCISOs |

Realistic: **MVP live in ~10–14 days** (CWS review can add 1–7 days). **Team tier by ~week 7.**

---

## 8. Milestones & metrics

**North-star metric:** *weekly protected users*, meaning users with at least one catch or package check in the week. For teams: *weekly active paid teams*.

| Month | Installs (cumulative) | Weekly protected | Paid teams | MRR | Status |
|---|---|---|---|---|---|
| 1 | 1,000 | 300 | 0 | $0 (+ LTD cash) | target |
| 3 | 5,000 | 1,500 | 5 | ~$0.8k | target |
| 6 | 15,000 | 4,500 | 25 | ~$4k | target |
| 12 | 40,000 | 12,000 | 60 | **~$9.5k (₹1Cr ARR)** | target |

These are targets, not forecasts. Hitting ₹1Cr in 12 months is aggressive for zero budget; **12–18 months is realistic**. The report plus the HN launch is the biggest lever for pulling it earlier.

Funnel numbers (from the pasted playbook): visitor→install, install→activated, activated→W4 retained, retained→team trial→paid. **Fix the worst stage before adding channels.** Talk to every uninstaller and every trial that doesn't convert.

---

## Sources
- [SlashData: 47.2M developers](https://www.slashdata.co/post/global-developer-population-trends-2025-how-many-developers-are-there) · [ShiftMag](https://shiftmag.dev/there-are-47-million-developers-in-the-world-5200/)
- [MarketsandMarkets: Shadow AI Risk & Governance $1.39B→$8.64B](https://www.prnewswire.com/news-releases/shadow-ai-risk--governance-market-worth-8-64-billion-by-2032--exclusive-report-by-marketsandmarkets-302889440.html) · [Business Research Co: AI governance](https://www.thebusinessresearchcompany.com/report/ai-governance-global-market-report)
- [Second Talent shadow AI stats (LayerX 77%/82%)](https://www.secondtalent.com/resources/shadow-ai-statistics/) · [Cyberhaven: sensitive data into AI](https://www.cyberhaven.com/blog/sensitive-data-flowing-into-ai-tools) · [usecure](https://usecure.io/blog/genai-data-leakage-employees-pasting-confidential-data-into-ai-tools)
- [Atoro: ISO 42001 certified count](https://atoro.io/how-many-companies-are-iso-42001-certified/) · [BCG among first 100](https://www.bcg.com/news/27january2026-bcg-certified-international-standard-ai-management-systems)
- [SOC 2 statistics 2026](https://blog.getagency.com/articles/soc-2-compliance-statistics-2026) · [Sacra: Vanta](https://sacra.com/c/vanta/) · [Drata vs Vanta](https://www.brightdefense.com/resources/drata-vs-vanta-a-comparison/)
- [CompanyData: 442,817 software companies](https://companydata.com/world/software-companies/)
