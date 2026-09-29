# Slopsquatting study

How often do AI models recommend packages that don't exist, and have attackers already registered any of those names?

Zero dependencies. Node 22+.

## Run

```bash
node study.mjs prompts                      # 640 prompts (80 tasks × 8 phrasings, npm + PyPI). --limit 200 for a pilot
export LLM_API_KEY=...                      # any OpenAI-compatible gateway key
export LLM_BASE_URL=https://ai-gateway.vercel.sh/v1   # default; OpenRouter: https://openrouter.ai/api/v1
node study.mjs run --models anthropic/claude-sonnet-5.5,openai/<model>,google/<model> --concurrency 4
node study.mjs check                        # registry lookups, cached in data/registry.json (--fresh to recheck)
node study.mjs report                       # data/report.md + data/results.json
npm test
```

Model IDs depend on your gateway. Copy them from its model list. `run` is resumable: it skips prompt/model pairs that already succeeded.

## Method
- Tasks mix everyday and niche asks (niche asks are where models invent names). Prompts are shuffled with a fixed seed (`--seed`), so runs are reproducible.
- Packages are extracted **only** from install commands (`npm i`, `yarn/pnpm/bun add`, `pip install`, `uv/poetry/pdm add`) and `package.json` dependency blocks. Python `import` lines are ignored because import name ≠ package name (`cv2` → `opencv-python`).
- **Hallucinated:** the registry returned 404 at check time.
- **Suspicious:** exists, first published < 180 days ago, and < 500 weekly downloads (npm) or no download data (PyPI).
- Temperature 0.7 (recorded per row). Report the date, the model IDs and the gateway.

## Ethics (non-negotiable)
- Never install, download tarballs of, or execute any package. The scripts read registry metadata only.
- **Never register hallucinated names yourself**, not even "defensively". That pollutes the registries and the data.
- "Suspicious" is a triage list. Review each package's contents manually before naming it publicly. Report confirmed malicious packages to npm (`npm report` / security@npmjs.com) and PyPI (the "Report project as malware" link) **before** publishing.
- Re-run `check --fresh` monthly. Names moving from *hallucinated* → *registered* is the headline for the Slopsquatting Index.
