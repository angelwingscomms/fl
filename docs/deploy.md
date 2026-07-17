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

### realtime chat (WebSocket + Durable Object) — build & deploy

the chat page uses a Cloudflare Durable Object (`CHAT`, class `ChatRoom`) for live
message delivery, with a 4s poll fallback. `main` in `wrangler.jsonc` is the
adapter's generated `.svelte-kit/cloudflare/_worker.js` — the adapter-cloudflare v7
writes its bundle to `main`, so a hand-written `main` is NOT possible. the `ChatRoom`
class + SvelteKit passthrough are injected **after build** by `scripts/patch-worker.mjs`.

```sh
pnpm exec vite build          # regenerates .svelte-kit/cloudflare/_worker.js
node scripts/patch-worker.mjs  # renames default export, appends ChatRoom DO
npx wrangler deploy        # uploads; migration v1 (new_sqlite_classes) creates the DO
```

secrets (incl. `SECRET` for WS cookie auth) are set via `wrangler secret put` (see above).
the WS route auth lives in `src/routes/api/chat/ws/+server.ts` (decodes session, routes the
`Upgrade` to `env.CHAT.get(id).fetch(request)`). client: `src/routes/jobs/[id]/chat/[fid]/+page.svelte`.

### verify realtime chat end-to-end

```sh
npx wrangler dev          # serves the worker locally with DO support (miniflare)
# in another shell:
npx playwright test e2e/jobs-chat.e2e.ts
```

the e2e opens the chat page, asserts a request to `/api/chat/ws` is made, sends a
message, and expects it to render. to confirm realtime specifically, watch the network tab
for the `101` upgrade and a green `live` status dot in the UI.
