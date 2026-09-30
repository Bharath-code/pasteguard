# PasteGuard: competition, wow moments, company horizon, north star (2026-09-30)

Builds on `extension-decision-report.md` (§3 competitor map, §5 wow moments, §9 kill criteria), `gtm-strategy.md` (market size, moat, GTM) and `extension-prd-architecture.md` (PRD, stack). Sources are numbered [n] at the end.

---

## 0. What the new research changed

The 2026-09-29 report compared us to enterprise DLP vendors and a few open-source toys. It never scanned the Chrome Web Store (report §10 marked that as not done). A scan on 2026-09-30 found that **the free, local-only secret-redaction market is crowded**:

- At least 10 free extensions redact secrets and personal data locally before a paste reaches an AI chat [1–9].
- **Reversible redaction is already shipped.** Veild [1] and Secret Sanitizer [2] put real values back into the clipboard when you copy. Private Prompt [7] and Privacy Protector [8] restore values inside the AI's reply.
- **Chrome Enterprise Premium** now costs $6/user/month and includes paste DLP and shadow-AI visibility [10].

**What this means:**
1. Reversible redaction is now table stakes. It can't be our holy-sh*t moment or our demo GIF any more.
2. "Local-only redactor" is not a position. Everyone says "100% local".
3. What we found **no competitor doing**:
   - checking packages *inside AI answers*;
   - a published, measured accuracy score;
   - restored values the AI site itself can't read (our closed shadow-root design);
   - scanning the chat you already had;
   - the team AI-tool register priced under Chrome Enterprise Premium.

   Those five are where we compete.

---

## 1. Competitor matrix

✅ = claimed on their own page · — = not found · ? = not checked. We don't guess, and we recheck every quarter.

| | PasteGuard (planned) | Veild [1] | Secret Sanitizer [2] | PasteSecure [3] | Private Prompt [7] | Socket ext. [11] | Chrome Ent. Premium [10] |
|---|---|---|---|---|---|---|---|
| Secret detection on paste | ✅ | ✅ | ✅ 70+ patterns | ✅ | ✅ | — | ✅ generic DLP |
| Restore via copy | ✅ | ✅ | ✅ (15 min) | ? | ? | — | — |
| Restore shown in the answer | ✅ | — | — | ? | ✅ | — | — |
| Restored value hidden from the site's own JS | ✅ closed shadow | ? | ? | ? | ? | — | n/a |
| Package check inside AI answers | ✅ | — | — | — | — | — (registry pages only) | — |
| Scans existing chat for past leaks | ✅ (P1) | — | — | — | — | — | — |
| Published accuracy numbers | ✅ | — | — | — | — | — | — |
| Open source | ✅ | ? | ✅ MIT | ? | ? | ? | — |
| Team register / admin | ✅ (P2) | — | — | — | — | ✅ (their platform) | ✅ |
| Price | Free · Team $4/user | Free | Free | Free | ? | Free ext. | $6/user [10] |

**How to read it:** individual devs have free choices. We win on **"it catches what they miss, and proves it"**. Teams have one paid choice at $6 that bundles a lot more. We win on **dev-specific, cheaper, 10-minute setup, audit export**.

---

## 2. Competitive risks and mitigation

| Risk | Why it's real | Mitigation | Watch signal |
|---|---|---|---|
| **Commoditized free tier.** "Just another redactor" | 10+ free clones [1–9] | Lead the store listing and GIF with package check + chat scan, not redaction. Publish accuracy numbers others can't match without a corpus. | Listing conversion < 15% |
| A clone adds package checks | Easy to copy technically | Moat is the **Slopsquatting Index** data (which names models invent, which got registered). The checker is the free part; the dataset is ours. | A competitor adds it |
| Chrome Enterprise Premium moves down-market | Google has the distribution | Target the SMBs not paying for it: dev-specific rules, $4 < $6, Edge/Firefox support, code + browser inventory. | CEP price change |
| Veild-style tools add team tiers | Natural next step | Ship the team waitlist → pilot faster than them. Our advantage is the audit export mapped to SOC 2 questionnaires. | Their pricing page |
| Trust ("another extension reading my chats") | Malicious AI extensions in the news (report §2) | OSS + reproducible build + "verify us in DevTools: zero requests" + restore the site can't read. | 1★ reviews mentioning privacy |
| We claim something a competitor disproves | Kills credibility | Matrix cells only from their own pages, re-verified quarterly. Accuracy claims only from our CI numbers. | — |

---

## 3. Wow moments, redesigned

Rule: a holy-sh*t moment is **value the user didn't know they needed, shown in under 60 seconds, on their real data, provably local.**

| # | Moment | Why it lands | Unique? | Phase |
|---|---|---|---|---|
| **1** | **"This chat already has a leak."** On the first visit to a chat after install, we scan the *visible conversation* locally: *"This conversation contains an AWS key you sent earlier. Rotate it →"* (type only, never the value). | Turns a hypothetical fear into a real, personal finding in the first minute. Pure urgency, zero effort. | Not found in the scan | P0.5 (cheap: `detect()` over `adapter.answers()` + user turns) |
| **2** | **"Not on npm."** A red badge appears on `npm i react-form-utils-pro` inside Claude's answer, before you copy it. | Visible proof that the AI lies, at the exact moment it matters. Best GIF. | Not found in the scan | P0 |
| **3** | **"Registered 4 days ago · 1 maintainer."** A real package the AI suggested, that someone just claimed | Scarier than #2: it looks legitimate | Not found in the scan | P0 |
| **4** | **One-click rotate.** After a hold-to-send-original, or with #1: *"Rotate the Stripe key"* links straight to the provider's key page | Turns guilt into a 20-second fix. Delight comes from relief. | Not found in the scan | P0 (static map of ~30 providers → key pages) |
| **5** | **"Verify us."** The welcome page opens DevTools-style proof: live counter of network requests = 0 while you paste | Trust as a demo, not a promise | Veild shows similar [1] | P0 |
| **6** | **Team: "Your team used 9 AI tools this week."** | Admin thought it was 2 | Chrome Enterprise Premium has it [10], not at $4 | P2 |
| **7** | **Monthly "AI hygiene receipt."** 3 secrets kept out, 2 fake packages caught, shareable card with no values | Social proof loop + retention | — | P1 |

**Demo GIF, in order:** #1 → #2 → restore. Redaction appears as the means, not the headline.

### Delight layers (Kano)
- **Must-be (absence = uninstall):** no false alarms, no typing lag, never breaks the chat. These are the CI gates in `extension-prd-architecture.md` §0.
- **Performance (more = better):** secret types covered, sites supported, speed of verdicts.
- **Delighters:** wow moments #1, #4, #7, the tape motion, and copy that sounds like a person ("Restored on this screen only").

---

## 4. Product principles

These extend the design doc's six rules. Check every feature against them.

1. **One promise, provable.** If a claim can't be measured in CI or seen in DevTools, we don't make it.
2. **Value before ask.** No sign-up, no settings, and no permission beyond the AI sites before the first catch.
3. **Silent until it matters, then specific.** Name the type, the outcome and the fix. Never the fear.
4. **Fix, don't scold.** Every warning carries a fix (tape, rotate, "not on npm → did you mean `zod`?").
5. **Earn every permission.** The public build asks for AI sites and registries only.
6. **The user's data never becomes our product.** Aggregate counts only, opt-in.
7. **Scope follows evidence.** New surfaces only after the kill-criteria gate for the current one passes.

---

## 5. From product to company

### Vision and mission
- **Vision:** *Every developer and every AI agent can use AI without leaking what matters or installing what's fake.*
- **Mission (today):** Be the trusted safety layer between developers and AI chat, then between teams and every AI tool they use.
- **Category we're building:** the **AI data boundary for dev teams**: what goes into AI (secrets) and what comes out of AI (packages, commands) that can hurt you.

### Three horizons
| Horizon | When | Product | Who pays | Proof it's working |
|---|---|---|---|---|
| **H1: Extension** | 0–6 months | Browser guard: secrets in, packages out, chat scan | Nobody yet (distribution) | Weekly protected developers (below), reviews, the Index cited by press |
| **H2: Team boundary** | 3–18 months | Force-install, AI-tool register, policy, SOC 2 questionnaire pack, Leak Report | Eng leads at 20–200 person SaaS, $4/user | 60 paid teams → ₹1Cr ARR (gtm §8) |
| **H3: Agent boundary** | 12–36 months | The same rules and package checks where AI **acts**: Claude Code/Cursor hooks, pre-commit, CLI, an MCP gateway that screens tool calls and `npm install`s agents run | Security + platform teams | Agents protected per week; one rule set across browser, IDE, CI |

**Why H3 is the big bet:** the browser's hard limit (decision report §11) is that desktop apps, CLIs and agents bypass it. Agents are now the ones reading `.env` files and running `pip install`. The same `packages/core` (detect + package verdict) runs in Node, so a CLI, a pre-commit hook and an agent hook each reuse it for a few hundred lines. **Architecture decision this forces now:** keep `packages/core` pure and runtime-agnostic. That's already the plan.

### What makes it a company, not an extension
| Asset | Built by | Compounds because |
|---|---|---|
| Trust brand | OSS, published accuracy, zero-request proof | Every malicious-extension headline helps us |
| Slopsquatting Index (data) | Opt-in aggregate counts of names models invent + registry lookups | Nobody else sees AI answers at this layer. The Index gets press, registries and security vendors want it, and detection improves. |
| Evidence switching cost | 12 months of team register and audit log | Leaving mid-audit loses SOC 2 evidence |
| One rule set, every surface | Browser → IDE → CI → agents | A team's custom rules live with us |
| Distribution | Store reviews, SEO, the Index, partners (vCISO/MSP) | A late entrant starts at zero |

### How to think bigger without losing focus
- Ask "what would make this 10× more valuable to a team?". Answer: covering agents and CI, not more PII types.
- Only **H1 gets built now**. H2 is gated by the day-60 waitlist, H3 by 3 paying teams asking for it. The horizon guides architecture choices today (pure core, rules as data), not the backlog.

---

## 6. North star

### North star metric: **weekly protected developers (WPD)**
> Distinct installs that, in a 7-day window, had at least one **protective event**: a secret taped, a past leak surfaced, or a package verdict shown that was not "✓ looks fine".

**Why this one:**
- It measures *value delivered*, not installs (vanity) or time spent (wrong for a silent tool).
- It needs the product to work (accurate detection, working adapters) **and** people to keep it installed.
- It predicts revenue, since team upsells come from domains with many protected devs (gtm §2).

**Why not "secrets caught":** it can fall *because we're working*, as users learn and paste fewer secrets. It also rewards false positives. It stays as a reported number, not the goal.

### Input metrics (what the team moves)
```
WPD = active installs × % who use AI chat weekly × % with a protective event
        │                 │                           │
        │                 │                           └ detection coverage, package-check reach, chat-scan
        │                 └ supported sites, adapter health
        └ store conversion, activation (first catch ≤ 7 days ≥ 40%), W4 retention ≥ 30%
```

### Guardrails (must not get worse while WPD rises)
| Guardrail | Limit |
|---|---|
| False positives per MB (CI corpus) | ≤ 1 |
| "Allow" clicks per protective event (field) | ≤ 15% |
| Week-1 uninstall rate | ≤ 20% |
| Adapter health (sites working) | ≥ 95% of days |
| Leaks in E2E | 0 |

### H2 north star (once the team tier ships)
**Weekly active paid teams**: teams with ≥ 1 admin viewing the register or exporting evidence in the week. Gtm §8 targets: 5 by month 3, 60 by month 12.

---

## 7. Changes to earlier docs (applied 2026-09-30)
- Decision report §5: move reversible redaction from wow #1 to supporting feature. Wow #1 becomes the chat scan, #2 becomes the package flag.
- PRD P0: add the chat-leak scan (#1) and the rotate links (#4). Both are small and reuse existing core functions.
- CWS listing title: lead with *"Catch fake packages and leaked keys in ChatGPT & Claude"*.
- Gtm §8 north star: keep "weekly protected users", with the precise definition and guardrails above.

---

## Sources
1. Veild: https://www.veild.dev/
2. Secret Sanitizer (MIT): https://github.com/souvikghosh957/secret-sanitizer-extension
3. PasteSecure, CWS: https://chromewebstore.google.com/detail/pastesecure-redact-sensit/ebolpbgeaeammpddffibagpobicfnhoc
4. PrivacyScrubber, CWS: https://chromewebstore.google.com/detail/privacyscrubber-%E2%80%94-pii-red/pimoejgefeilajmmbpghifdmhdlkgjol
5. Caviard, CWS: https://chromewebstore.google.com/detail/caviard-%E2%80%93-redact-personal/ncdaondhpapnhbeadnbcgpfmknhcoafh
6. Private Guard, CWS: https://chromewebstore.google.com/detail/private-guard-%E2%80%94-pii-redac/jjkghegjofelkblppppihfacdoemjban
7. Private Prompt: https://safeyourprompt.com/
8. Privacy Protector for ChatGPT, CWS: https://chromewebstore.google.com/detail/privacy-protector-for-cha/ajoplockplhgenpmncdanppmdndpaeei
9. Prompt Seal (Medium): https://medium.com/code-your-own-path/stop-leaking-secrets-into-chatgpt-free-browser-extension-for-safer-ai-prompts-41cb8c837a09
10. Chrome Enterprise Premium, pricing summary: https://druce.ai/governance/wiki/vendors/chrome-enterprise · product: https://chromeenterprise.google/products/chrome-enterprise-premium/
11. Socket web extension: https://socket.dev/blog/socket-web-extension
12. Slopsquatting background: https://en.wikipedia.org/wiki/Slopsquatting · https://www.aikido.dev/blog/slopsquatting-ai-package-hallucination-attacks

---

## 8. Scorecard and odds (2026-09-30, judgment, not data)

### Scorecard today (1–5, higher is better)
| Dimension | Score | Why |
|---|---|---|
| Pain (team: "how do you stop AI leaks?" on questionnaires) | 4 | Documented in gtm §0; individual pain is lower (≈3) |
| Differentiation | 2 | Package check in answers + chat scan are unique today, but copyable in weeks |
| Willingness to pay | 2 | Individuals ≈1 (10+ free clones). Team ≈3, with **zero** conversations so far |
| Distribution | 3 | Crowded store; the Slopsquatting study is a real press asset, **not yet run** |
| Moat | 1 | None today; all moats in §5 are still to be built |
| Timing | 4 | Slopsquatting in OWASP guidance, agents installing packages, SOC 2 questions on AI |
| Founder fit | 4 | Compliance scanner, dev audience, India SaaS network |
| Speed to MVP | 4 | Core logic exists; feasibility spike passed |
| Platform risk (5 = low) | 2 | Chrome Enterprise Premium, plus AI chat sites could add their own key warnings (unverified whether any do yet) |
| Evidence of demand | 1 | No interviews, no pilot, waitlist count unknown |
| **Total** | **27 / 50** | A time-boxed bet worth making, not a safe one |

The four lowest scores (evidence, moat, WTP, differentiation) are the ones the next 60 days must raise. Code alone raises none of them.

### Odds (founder's-eye judgment, to revisit at each gate)
| Gate | Rough odds | What moves it |
|---|---|---|
| Day 30: ≥ 500 installs, ≥ 40% activation | ~50–60% | The study published + Show HN on the same day |
| Day 90: ≥ 3 paid teams | ~25–35% | 10 team conversations before the team tier is built |
| ₹1Cr ARR within 18 months | ~10–15% | Team tier converting from domain clusters; one channel partner |

### Wedge (revised)
- **Acquire with:** *"The AI answer checker"*. Fake and brand-new packages flagged inside ChatGPT/Claude, backed by our own published study. Nobody else owns this story.
- **Keep with:** secret taping + chat-leak scan (parity, done better, provably local).
- **Monetize with:** the SOC 2 / security-questionnaire answer for 20–200 person SaaS teams, at $4/user (under Chrome Enterprise Premium's $6).

### What "win" means
Not "most installs among redactors", because that market is free and crowded. Win = **the default AI-safety tool a 50-person SaaS team installs when a customer asks how they control AI**, and the name security press cites for slopsquatting data.

### Changes to the plan this forces
1. **Run the slopsquatting study now**, in parallel with the build (~$20–50 of API credits). It is the wedge, the launch and the first moat.
2. **Pre-sell before building the team tier:** 10 conversations with eng leads in SOC 2 prep within 14 days. Ask to see their questionnaire's AI questions. Offer a founding pilot price.
3. **Narrow the MVP to chatgpt.com + claude.ai.** Add Gemini after launch.
4. Kill criteria (decision report §9) stay as they are.
