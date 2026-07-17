# deploy

first deploy (order matters — fl worker must exist before pswh):

```sh
pnpm exec vite build
npx wrangler deploy

# plain worker secrets (values in .dev.vars)
for k in QDRANT_URL QDRANT_KEY OPENROUTER_KEY GOOGLE_ID GOOGLE_SECRET SECRET PAYSTACK_SECRET_KEY_TEST PAYSTACK_TEST; do
  grep "^$k=" .dev.vars | cut -d= -f2- | npx wrangler secret put "$k"
done
# when going live: npx wrangler secret put PAYSTACK_SECRET_KEY_LIVE, then set PAYSTACK_TEST to empty

# pswh (webhook router) — fl binding already in ~/i/pswh/wrangler.jsonc
cd ~/i/pswh && npx wrangler deploy
```

webhook smoke test (after both deploys): follow the curl test in
`~/.config/opencode/instructions/cloudflare-deploy.md` (HMAC-SHA512 body sig with
the paystack test secret, POST to pswh, expect `{"received":true}` forwarded from fl).

CI deploy-on-push: `.github/workflows/deploy.yml` needs repo secret `CLOUDFLARE_API_TOKEN`
(scoped: Workers Scripts Edit). mint it in the CF dash, then:

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo angelwingscomms/fl
```

R2 bucket `fl-img` and google oauth redirect `https://fl.<subdomain>.workers.dev/auth/google/callback`
must exist / be registered once.
