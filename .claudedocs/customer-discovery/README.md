# Customer discovery sprint: 10 eng-lead conversations in 14 days (2026-09-30 → 2026-10-14)

Files: `interview-script.md` (Mom Test script) · `outreach.md` (messages) · `leads.csv` (tracker).

## What we're testing
Research on 2026-09-30 found that public write-ups of AI questionnaire sections focus on **AI in the vendor's product** (model provenance, training on customer data, AI subprocessors) [1][2]. Fewer mention **staff use of AI tools**, though some do: which tools, what tier, data-handling terms, who has admin oversight [3]. Our team tier assumes the second kind of question is common and painful, so that assumption is the first thing to test.

| # | Hypothesis | Confirmed when | Killed when |
|---|---|---|---|
| H1 | SaaS teams of 20–200 get asked about **staff** AI use in security questionnaires | ≥ 5 of 10 show or describe a real question | ≤ 2 of 10 have seen one |
| H2 | Today they answer with a policy doc and no enforcement, and it feels weak | They describe a workaround or discomfort unprompted | "We just say yes, nobody checks" and they're fine with it |
| H3 | Engineers have pasted secrets or customer data into AI chat | A specific incident, or a rule they made after one | No incident, no rule, no worry |
| H4 | They'd pay ~$4/user for enforcement + evidence | ≥ 3 accept a pilot commitment (below) | Interest, but no commitment of time, intro or money |
| H5 | AI-suggested packages are a felt risk | A story of a wrong, fake or suspicious package from AI | Never came up, even when asked about the last AI-coding mistake |

**Decision on day 14:** H1 + H4 confirmed → build the team tier next (PRD P2). H1 killed → reposition the team tier around secret-leak incidents and audit logs instead of questionnaires, or drop it. Record this in `extension-decision-report.md` §9.

## Who to talk to
- **Company:** B2B SaaS, 20–200 people, sells to US/EU mid-market or enterprise, with SOC 2 in progress or renewed in the last 12 months. India-based teams selling abroad come first (your network).
- **Role:** CTO, VP/Head of Engineering, or Head of Security/GRC. That's the person who fills in the questionnaire, or gets pulled in to.
- **Not:** enterprises (Chrome Enterprise Premium's buyers), agencies, or companies with no enterprise customers yet.

## Where to find them (company-level signals only)
Work through these in order. Warm paths convert far better than cold ones.
1. **Your network (day 1).** Ask 15 people: *"Who do you know that's going through SOC 2 or security reviews right now?"* One intro beats 20 cold messages.
2. **vCISOs and SOC 2 consultants.** Each has 5–20 clients in exactly this state. Ask for 2 intros, and offer them the questionnaire compilation (below) as thanks. They're also the partner channel from gtm §2.
3. **Trust-center footprints.** Google `"Trust Center" "SOC 2" "Powered by Vanta"`, and the same with `SafeBase`, `Drata`, `Sprinto`. Filter by size on LinkedIn.
4. **Hiring signals.** LinkedIn Jobs: `"SOC 2"` or `GRC` or `"compliance analyst"` at companies of 11–200 employees. A company hiring for SOC 2 is in the middle of it.
5. **"Achieved SOC 2" posts** on LinkedIn from the last 12 months. Founders post these, and they're renewing the audit now.
6. **Communities:** SaaSBoomi, r/SaaS, r/cybersecurity, Indie Hackers, and founder Slack groups. Look for threads complaining about security questionnaires; reply helpfully first.
7. **Our waitlist:** every signup from a company email domain.

Log each company in `leads.csv` with **source URLs for each signal**. You add the person's name yourself from LinkedIn. Don't collect personal emails or phone numbers from third-party enrichment tools. LinkedIn messages and warm intros are enough for 10 calls.

**Funnel math:** warm intros often reply at 30–50%, cold LinkedIn messages at 5–15% (rough rule of thumb, not measured here). Plan on **~15 warm asks + ~60 cold touches → 10 calls**.

## The founding pilot offer (only at the end of a call, and only if they showed pain)
Nothing of the team tier is built yet, so the pilot is **concierge**: we deliver by hand what the product will later automate.

| They get (days 1–60) | We ask for |
|---|---|
| Free extension for the whole team, plus a guided install (force-install for Google Workspace) | 3 × 30-min feedback calls |
| An **AI usage section** for their next questionnaire: policy text + control description + evidence, written with them | The AI section of their last questionnaire (redacted is fine) |
| A monthly Leak Report (counts only) and the team tier as it ships | **Founding price:** $2/user/mo (50% off $4), min $29/mo, locked for 12 months after the pilot |

**Commitment ladder:** ask for the highest step they'll take.
1. **Money:** a $99 refundable deposit that holds a founding spot. This is the strongest signal.
2. **Reputation:** an intro to one peer going through SOC 2.
3. **Time:** the 3 calls + the questionnaire section.

"Sounds great, keep me posted" counts as **no commitment**.

## Give-back asset (makes asking easier)
Compile the AI questions we collect (anonymized, with no company names) into a public *"AI questions in security questionnaires, 2026"* page, with model answers. Every interviewee gets it first. It also serves as the gtm §6 lead magnet.

## 14-day schedule
| Days | Do | Output |
|---|---|---|
| 1 | Network asks (15), vCISO asks (5), list 40 companies from sources 3–5 | 40 rows in `leads.csv` |
| 2–5 | 10–15 cold touches/day, follow up on day 3 after each | 8–12 calls booked |
| 4–12 | Calls (≤ 2/day), notes written within 1 hour of each | Filled `H1–H5` columns |
| 13 | Synthesis: count evidence per hypothesis | 1-page memo |
| 14 | Decide per the table above, update the decision report | Go / reposition / stop |

## Sources
1. Aetos, "Enterprise buyers now have an AI section on their security questionnaire": https://www.aetos-data.com/answers-insights/enterprise-security-ai-questionnaires
2. LowerPlane, "Enterprise AI security questionnaires": https://lowerplane.com/blog/enterprise-ai-security-questionnaires/
3. Everything-PR, "Client AI security questionnaire": https://everything-pr.com/client-ai-security-questionnaire
