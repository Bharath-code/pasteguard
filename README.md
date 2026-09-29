# PasteGuard

Stops secrets and AI-invented packages from reaching ChatGPT, Claude and Gemini.

| Path | What | Run |
|---|---|---|
| `apps/landing` | Landing page + waitlist API (Cloudflare Pages) | `cd apps/landing && npm run dev` (wrangler) or `python3 -m http.server -d apps/landing/public 4321` |
| `apps/extension` | Chrome MV3 extension | not started |
| `research/slopsquatting` | Slopsquatting study | see its README |
| `.claudedocs` | Decision report, GTM strategy | |

## Deploy the landing page
```bash
cd apps/landing
npx wrangler kv namespace create WAITLIST   # paste the id into wrangler.toml
npx wrangler pages deploy
```
The waitlist API allows 5 requests per minute per IP (counted in KV under `rl:` keys that expire after 2 minutes).
Export signups: `npx wrangler@latest kv key list --binding WAITLIST --remote --prefix team:` (or `--prefix individual:`).
