# Interview script (Mom Test), 30 minutes

## Rules (reread before every call)
1. **Talk about their life, not our idea.** No pitch until the last 5 minutes, and only if they showed pain.
2. **Ask about specific past events,** not opinions or the future. "Tell me about the last time…" not "Would you…?"
3. **Talk less.** Aim for them speaking 80% of the time. Silence is fine.
4. **Compliments are noise.** "That's a cool idea" = zero data. Ask what they did about it.
5. **Dig into emotion and workarounds.** "What did you do then?" "What did that cost you?"
6. **Always end with a commitment ask** (README pilot offer). No commitment = not a customer yet.

## Opening (2 min)
> "Thanks for the time. I'm researching how small SaaS teams handle security reviews now that customers ask about AI. I'm not selling anything today. I want to learn how it actually works for you. Mind if I take notes?"

## 1. Context (3 min)
- Where are you with SOC 2 right now? What triggered it?
- Who on the team fills in security questionnaires? How many did you get in the last quarter?
- Which compliance platform, if any? (Vanta / Drata / Sprinto / consultant / spreadsheet)

## 2. Questionnaires and AI: tests H1, H2 (8 min)
- Walk me through the last security questionnaire you answered. Who sent it, and how long did it take?
- Were there questions about AI? What exactly did they ask? *(If yes:)* Could you show me, or paste the AI section afterwards, redacted?
- Were any of them about **how your own team uses AI tools**, rather than AI in your product?
- What did you answer? What evidence did you attach?
- How did you feel about that answer? Did the customer push back or follow up?
- If a customer asked "prove it", what would you show them today?

## 3. AI use on the team: tests H3 (7 min)
- Which AI tools does your team use day to day? How do you know? Is that list written down anywhere?
- Has anyone ever pasted something into ChatGPT or Claude they shouldn't have? Tell me about the last time. *(Keys, customer data, logs.)*
- What happened next? Did you rotate anything, write a rule, or talk to the team?
- Do you have an AI usage policy? When did you last check that people follow it?

## 4. AI-written code: tests H5 (4 min)
- Tell me about the last time AI-generated code caused a problem.
- Has an AI ever suggested a package or dependency that turned out wrong, fake, or suspicious? What did you do?
- How do new dependencies get reviewed today?

## 5. Spend and alternatives: tests H4 (3 min)
- What have you spent on SOC 2 and security reviews this year? (Tools, auditor, consultant, hours.)
- Have you looked at anything to control AI use? What happened with that? *(Listen for Chrome Enterprise Premium, DLP tools, "we just blocked ChatGPT".)*
- If this problem vanished tomorrow, what would change for you?

## 6. Close (3 min)
**If they showed real pain (a questionnaire question they struggled with, or an incident):**
> "Here's what I'm building: a browser extension that stops secrets going into AI chats and flags fake packages, plus a team register that becomes the evidence for exactly that questionnaire section. I'm looking for 5 founding teams for a 60-day pilot. I'd write your AI questionnaire answer with you, and you'd lock in 50% off for a year. The spots are held with a $99 refundable deposit. Would you want one?"

Then walk down the commitment ladder (README): deposit → intro → time.

**If they showed no pain:**
> "This was really useful. Who else do you know going through SOC 2 who might see this differently?"

Always ask: *"Can I send you the compiled AI-questionnaire list when it's ready?"*

## After the call (within 1 hour)
Fill in `leads.csv`:
- `h1`–`h5`: `+` (evidence for), `-` (evidence against) or `0` (not discussed), each with a one-line quote in `notes`.
- `commitment`: `deposit` / `intro` / `time` / `none`.
- The strongest verbatim quote. It's the raw material for landing-page copy later.

**Bad-data alarms.** Discount the call if you hear:
- compliments ("love it");
- fluff about the future ("we'd definitely use that");
- hypotheticals ("if you built X, then…").

Ask *"When did that last happen?"* to turn them back into facts.
