# fl — spec (frozen contract)

fl is a freelance marketplace with **one user type**. A user writes a profile describing what
they can do, and posts jobs. A job page shows other users whose profile embeddings match the
job embedding — no bidding, no browsing. The client chats with matches, hires one, funds
escrow via Paystack, and releases the money to the freelancer's balance when done.

Stack: SvelteKit (Svelte 5 runes) on Cloudflare Workers. Qdrant = the only DB. OpenRouter
qwen3-embedding-8b for embeddings. R2 for images. Paystack for money.

Conventions (AGENTS.md): snake_case, single-letter payload/JSON keys, no single-use vars,
extreme simplicity. Never run the dev server or `npm run build` directly.

## Data model — Qdrant collection `fl`, 4096-dim, Cosine

One collection. Kind discriminator on payload field `s`. Payload keyword indexes: `s`, `n`,
`m`, `j`, `u`, `f`, `o`.

### user (point id = uid, uuid)

| key | meaning |
| --- | --- |
| s | `'u'` |
| n | handle — unique, lowercase, `[a-z0-9-]{2,30}`; doubles as display name |
| m | email (lowercase) |
| h | password hash (pbkdf2, only for `o:'local'`) |
| o | `'google'` \| `'local'` |
| d | created ts (ms) |
| t | about text — "what I can do" |
| l | links: string[] |
| i | portfolio image R2 keys: string[] |
| a | avatar R2 key |
| b | balance in kobo (number, default 0) |

vector = embedding of `${n}\n${t}` once profile is written; ZERO before that.

**Auth fields (n at signup = email-derived or google name slug, m, h, o, d) and profile
fields (n, t, l, i, a) live on the SAME point.** Updates must use partial payload set
(`set_payload`), never a full upsert that clobbers other fields. Vector updates go through
`update_vector`.

### job (point id = job id, uuid)

| key | meaning |
| --- | --- |
| s | `'j'` |
| u | owner uid |
| t | title |
| d | description |
| c | created ts |
| y | status: `'o'` open → `'h'` hired → `'f'` escrow funded → `'r'` released/done |
| f | hired freelancer uid (set at hire) |
| e | escrow amount kobo (set when funded) |
| r | paystack reference (set when funded) |

vector = embedding of `${t}\n${d}`.

### msg (point id = uuid)

| key | meaning |
| --- | --- |
| s | `'m'` |
| j | job id |
| f | from uid |
| o | to uid |
| b | body |
| c | created ts |

vector = ZERO.

### payref (dedupe of processed paystack refs; point id = uuid5 = sha1(ref) formatted as uuid)

`{ s:'r', u: payer uid, j: job id, e: amount kobo }`, vector ZERO.

## lib/server/qdrant.ts (contract)

```ts
export const DIM = 4096;
export const ZERO: () => number[];
export async function ensure_coll(): Promise<void>; // create coll + all 7 keyword indexes, memoized
export async function get(ids: string[], with_vector?: boolean): Promise<Point[]>;
export async function upsert(points: Point[]): Promise<void>;
export async function set_payload(id: string, payload: Record<string, unknown>): Promise<void>; // POST /points/payload — partial merge
export async function update_vector(id: string, vector: number[]): Promise<void>; // PUT /points/vectors
export async function find(filter: Filter, limit?: number): Promise<Point[]>; // POST /points/scroll with filter
export async function find_by(field: string, value: string, limit?: number): Promise<Point[]>; // sugar over find
export async function query(vector: number[], filter: Filter, limit: number): Promise<Scored[]>; // POST /points/query with filter
export async function id_uuid(s: string): Promise<string>; // sha1 → uuid format (for payref ids)
```

Filter type = Qdrant filter JSON (`{ must: [{ key, match: { value } }] }`, `should` for OR).
Errors throw; callers catch where a fallback makes sense. No local Map fallbacks anywhere —
delete the existing ones (they mask real failures).

## lib/server/user.ts (contract)

```ts
export type User = { s:'u'; n:string; m?:string; h?:string; o?:'google'|'local'; d:number;
  t?:string; l?:string[]; i?:string[]; a?:string; b?:number };
export async function get_user(id: string): Promise<User | null>;
export async function get_user_by_email(email: string): Promise<{ id: string; user: User } | null>;
export async function get_user_by_handle(handle: string): Promise<{ id: string; user: User } | null>;
export async function create_user(fields: Partial<User>): Promise<string>; // uuid; ensure_coll; unique-handle: derive from email/name, suffix -2, -3… on collision
export async function update_user(id: string, fields: Partial<User>): Promise<void>; // set_payload
export async function credit_user(id: string, kobo: number): Promise<void>; // read b, set b+kobo
export async function create_pw_user(email: string, password: string): Promise<string>;
export async function verify_user_pw(email: string, password: string): Promise<{ id: string; user: User } | null>;
```

Google callback calls `get_user_by_email` → existing ? use : `create_user({ n: slug, m, o:'google', d })`.

## lib/server/embed.ts

Unchanged API `embed(text, env)` but the no-key fallback must return a 4096-dim vector
(hash-bucket into 4096), so dev upserts don't dim-mismatch.

## lib/server/paystack.ts (contract)

Port of `~/i/ver/src/lib/paystack.ts` with **WebCrypto** HMAC-SHA512 (no node:crypto —
worker has no nodejs_compat):

```ts
export function get_secret_key(): string; // PAYSTACK_TEST==='.' ? TEST : LIVE keys, dev default test (same logic as ver)
export async function paystack_init(email, amount_kobo, reference, callback_url, metadata?): Promise<{ authorization_url; access_code; reference }>;
export async function paystack_verify(reference): Promise<{ status; reference; amount; metadata }>;
export async function verify_webhook_sig(raw_body: string, signature: string): Promise<boolean>; // async — WebCrypto
```

`metadata.a = 'fl'` always stamped at init (pswh routes on it), plus `{ j: job_id, user_id: uid }`.

## Money flow

1. Job page (owner, `y:'o'`): "Hire" button per match → action sets `f`, `y:'h'`.
2. Owner enters amount ₦ → POST `/api/pay/escrow` `{ j, k }` (k = amount kobo, min 100000 =
   ₦1000) → guards: session uid === job.u, job.y === 'h' → `paystack_init(session email, k,
   uuid ref, origin + '/pay/callback?j=' + j, { a:'fl', j, user_id })` → returns
   `{ u: authorization_url, c: access_code, r: reference }`. Frontend uses
   `@paystack/inline-js` popup with 15s redirect fallback (copy ver's pattern).
3. Crediting path `settle(reference)` (shared fn in `lib/server/pay.ts`): `paystack_verify` →
   status success → payref point absent (get by `id_uuid('ps_' + ref)`) → write payref, set
   job `{ y:'f', e:amount, r:reference }`. Idempotent by payref existence.
4. `/webhook` (+server.ts POST, root path — pswh forwards here): verify HMAC sig against raw
   body; event `charge.success` && `data.metadata.a === 'fl'` → `settle(data.reference)`.
   Always 200 `{ received: true }` on valid sig.
5. `/api/pay/verify` POST `{ r }`: session required; `settle(r)`; returns `{ y }` (new job status).
6. `/pay/callback` page: reads `?reference=`, POSTs `/api/pay/verify`, links back to job.
7. Job page (owner, `y:'f'`): "Release payment" action → `credit_user(job.f, job.e)`, set
   `y:'r'`. Confirmation UI required (button + confirm state, no window.confirm).
8. Balance shows on /profile (₦, `(b/100).toLocaleString()`). Payouts: out of scope, show
   "payouts are manual for now — contact us" note when b > 0.

## Images (R2)

wrangler.jsonc: `r2_buckets: [{ binding: 'R2', bucket_name: 'fl-img' }]` (bucket exists).
app.d.ts Env gains `R2: R2Bucket`.

- POST `/api/img` — multipart field `f`; session required; ≤ 5 MB; content-type must be
  image/jpeg|png|webp|avif; key = `${uid}/${crypto.randomUUID()}`; `R2.put(key, stream,
  { httpMetadata: { contentType } })`; returns `{ k }`. 503 `{ error }` if no R2 binding (vite dev).
- GET `/i/[...k]` — `R2.get`; 404 if missing; streams body with content-type +
  `cache-control: public, max-age=31536000, immutable`.
- Images render as `/i/${key}`.

## Chat

- POST `/api/msg` `{ j, o, b }` — sender = session uid. Guard: job exists AND (uid === job.u
  ? o !== uid : o === job.u). Upserts msg point. Returns `{ ok: true }`.
- GET `/api/msg?j=&p=` — session uid must be job.u or p (peer uid)... thread = msgs of job j
  between job.u and the non-owner participant. Guard: uid === job.u || uid === p. Returns
  `{ t: [{ f, b, c }] }` sorted by c asc, filtered to the pair (job.u, p).
- `/jobs/[id]/chat/[fid]` page — fid = the non-owner participant. Access: uid === job.u ||
  uid === fid. Loads job title, peer handle+avatar, thread. Send goes through POST /api/msg
  (optimistic append). Realtime receive over a Cloudflare Durable Object: client opens
  `WebSocket('/api/chat/ws?j=&p=')`; the worker decodes the session cookie, routes to
  `env.CHAT.idFromName(j + '__' + p)`, and the DO broadcasts every POST fan-out to connected
  sockets. **POST /api/msg is the source of truth** (persists to Qdrant, then fire-and-forget
  broadcasts to the DO). The 4s poll of GET /api/msg stays as a fallback when the socket is
  closed or Durable Objects are unavailable (plain `vite dev`). Auto-reconnect with backoff.
  Delete the old `/jobs/[id]/msg/[fid]` route entirely; the old `ws/` Cloud Run server is dead.
- `/chats` inbox — msgs where `f===uid` OR `o===uid` (one `find` with should-filter), group
  by `${j}:${peer}` , newest first; each row: job title, peer handle, last message, time,
  link to `/jobs/[j]/chat/[non-owner-uid]`.

## Routes

| route | who | behavior |
| --- | --- | --- |
| `/` | public | hero + how-it-works + freelancer wall (find s:'u' with non-empty t, ≤ 24, shuffled) |
| `/login` | public | email/pw + google (existing endpoints unchanged) |
| `/profile` | auth | edit n/t/l + avatar & portfolio upload (via /api/img) + balance + link to my jobs |
| `/u/[handle]` | public | avatar, handle, about, portfolio grid, links; "hire me" → /jobs/new?d=… prefill? no — just CTA to post a job |
| `/jobs` | auth | jobs I posted (find s:'j', u:uid) + jobs I'm hired on (find s:'j', f:uid), status badges |
| `/jobs/new` | auth | title + description + post |
| `/jobs/[id]` | auth | owner: desc, matches (query job vector, filter s:'u', exclude uid, require t, top 9 → handle, avatar, about snippet, match % = score), hire/fund/release flow, chat links. non-owner: title/desc/status only + "chat with client" if uid === job.f or thread exists (just always show chat link to owner for logged-in non-owners… NO — only if uid===job.f or they already have msgs; matched users get contacted BY the client) |
| `/jobs/[id]/chat/[fid]` | participants | chat thread |
| `/chats` | auth | inbox |
| `/pay/callback` | auth | verify + link back |
| `/api/img`, `/i/[...k]`, `/api/pay/escrow`, `/api/pay/verify`, `/webhook`, `/api/msg` | see above | |
| `/api/auth/login`, `/api/auth/register`, `/auth/google*`, `/logout` | existing | keep; register/callback use new user.ts |

Delete: `/routes/demo`, `src/lib/vitest-examples`, `/jobs/[id]/msg/[fid]`, duplicate
`save_user` in qdrant.ts, `fl_uid` cookie fallback in profile action (auth required).

## Env

All code reads `$env/dynamic/private` strings directly. `secrets_store_secrets` bindings
inject Secret OBJECTS (deploy-doc gotcha) — so wrangler.jsonc drops `secrets_store_secrets`
entirely; every secret becomes a plain `wrangler secret put` at deploy time: `QDRANT_URL`,
`QDRANT_KEY`, `OPENROUTER_KEY`, `GOOGLE_ID`, `GOOGLE_SECRET`, `SECRET`,
`PAYSTACK_SECRET_KEY_TEST`, `PAYSTACK_SECRET_KEY_LIVE`, `PAYSTACK_TEST`. wrangler.jsonc vars:
`PAYSTACK_PUBLIC_KEY_TEST`/`_LIVE` (copy from ver). Local dev keeps `.dev.vars`.

## Tests

Unit (vitest, node): pw.spec.ts stays; new specs for paystack sig verify (known vector),
settle idempotency (mock fetch), user handle uniqueness (mock qdrant), msg guards, img route
guards (mock platform). e2e (playwright, existing config): auth flows (existing), profile
create → appears on /, post job → job page renders, chat send/receive between two sessions,
webhook 401 on bad sig. e2e run against preview build with .dev.vars (real qdrant dev
instance + fallback embed if no key).
