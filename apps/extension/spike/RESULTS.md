# Spike results (2026-09-30, mock pages only)

Run: `python3 -m http.server 4323` in this folder, open `shadow.html`; `npm i && npx playwright install chromium && node run.mjs` for 1b.

| # | Question | Result |
|---|---|---|
| 1a.1 | Closed-shadow `<pg-v>` text hidden from `innerText`/`textContent`/`innerHTML`, `shadowRoot === null` | Yes |
| 1a.2 | Selection + ⌘C copies the real value | **No.** `getSelection().toString()` skips shadow text, so a native copy yields "Use  as the key". Need our own `copy` handler (isolated world) that rebuilds the text, and it must `stopImmediatePropagation` so page listeners never see the real value in `clipboardData`. |
| 1a.3 | Restore pass on streaming re-render stays under 2 ms | Yes on mock: 51 text chunks, p50 0 ms, max 0.3 ms. Re-measure on real sites. |
| 1b | Isolated world can write the real value using the click's user activation while MAIN wrapper holds nothing | Yes (Chromium 153): clipboard = real key, page-world has no vault. |
| 1c | Sync paste decision | Already covered by the earlier ProseMirror spike. |

Not tested: real chatgpt.com / claude.ai / gemini.google.com (need logged-in sessions), Firefox/Safari.
Known gap in 1b: the page can dispatch a fake `pg-copy` event; it needs live user activation and only ever gets values written to the clipboard, never read back, but validate the event source (`isTrusted` doesn't apply to CustomEvent, so gate on `navigator.userActivation.isActive`).

## Real-site pass (2026-09-30, Claude in Chrome, spike extension loaded)

Sites: chatgpt.com (logged out), gemini.google.com (logged in). claude.ai not tested. Prompt sent: code block containing only `PG_SECRET_1`.

| Variant | ChatGPT | Gemini |
|---|---|---|
| A. Shadow-only `<pg-v>` (value only in closed shadow, no light text) | Restore OK, page can't read it. **Site Copy button pasted `export KEY=` (value lost)**, wrapper never fired because the text had no placeholder. | not run |
| B. `<pg-v>` keeps `PG_SECRET_1` as light-DOM text; closed shadow renders the value, no slot | Restore OK, no leak, survived re-render. Site Copy button, wrapper and isolated-world write gave the real key. | Same: restore OK (1.1 ms), no leak, Copy gave the real key. |

**Design change:** use variant B. Placeholders are not secret, so page JS reading `PG_SECRET_1` is fine. DOM-derived copies (site Copy buttons, native selection) now carry the placeholder, which the wrapper and our `copy` handler substitute. This fixes site Copy buttons that read `textContent`. It does NOT fix native ⌘C on a selection: `innerText` and `getSelection().toString()` still skip the unslotted light text (re-verified on the mock), so the isolated-world `copy` handler is still required.


## Second pass: claude.ai and the copy handler

| Test | claude.ai | gemini |
|---|---|---|
| Restore in answer, no page leak | Pass (1.5 ms) | Pass |
| Site Copy button | **Failed first.** claude.ai copies with `navigator.clipboard.write([ClipboardItem])`, not `writeText`. Fixed by also wrapping `write` in the MAIN-world script (reads the `text/plain` blob, relays placeholder text only). Then pass. | Pass (`writeText`) |
| Native selection + ⌘C via isolated-world `copy` handler | Pass | Pass after fix |

Findings:
- Wrap **both** `clipboard.writeText` and `clipboard.write`. Other sites may use `execCommand('copy')`, not yet seen.
- A triple-click or drag to line end ends the range just before `<pg-v>`, so the range excludes it. The handler extends the range over an adjacent `<pg-v>` (`setEndAfter`). A selection that deliberately stops before the value still copies without it, which is correct.
- The handler builds text from `cloneContents()` and calls `stopImmediatePropagation`, so page listeners never see the real value.

Not tested: ChatGPT native ⌘C (handler is site-independent), streaming flicker on live answers, `execCommand('copy')` sites.
