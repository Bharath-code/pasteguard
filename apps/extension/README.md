# Extension (MV3), not started

Planned layout, per the feasibility section of `.claudedocs/extension-decision-report.md`:
- `content/paste-guard.js`: capture-phase `paste` listener on AI chat sites (tested in the ProseMirror spike)
- `content/restore.js`: per-site adapters that put real values back in AI answers
- `main-world/clipboard.js`: wraps `navigator.clipboard.writeText` so "Copy" returns real values
- `background.js`: registry lookups for the package check
- `rules/`: detection rules shared with `apps/landing/public/detect.js`
