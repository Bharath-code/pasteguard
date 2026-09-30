# Extension feasibility spike: report

Date: 2026-09-30. Scope: PRD §1a (restored values must not enter the page's DOM) and §1b (clipboard wrapper must not hold secrets). Code and raw results: `apps/extension/spike/` (commits bffc922, 0204338).
Verdict: **passed, with two design changes.** Both are folded into the PRD.

## How we tested
1. **Mock pages** (local server, headless Chromium 153 via Playwright, extension loaded with `--load-extension`): closed-shadow `<pg-v>` behaviour, restore timing, isolated-world clipboard write.
2. **Real sites** (the user's own Chrome, spike extension loaded unpacked, driven with Claude in Chrome): chatgpt.com (logged out), gemini.google.com and claude.ai (logged in). One prompt per site asked for a code block containing only `PG_SECRET_1`. The fake key `AKIAIOSFODNN7EXAMPLE` lived only in the extension, never in any prompt.
3. On each site: restore the placeholder into a `<pg-v>`, check what page JS can read, click the site's Copy button, paste, then select and press ⌘C, paste.

Automated browsers could not be used for real sites: Google blocks sign-in from them, and branded Chrome 137+ ignores `--load-extension`.

## Results
| Question | Mock | ChatGPT | Gemini | claude.ai |
|---|---|---|---|---|
| Page JS cannot read the restored value (`innerText`, `textContent`, `innerHTML`, `shadowRoot`) | Pass | Pass | Pass | Pass |
| Restore pass under the 2 ms budget | 0.3 ms max | n/a | 1.1 ms | 1.5 ms |
| Restore survives site re-render (3 s) | n/a | Pass | Pass | Pass |
| Site Copy button returns the real value | Pass | Pass | Pass | Pass (after fix 2) |
| Native selection + ⌘C returns the real value | Fail, then fixed | not run | Pass (after fix 3) | Pass |
| Page-world holds no vault | Pass | n/a | n/a | n/a |

## What failed and what we changed
1. **Shadow-only host loses the value on Copy (ChatGPT).** Its Copy button builds text from the DOM, which excludes closed-shadow text, so it pasted `export KEY=`. **Fix:** `<pg-v>` keeps `PG_SECRET_1` as light-DOM text and the closed shadow root (no slot) renders the value. Placeholders are not secret, so page JS reading them is fine.
2. **claude.ai copies with `navigator.clipboard.write([ClipboardItem])`, not `writeText`.** The wrapper never fired and the placeholder was pasted. **Fix:** wrap both `write` and `writeText` in the MAIN-world script. It reads the `text/plain` blob and relays only placeholder text to the isolated world, which substitutes and writes using the same user activation.
3. **Native ⌘C skips the placeholder.** `innerText` and `getSelection().toString()` ignore the unslotted light text, so a selection copies without the value. **Fix:** an isolated-world `copy` handler rebuilds the text from `range.cloneContents()`, substitutes the vault value, calls `stopImmediatePropagation` (page listeners never see the real value), and **extends the range over an adjacent `<pg-v>`**, because a triple-click or drag to line end stops just before the host (seen on Gemini).

## Not tested (carry into the build plan)
- Native ⌘C on ChatGPT (handler is site-independent).
- Flicker while an answer streams on real sites; only a full-tree restore pass was timed.
- Sites that copy via `document.execCommand('copy')`.
- A page dispatching a fake `pg-copy` event: gate the isolated handler on `navigator.userActivation.isActive`.
- Copy of a selection that spans several `<pg-v>` or partially covers one.
- Daily Playwright synthetic tests per site adapter (decision report §11).
- Gemini's first ⌘C attempt pasted nothing; the repeat passed. Cause unverified, likely test timing.

## Side effects of testing
Two chats were created: "Bash Export Command Assignment" (Gemini) and "Bash export command for PG_SECRET_1" (claude.ai). They contain only the placeholder. The ChatGPT chats were logged out and are not saved.
