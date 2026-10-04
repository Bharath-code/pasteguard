# Release checklist

Tick every item per release and record the date and commit at the bottom. CI never publishes; you upload the zip yourself.

## Build
- [ ] Tag the commit `vX.Y.Z`, bump `version` in `package.json` first. The `release` job in `.github/workflows/ci.yml` builds the zip from the tag and uploads it as an artifact.
- [ ] `npm ci && npm run zip -w apps/extension` run twice gives the same SHA-256 (checked locally at 0.0.0; check again on the tag).
- [ ] All gates green on the release commit: `npm test && npm run gates -w packages/core && for s in lint typecheck build size e2e; do npm run $s -w apps/extension; done` (includes `e2e/prod-build.spec.ts`).
- [ ] Budgets: `npm run size -w apps/extension`; popup FCP within the design doc budget.

## Chrome Web Store account
- [ ] Developer account has 2FA on.
- [ ] Verified CRX uploads enabled.

## Real-site check (weekly and before every release, fake key only)
Run on chatgpt.com, claude.ai and gemini.google.com. Screen-record one answer per site.
- [ ] Paste of the fake key is taped.
- [ ] Send, then restore renders the real value.
- [ ] The site's own Copy button returns the real value.
- [ ] ⌘C on a selection returns the real value (ChatGPT included; untested in the spike).
- [ ] `npm i react-form-utils-pro` in an answer shows the package chip.
- [ ] No flicker while an answer streams.

| Date | Commit | chatgpt.com | claude.ai | gemini.google.com |
|---|---|---|---|---|
| | | | | |

## Accessibility and display
- [ ] Keyboard-only run through paste chip, restore, package chip, popup, options.
- [ ] VoiceOver announces the chip once and the exposed-send state assertively.
- [ ] Reduced motion spot check.
- [ ] Forced colors spot check.

## Store listing
- [ ] Title: "Stop secret leaks in ChatGPT & Claude".
- [ ] Restore GIF recorded on the mock site (`chat.example.ai`), no real brands.
- [ ] Privacy policy link points to the What we see page.
- [ ] Permission justification for each host permission and `storage`.
- [ ] Single-purpose statement.

## After submission
- [ ] Kill-criteria dashboard started: installs and activation (first real catch within 7 days), per decision report §9.

## Release log
| Version | Date | Commit | Submitted by |
|---|---|---|---|
| | | | |
