# PasteGuard monorepo

@DESIGN.md

- `apps/landing`: static site (no framework) on Cloudflare Pages + a Pages Function for the waitlist (KV). `npm test` runs the detection tests.
- `apps/extension`: MV3 extension (not started).
- `research/slopsquatting`: zero-dependency study pipeline. `npm test`.
- `.claudedocs`: strategy reports.

Rules: keep the landing page dependency-free, never use innerHTML with user input, keep the CSP in `apps/landing/public/_headers` in sync when adding origins.
