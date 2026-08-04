# Swipe & Scale — marketing site

## What this is

The marketing site for Swipe & Scale, a one-person motion-led web design studio.
It is simultaneously the portfolio, the sales page and the product demo: the site
sells the ability to build sites that feel expensive, so the site itself is the
proof. Single page at `/` plus two legal routes. Prices are on the page, in full,
without a click — the page is meant to do the qualifying so a prospect emails
instead of booking a discovery call.

Governing documents live beside this file: `BRIEF-01-BUILD.md` (why) and
`01-BUILD-SPEC.md` (what — §10 is the acceptance checklist).

## Stack

| Piece | Version | Notes |
|---|---|---|
| Next.js | 15.5.22 | App Router, TypeScript, all routes statically prerendered |
| React | 19.2.8 | |
| Tailwind CSS | 4.3.3 | CSS-first config via `@theme` in `app/globals.css` |
| GSAP | 3.13.0 | core + ScrollTrigger only, dynamically `import()`ed |
| TypeScript | 5.9.3 | |
| Node | 20 LTS | pinned by `engines` |
| pnpm | 10.34.5 | |

Those four runtime dependencies are the whole list. No framer-motion, no lenis,
no three/R3F, no UI kit, no CMS, no database, no auth. Deploy target is Vercel.

## Getting started

**The shell default `node` on this machine is v16 and will fail every command
below.** Prepend this to every shell you use — shell state does not persist
between tool calls. Node 20 must come first (the project pins Node 20 LTS);
Node 24 must be on the path second because the `pnpm` shim only exists there.

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
node -v   # must print v20.20.2
```

Then, from `projects/port-1/`:

```bash
pnpm install --frozen-lockfile   # ~0.2s when the lockfile is already satisfied
pnpm dev -p 3000                 # first compile of / takes ~35s; ready in ~55s
pnpm build                       # ~49s, emits 10 static routes
pnpm typecheck                   # tsc --noEmit
pnpm start -p 3000               # serves the production build
```

**Never run `build` and `typecheck` concurrently.** They race on `.next/types`
and emit phantom duplicate-identifier errors that look like real type failures.
Run them in sequence.

Copy `.env.example` to `.env.local` and set both variables. Both are
`NEXT_PUBLIC_*` and neither is a credential:

- `NEXT_PUBLIC_SITE_URL` — absolute origin. `metadataBase`, the canonical,
  `og:image`, `robots.txt` and `sitemap.xml` all derive from it. **Must be set at
  deploy** or all of them ship pointing at localhost.
- `NEXT_PUBLIC_FORM_ENDPOINT` — Formspree form endpoint. The contact form posts
  to it natively with `method="POST"`, so it works with JS disabled. The value
  currently in `.env.local` is a placeholder form id and is not a live inbox.

## Structure

```
projects/port-1/
├── app/
│   ├── layout.tsx            fonts (next/font/google), metadata, metadataBase
│   ├── page.tsx              the single page: section order + Timecode + ScrollDirector
│   ├── globals.css           @theme tokens, base layer, component primitives,
│   │                         hero reveal keyframes, reduced-motion block
│   ├── privacy/page.tsx      /privacy
│   ├── terms/page.tsx        /terms
│   ├── sitemap.ts            /sitemap.xml
│   ├── robots.ts             /robots.txt
│   └── icon.svg, favicon.ico
├── components/
│   ├── motion/               owned by Script 2 (motion engine)
│   │   ├── FrameSequence.tsx canvas frame renderer; poster <img> + <canvas> + <noscript>
│   │   ├── useFrameLoader.ts concurrency-6 image loader, releases bitmaps on unmount
│   │   ├── useCoverFit.ts    object-fit: cover maths, allocation-free
│   │   ├── ScrollDirector.tsx the page's only GSAP consumer (owned by Script 1)
│   │   └── types.ts
│   ├── sections/             Hero, Positioning, Work, WorkCase, Process,
│   │                         Pricing, Faq, Contact, Footer
│   └── ui/                   Timecode, Eyebrow, Button
├── content/                  work.ts, pricing.ts, faq.ts — typed TS, no CMS
├── lib/sequences.ts          sequence manifest registry + frame-state pub/sub
│                             + dominance arbitration for the readout
├── public/seq/               frame sequences (see Assets)
├── scripts/                  gen-placeholder-frames.py, gen-og-image.py
└── qa/                       screenshots/ (133 PNGs), lighthouse/ (before + after)
```

Every section is a server component. The only client islands are `Timecode`,
`FrameSequence` and `ScrollDirector`, so the full document is in the SSR HTML.

## Assets

Frame files: `public/seq/<id>/<width>/frame_NNNN.webp` (1-based, 4 digits).
Poster: `public/seq/<id>/poster.webp`. Widening `widths` in `lib/sequences.ts`
when higher renditions land on disk must require no change anywhere else.

| id | mode | frames | rendition | source px | aspect | on disk | poster |
|---|---|---|---|---|---|---|---|
| `hero` | scrub | 180 | 1440 | 1440×810 | 16:9 | 1.34 MB | `/seq/hero/poster.webp`, 4 KB |
| `case-01` | loop | 60 | 960 | 960×600 | 16:10 | 244 KB | `/seq/case-01/poster.webp`, 4 KB |
| `case-02` | loop | 60 | 960 | 960×600 | 16:10 | 244 KB | `/seq/case-02/poster.webp`, 4 KB |
| `case-03` | loop | 60 | 960 | 960×600 | 16:10 | 244 KB | `/seq/case-03/poster.webp`, 4 KB |

`public/og.jpg` — 1200×630 JPEG, 44 KB.

**All four sequences are placeholder frames** generated by
`scripts/gen-placeholder-frames.py` under the §9 placeholder protocol. They are
flat graphite cards carrying the sequence id and frame number. Script 3 owns
`public/seq/` and swaps real frames in; the manifest makes that a drop-in
replacement.

Constraints that apply to the real frames when they arrive:

- No `<video>`, HLS, GIF or Lottie anywhere. Canvas image sequences only.
- Every sequence needs an `alt` in the manifest; the `<canvas>` carries
  `role="img"` and that label.
- **There is currently no composition contract for the hero.** The headline sits
  bottom-left over the full-bleed sequence and reaches into the middle of the
  frame at every breakpoint; the vignette darkens the corners, not the centre.
  Frames must keep their lower-left/centre-left third quiet or the headline
  becomes unreadable — see Status.
- Only a 1440 rendition of the hero exists, so a 375px phone downloads 1.34 MB
  of 1440-wide frames. `pickWidth()` already supports narrower renditions; add a
  720 set.

## Status

Built and verified (reviewed 2026-08-04 against a production build):

- All copy in spec §7 present verbatim — headline, positioning statement, four
  process steps, both pricing cards with prices and bullets, subcontract note,
  all six FAQ items, contact copy. Checked string by string against the rendered
  HTML, 0 mismatches.
- All three work cases read `STATUS · Unsolicited concept`. Nothing on the site
  claims a client, a metric, a testimonial or a result.
- Design tokens in `app/globals.css` are byte-identical to spec §4.
- Keyboard pass: 21 tab stops at 1440 and at 375, every control reachable in
  document order, every one with a visible `2px solid #3B4CFF` ring at `3px`
  offset. Nothing traps focus.
- `prefers-reduced-motion: reduce`: the 300svh track collapses to one viewport,
  the pin becomes `position: static`, no element sits below opacity 1, and two
  screenshots 1.5s apart at the same scroll offset are byte-identical.
- JS disabled: every section's text renders, `<details>` FAQ opens natively, the
  contact form falls back to a native Formspree POST, posters render from
  `<noscript>`.
- No horizontal overflow at 375 / 768 / 1440 (`scrollWidth === innerWidth`).
- LCP element is the visible `<span>expensive.</span>` — the headline paints in
  its final position in the first frame; the CSS keyframe animates
  `translateY(30%) → 0` only, never opacity or a full-height mask.
- Contrast: 0 text failures at 375 / 768 / 1440, measured with a script over
  every rendered text node. Zero elements use `--color-signal` as a text colour.
- Restraint holds: the frame counter is the only flourish. No custom cursor, no
  magnetic buttons, no marquee, no grain overlay, no particles.
- Lighthouse mobile after fixes: performance 99, accessibility 100, best
  practices 100, SEO 100. FCP 0.8s, LCP 2.3s, TBT 20ms, CLS 0.
- `pnpm build` and `pnpm typecheck` both clean; 10 static routes; `/`, `/privacy`,
  `/terms`, `/sitemap.xml`, `/robots.txt` all 200 and an unknown path 404s.
- Zero console errors at any breakpoint.

Known broken — this build was **rejected** on the first two:

1. **The Timecode readout overprints page copy.** It is `position: fixed` at
   `bottom/left: var(--gutter)` with no scrim and no reserved lane, so content
   scrolls under it. Measured collisions: 10 of 25 sampled scroll offsets at 375,
   5 of 26 at 768, 3 of 22 at 1440 — including the `<h2>` "Two ways to work
   together." directly above the prices, and the "Start a Signature Page" CTA at
   1440. Worst at 375 because `--gutter` collapses to 1.25rem while body copy
   goes full-bleed. Needs a narrow-viewport branch.
2. **The hero sequence collides with the headline.** With the placeholder frames
   in the repo the blue `HERO 001 / 180` runs straight through "that feel" at 768
   and 1440. The placeholder is authorised, the missing composition contract is
   not.
3. Footer `X` link is 8×44 CSS px — spec §8 requires ≥44px tap targets.
4. `scroll-behavior: smooth` is gated on `html:has(:target)` to keep Tab-driven
   scrolling instant, but `:target` stays set after the first anchor click, so
   every subsequent Tab animates the scroll (~900ms). The comment in
   `globals.css` claims otherwise.
5. Form field bottom borders measure **1.46:1** against `--color-void`. That is
   the spec-mandated `--color-slate`, and it is below the 3:1 floor for
   identifying a UI component. Needs a spec decision, not a silent fix.
6. Disabled `<button>` has no disabled styling and keeps `cursor: pointer`.

Not verified by this review: the throttled "Slow 4G + 4× CPU" pass in §10 beyond
what Lighthouse mobile already applies, and any deployed staging URL.

## Decisions

- **The hero headline reveal is CSS keyframes, never JS, and never a full-height
  mask.** An animation library renders its initial state into the SSR HTML, so a
  JS reveal ships an above-the-fold element that is invisible to a human and to
  the LCP observer until hydration. A CSS `@keyframes` with
  `animation-fill-mode: both` from `translateY(100%)` inside `overflow: hidden`
  reproduces the same failure. The resting state is the static state and the
  travel is 30%, so every line is legible in frame one. This cost three separate
  rebuilds; do not "simplify" it.
- **The frame loader waits for first paint.** 180 WebP requests firing while the
  document was still painting cost ~2.9s of LCP render delay. The gate is
  one-shot and module-wide: once the page is idle, later sequences load the
  moment their own observer fires.
- **The pin is CSS `position: sticky`, not a ScrollTrigger pin.** ScrollTrigger
  only drives the two scroll-linked opacity fades. Reduced motion then only has
  to collapse a height and a `position`.
- **Exactly one sequence owns the readout at a time.** Two work cases are on
  screen wherever their sections meet; without arbitration both wrote to the
  store on their own animation frames and the readout interleaved at a static
  scroll position. `lib/sequences.ts` picks the in-viewport candidate nearest the
  viewport centre, with a 24px hysteresis margin so the readout does not flicker
  at the crossover.
- **The contact form is progressive enhancement, not a JS-only form.** Formspree
  was chosen over Resend specifically so the `<form action method="POST">`
  fallback works with JS disabled. No API route, no server.
- **Process step numbers render `text-bone/70`, not `--color-slate` as §6.4
  says.** Slate on void measures 1.46:1 and would be invisible. This deviation is
  deliberate and should stay.
- **GSAP is `import()`ed inside an effect** so it lands in an async chunk and
  stays out of First Load JS. Nothing above the fold depends on it.
- **`--color-signal` (#3B4CFF) is 4.1:1 on void and is never a text colour.**
  Borders, focus rings, `::selection` background and large display type only.
- **Amber is reserved for the timecode, frame counters and the one case-eyebrow
  line §6.3 calls for.** Nothing else on the site gets amber.
- **Content is typed TS in `content/`.** No CMS, no database, no auth, and no
  `localStorage`/`sessionStorage` anywhere.
