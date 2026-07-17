# fl — design system (frozen contract)

Direction: **"the craft desk"** — warm, editorial, typography-led. Paper and clay, not SaaS
blue. Award-level polish comes from type + micro-interactions + pacing, not heavy WebGL.
Every interaction 10% better: cursor, hovers, reveals, transitions, counters.

## Tokens (layout.css `@theme`)

Light (default when `data-theme='light'` or system light):

```
--color-canvas: #f6f1e7;   /* warm paper */
--color-surface: #fffdf8;
--color-raised: #efe8da;
--color-text: #1b1611;     /* espresso ink */
--color-text-muted: #7a7061;
--color-accent: #c75b39;   /* terracotta */
--color-accent-hover: #a94a2d;
--color-border: #e4dbc9;
--color-good: #4a6b4f;     /* moss — funded/paid */
--color-good-bg: #e6ecdf;
```

Dark (`data-theme='dark'` or system dark, same override pattern as current css):

```
--color-canvas: #12100d;
--color-surface: #1b1712;
--color-raised: #241f18;
--color-text: #f2ead9;
--color-text-muted: #9a8f7c;
--color-accent: #e0754a;
--color-accent-hover: #ef8a5f;
--color-border: #332c22;
--color-good: #8fb996;
--color-good-bg: #22301f;
```

Radii: `--radius: 14px`, `--radius-lg: 22px`, `--radius-full: 999px`.
Shadow: `--shadow-card: 0 1px 2px rgb(27 22 17 / .05), 0 12px 32px -12px rgb(27 22 17 / .12);`
Easing: `--ease: cubic-bezier(0.16, 1, 0.3, 1)` (out-expo). Hovers 0.25s, reveals 0.7s.

Grain: fixed full-viewport `::after` on body (or `.grain` div in layout) using inline SVG
feTurbulence data-uri, `opacity: .04` light / `.06` dark, `pointer-events: none`, z-index 999.

## Type

Fonts self-hosted in `static/fonts` (already downloaded):

- `fraunces-vf.woff2` + `fraunces-italic-vf.woff2` — `font-family: 'Fraunces'`; variable
  `opsz` 9–144, `wght` 100–900. Display only.
- `space-grotesk-vf.woff2` — `font-family: 'Space Grotesk'`, `wght` 300–700. Everything else.

`@font-face` with `font-display: swap`, `font-weight: 100 900` / `300 700` ranges.

- `--font-display: 'Fraunces', georgia, serif` — headings h1/h2, big numbers.
  `font-variation-settings: 'opsz' 144; font-weight: 560; letter-spacing: -0.02em;`
- `--font-sans: 'Space Grotesk', system-ui, sans-serif` — body, UI, forms.
- Display size: `clamp(2.9rem, 8vw, 6.8rem)`, line-height 0.98. h2: `clamp(1.8rem, 4vw, 3rem)`.
- Eyebrow: Space Grotesk 500, 0.7rem, uppercase, `letter-spacing: .22em`, muted.
- Italic terracotta accent word inside display headings (`<em>` → Fraunces italic, accent
  color, `'SOFT' 100` if supported).

## Motion — `src/lib/motion.ts` (Svelte actions, ~120 lines total, no deps)

```ts
export function reveal(node, opts?: { delay?: number; y?: number }) // IO once → adds .in; base class .reveal
export function magnet(node, strength = 0.25) // desktop only (pointer: fine), translate toward cursor on hover, spring back via transition
export function counter(node, opts: { to: number; suffix?: string; dur?: number }) // IO once → rAF count-up, respects reduced motion (jump to end)
```

CSS: `.reveal { opacity: 0; transform: translateY(26px); transition: opacity .7s var(--ease), transform .7s var(--ease); } .reveal.in { opacity: 1; transform: none; }`
Stagger via `style="transition-delay: {i * 70}ms"` where lists render.
All motion no-ops under `prefers-reduced-motion` (existing global kill stays LAST in css).

## Cursor — `src/lib/Cursor.svelte`

Custom cursor, mounted once in +layout: 10px dot (accent, `mix-blend-mode: difference`
fallback plain) + 36px ring trailing with lerp (rAF, factor .18). Elements with
`data-cursor="View"` (etc.) grow the ring to 64px and show the label inside it (0.65rem
Space Grotesk). Hidden entirely when `matchMedia('(pointer: coarse)')` or reduced motion;
never hide the native cursor on touch. `<html>` gets `cursor: none` only while active on
fine pointers.

## Page transitions

In +layout.svelte: `onNavigate` → `document.startViewTransition` (guarded), the standard
SvelteKit snippet. CSS: `::view-transition-old(root), ::view-transition-new(root)
{ animation-duration: .25s; }`.

## Components (css classes, keep current names where they exist)

- `.btn-fl` — pill, accent bg, cream text; contains a span arrow `→` that slides 4px on
  hover; `magnet` action applied on primary CTAs; active scale .97.
- `.btn-ghost` — 1px border, transparent, ink text, hover border-accent + text-accent.
- `.card-fl` — surface, 1px border, radius-lg, shadow-card; hover: translateY(-3px) +
  border-accent transition (only on interactive cards).
- `.field-fl` — surface bg, 1px border, radius, focus border-accent + subtle ring
  `box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent)`.
- `.tag-fl` — pill, raised bg, xs.
- `.avatar` — round, 1px border; sizes 32/48/96. Fallback = first letter of handle on
  raised bg in Fraunces.
- Status badges: `y:'o'` tag "open" muted; `'h'` "hired" accent outline; `'f'` "in escrow"
  good-bg/good; `'r'` "released" good solid.
- Link underlines: animated `background-image` underline scale on hover for inline links.
- `.marquee` — overflow hidden, inner flex duplicated content, CSS keyframes translateX
  -50%, 30s linear infinite, pause on hover.

## Nav

Sticky, canvas/85 + backdrop-blur, border-b. Left: wordmark `fl` in Fraunces italic 1.5rem
with terracotta `*` after it. Right: Chats, Jobs, theme toggle (existing sun/moon), avatar
link to /profile when logged in (else "Sign in"), primary CTA "Post a job". Mobile: same
row, CTA collapses to `+`.

## Home page (the showpiece)

1. **Hero** — full-viewport-ish (min-h 88svh) grid. Eyebrow "the anti-marketplace". H1
   (Fraunces, per-word staggered reveal on load — words wrapped in overflow-hidden spans,
   translateY 110% → 0, 80ms stagger): `Work finds` newline `the <em>worker</em>.` Sub
   (max-w 34ch): "Post a job and it's matched — by meaning, not keywords — to people who
   can actually do it. No bids. No browsing. Escrow until it's done." CTAs: btn-fl "Post a
   job" (magnet) + btn-ghost "Write your profile". Hero copy sits directly over the §0
   video background; the sub-paragraph gets a `.pane` (translucent canvas + backdrop-blur)
   for AA contrast. Closes with a muted eyebrow: "scroll — the clay moves with you".
0. **Page background (the canvas itself)** — `static/hero.mp4` (all-intra encode, 960px,
   muted playsinline preload=auto, poster hero.jpg) as a `position: fixed; inset: 0;
   z-index: -1` full-bleed layer behind the whole page (works because body's canvas bg
   propagates to the root canvas, painting beneath negative-z children). **Scrubbed by
   whole-page scroll progress**: lerped `currentTime = p × duration` in a continuous rAF
   loop, paused on `visibilitychange`. Over it a theme-aware scrim: vertical gradient of
   `color-mix(canvas Ns%, transparent)` — ~88% at top (nav), ~52% mid (vivid), ~92% at
   bottom (footer) — so legibility adapts to light/dark automatically. **Reduced motion:
   hero.jpg still instead of video, no scrub.**
2. **Marquee** — freelancer handles from data, `✳` separators, links to /u/handle. Opaque
   canvas band (grounding break between vivid moments).
3. **How it works (scrollytelling)** — 340vh section, sticky h-screen inner; the fixed
   video behind is at its most visible here. A `.pane-lg` glass panel (translucent canvas
   68% + blur, hairline border) holds the 3 beats crossfading (grid-stacked,
   opacity/translateY), active index `floor(p_section × 3)`, huge Fraunces numerals
   01/02/03, plus 3 accent tick bars: "Say what you can do / write your profile in plain
   words." · "Post what you need / matches appear instantly, ranked by fit." · "Pay into
   escrow / money moves only when the work is done." **Reduced motion: no pinning — the
   static 3-row `reveal` layout on a near-opaque band.**
4. **Freelancer wall** — responsive grid of profile cards: avatar, handle, 2-line about
   clamp, `data-cursor="View"`, reveal stagger. Section sits on a near-opaque
   (color-mix 88%) canvas band — the page settles down toward the footer.
5. **Footer** — oversized muted `fl*` wordmark (clamp 6rem), links /jobs/new /login, "made
   with embeddings".

## Other pages — shared rules

Every page: h1 in Fraunces with a one-word terracotta em; eyebrow above; `reveal` on
sections; consistent max-widths (`.container-fl` 42rem for forms/chat, 64rem for grids —
add `.container-wide`). Forms: labels as eyebrows (current pattern), generous spacing.
Empty states get personality: e.g. jobs: "Nothing here yet. Post one — matching takes
seconds." Chat: bubbles — mine accent bg cream text right-aligned, theirs surface border
left; timestamps tiny muted; input pinned bottom of card with send btn. Job matches: card
grid with big Fraunces match % (counter action), avatar, about snippet, Chat + Hire
buttons. Login: centered card, Fraunces "Welcome to <em>fl</em>", google btn + divider +
fields (keep existing logic/classes).

## Accessibility & perf

- All animation opacity/transform only. No layout thrash. IO-based, no scroll listeners
  except hero parallax (rAF-throttled, passive).
- Focus-visible ring stays. Buttons are `<button>`/`<a>`, labeled icons.
- Body text ≥ 0.95rem, contrast AA on both themes.
- Video: scrub video `preload="auto"` (seeking needs buffer), poster, ≤ ~3 MB; it only
  advances via scroll so `document.hidden` needs no pause handling.
- Fonts preloaded in app.html (`<link rel="preload" as="font">` × 2 main files).
