# deploy

deploys run on push to `master` via Cloudflare Workers Builds
(build `pnpm run build`, which also runs `scripts/patch-worker.mjs`; deploy `pnpm exec wrangler deploy`).

worker secrets (values in `.env`), set once:

```sh
for k in QDRANT_URL QDRANT_KEY OPENROUTER_KEY GOOGLE_ID GOOGLE_SECRET SECRET PAYSTACK_SECRET_KEY_TEST PAYSTACK_TEST; do
  grep "^$k=" .env | cut -d= -f2- | pnpm exec wrangler secret put "$k"
done
```

webhook smoke test (after both deploys): follow the curl test in
`~/.config/opencode/instructions/cloudflare-deploy.md` (HMAC-SHA512 body sig with
the paystack test secret, POST to pswh, expect `{"received":true}` forwarded from fl).

R2 bucket `fl-img` and google oauth redirect `https://fl.<subdomain>.workers.dev/auth/google/callback`
must exist / be registered once.

### realtime chat (WebSocket + Durable Object) — build & deploy

the chat page uses a Cloudflare Durable Object (`CHAT`, class `ChatRoom`) for live
message delivery, with a 4s poll fallback. `main` in `wrangler.jsonc` is the
adapter's generated `.svelte-kit/cloudflare/_worker.js` — the adapter-cloudflare v7
writes its bundle to `main`, so a hand-written `main` is NOT possible. the `ChatRoom`
class + SvelteKit passthrough are injected **after build** by `scripts/patch-worker.mjs`.

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
