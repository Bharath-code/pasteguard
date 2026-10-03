# Extension (MV3, WXT + Preact)

Run from the repo root:
- `npm run dev -w apps/extension`: dev build with HMR (adds `http://localhost/*` for E2E mock pages)
- `npm run build -w apps/extension`: production build to `.output/chrome-mv3/`
- `npm run size -w apps/extension`: fails if `content-scripts/chat.js` > 25 KB gzip
- `npm run lint -w apps/extension` / `npm run typecheck -w apps/extension`
- `npm run zip -w apps/extension`: store package

Layout: `entrypoints/` (background, `chat.content`, `clipboard.content`, popup), `src/shared/` (site lists, i18n), `public/_locales/`. `design/` is the living UI doc; `spike/` is reference only and excluded from build and lint.

Architecture and feasibility: `.claudedocs/extension-decision-report.md` §11 and `.claudedocs/extension-prd-architecture.md`.
