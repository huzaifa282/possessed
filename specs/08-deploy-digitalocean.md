# 08 · Deploying on DigitalOcean (+ .tech domain)

## 8.1 App Platform (P0)

1. Push the repo to GitHub (`huzaifa282/possessed`).
2. DigitalOcean → Apps → Create App → GitHub repo, branch `main`, autodeploy on push.
3. Component: Web Service, Node.js buildpack. Build `npm ci && npm run build`, run `npm start`, HTTP port 8080 (`PORT` env; Next reads it).
4. Region: **BLR1** (closest to Pakistan) or FRA1.
5. Plan: smallest Basic instance (1 vCPU / 1 GB) is enough: the model runs elsewhere.
6. Env vars (encrypted): `GEMINI_API_KEY`, `MODEL_PROVIDER=gemini-gemma`, `GEMMA_MODELS`, `RATE_LIMIT_PER_HOUR=20`.
7. Health check path: `/api/health`.
8. Credits: check `hacktoberfest.com/my/promos` and DigitalOcean's new-account credit before creating paid resources.

## 8.2 .tech domain (P0, cheap win)

1. Claim the free first-year `.tech` domain at `hacktoberfest.com/my/promos` (e.g. `possessed.tech` or `possessedui.tech`, whatever is available).
2. App Platform → Settings → Domains → add the domain; follow the DNS instructions (CNAME/ALIAS or move nameservers to DigitalOcean).
3. HTTPS is automatic.
4. Link the domain in the README and the post.

## 8.3 Optional: Gemma on a GPU Droplet (P2 / only with credits)

- Create a GPU Droplet with a 1-Click model or a vLLM image serving a Gemma model; restrict the firewall to the App Platform's egress or protect with an API key.
- Set `MODEL_PROVIDER=openai-compat`, `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_MODEL`.
- Record latency and cost per possession for the post. Turn it off after recording if credits are limited, and say so honestly.

## 8.4 Production checks

- [ ] `GEMINI_API_KEY` not in the client bundle (search `.next/static` for `AIza`)
- [ ] Rate limit works behind App Platform's proxy (`x-forwarded-for`)
- [ ] `public/vendor` files are served with long cache headers
- [ ] Preview works on the deployed origin (CSP uses the deployed origin)
- [ ] Custom domain on HTTPS
- [ ] `/fonts/*` sends `Access-Control-Allow-Origin: *` (fonts load inside the sandboxed preview)
