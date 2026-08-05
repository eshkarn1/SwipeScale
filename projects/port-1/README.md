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

The frame-rendering and verification scripts are Python and are **not** part of
the app build. They run under `~/.claude/skills/seo/.venv/bin/python`, which is
the only interpreter on this machine with NumPy and Pillow.

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
pnpm install --frozen-lockfile
pnpm build                       # verified clean; emits 10 static pages, 7 routes
pnpm typecheck                   # verified clean (tsc --noEmit)
pnpm start -p 3210               # verified; serves the production build
pnpm dev                         # not re-verified in the last review
```

Frame assets (Python, not part of `pnpm build`):

```bash
~/.claude/skills/seo/.venv/bin/python scripts/render-frames.py   # verified
~/.claude/skills/seo/.venv/bin/python scripts/verify-frames.py   # verified; exits 0
```

**Never run `build` and `typecheck` concurrently.** They race on `.next/types`
and emit phantom duplicate-identifier errors. Run them in sequence.

**If `typecheck` reports duplicate identifiers in files named `… 2.ts`, that is
iCloud, not TypeScript.** The Desktop sync daemon forks regenerated files under a
conflict name and they land inside `.next/types`. `rm -rf .next && pnpm build`
clears it. There were 33 such forks at the last review.

**Killing the server:** `lsof -ti:3210 | xargs kill -9`. `pkill -f "next start"`
does not reliably release the port here, and the replacement then dies with
`EADDRINUSE` while you keep measuring the previous build.

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
│   ├── layout.tsx            fonts (next/font/google), metadata, metadataBase,
│   │                         mounts <SmoothAnchors />
│   ├── page.tsx              the single page: section order + Timecode + ScrollDirector
│   ├── globals.css           @theme tokens, base layer, component primitives,
│   │                         hero reveal keyframes, timecode lane,
│   │                         .positioning-statement, reduced-motion block
│   ├── privacy/page.tsx      /privacy
│   ├── terms/page.tsx        /terms
│   ├── sitemap.ts            /sitemap.xml
│   ├── robots.ts             /robots.txt
│   └── icon.svg, favicon.ico
├── components/
│   ├── motion/
│   │   ├── FrameSequence.tsx canvas frame renderer; poster <img> + <canvas> + <noscript>
│   │   ├── useFrameLoader.ts concurrency-6 image loader, releases bitmaps on unmount
│   │   ├── useCoverFit.ts    object-fit: cover maths, allocation-free
│   │   ├── ScrollDirector.tsx the page's only GSAP consumer
│   │   ├── SmoothAnchors.tsx adds html.smooth-anchor for click-driven scrolls only
│   │   └── types.ts
│   ├── sections/             Hero, Positioning, Work, WorkCase, Process,
│   │                         Pricing, Faq, Contact, Footer
│   └── ui/                   Timecode, Eyebrow, Button
├── content/                  work.ts, pricing.ts, faq.ts — typed TS, no CMS
├── lib/sequences.ts          sequence manifest registry (incl. safeArea) +
│                             frame-state pub/sub + dominance arbitration
├── public/seq/               frame sequences, tracked in git (see Assets)
│   └── README.md             the asset contract — read before re-rendering
├── scripts/
│   ├── render-frames.py      renders all 904 shipped frames + 4 posters
│   ├── verify-frames.py      proves the safe-area contract; exits non-zero on failure
│   ├── gen-placeholder-frames.py   superseded; kept for the §9 protocol
│   └── gen-og-image.py
└── qa/                       screenshots/ (133 PNGs), lighthouse/ (3 report sets)
```

Every section is a server component. The only client islands are `Timecode`,
`FrameSequence`, `ScrollDirector` and `SmoothAnchors`, so the full document is in
the SSR HTML.

## Assets

Frame files: `public/seq/<id>/<width>/frame_NNNN.webp` (1-based, 4 digits).
Poster: `public/seq/<id>/poster.webp`. Widening `widths` in `lib/sequences.ts`
must require no change anywhere else.

**Frames are real, rendered, and tracked in git.** The §9 placeholders are gone.
`scripts/render-frames.py` is deterministic, so they are reproducible from the
tracked script, but there is no build step that regenerates them at deploy time
— the site cannot render without the committed files. 904 WebP + 4 posters,
4.7 MB total.

| id | mode | frames | renditions | source px | aspect | on disk | poster |
|---|---|---|---|---|---|---|---|
| `hero` | scrub | 180 | 375 / 768 / 1440 | 1440×810 max | 16:9 | 158 KB / 367 KB / 938 KB | 5.2 KB, 1440×810 |
| `case-01` | loop | 60 | 375 / 960 | 960×600 max | 16:10 | 77 KB / 248 KB | 4.2 KB, 960×600 |
| `case-02` | loop | 60 | 375 / 960 | 960×600 max | 16:10 | 80 KB / 256 KB | 4.3 KB, 960×600 |
| `case-03` | loop | 60 | 375 / 960 | 960×600 max | 16:10 | 74 KB / 242 KB | 4.1 KB, 960×600 |

`public/og.jpg` — 1200×630 JPEG, 44 KB.

Encoding is WebP `quality=72, method=4` for frames and `quality=82` for posters.
Low-amplitude grain is added before encode because dark smooth gradients band
under WebP quantisation; measured block-boundary energy on the rendered page is
0.97–1.08× the off-grid energy, i.e. no detectable blocking.

### Hard constraints

- **No `<video>`, HLS, GIF or Lottie anywhere** (spec C1/C2). Verified by grep
  over `app/ components/ lib/ content/` — zero matches. Canvas image sequences
  only; `public/seq/` *is* the video layer.
- **Safe area.** Each sequence declares `safeArea` in `lib/sequences.ts`: the
  fraction of the frame DOM copy sits over, which must stay quiet enough that
  bone `#EDEAE3` clears 4.5:1. `hero` = x 0→0.60, y 0.22→0.96; `case-*` = full
  width, y 0.62→1.0. `scripts/verify-frames.py` measures **every frame at every
  rendition** and exits non-zero on a failure. Last run: PASS, worst case
  **13.42:1** (`case-02/375` frame 2) against a 4.5:1 floor.
- **Perfect loops.** `case-*` run in `mode="loop"`. Every time-dependent term in
  the renderer is an integer harmonic of one base frequency, and `t = (i-1)/n`,
  so frame *n+1* wraps to frame 1. Verified on `case-01/960`: the 60→1 step is
  1.56 mean abs delta against a 1.70 mean and a 1.97 max over all 60 steps —
  z = −1.05, i.e. the wrap is quieter than a typical step, not a seam.
- **`aria-label` per sequence.** The `<canvas>` carries `role="img"` and the
  manifest `alt`. **These labels are currently wrong** — see Status.
- **Do not glob `frame_*.webp`.** This repo is on an iCloud-synced Desktop; the
  sync daemon restores re-rendered frames under conflict names
  (`frame_0090 2.webp`). `render-frames.py` prunes them *after* writing (`rm -rf`
  first does not work — the restore lands after) and `verify-frames.py` matches
  with a strict regex and fails on any non-conforming filename. `.gitignore`
  ignores single-digit forks as a third guard.

## Status

Reviewed 2026-08-05 against a clean production build served from `pnpm start`,
driven in headless Chromium at 375×812 / 768×1024 / 1440×900.

**Verified working:**

- `pnpm build` and `pnpm typecheck` both clean from a wiped `.next`.
- Lighthouse desktop **100 / 100 / 100 / 100**; FCP 0.2s, LCP 0.5s, TBT 0ms,
  CLS 0, Speed Index 0.3s. Lighthouse mobile (throttled) **99 / 100 / 100 /
  100**; FCP 0.8s, LCP 2.2s, TBT 0ms, CLS 0, 679 KiB total.
- LCP element is the visible `<span>expensive.</span>`. `PerformanceObserver`
  puts it at 36 / 48 / 52 ms at 375 / 768 / 1440 — painted in frame one. The CSS
  keyframe animates `translateY(30%) → 0` only, never opacity or a full-height
  mask.
- All 47 spec §7 copy strings present verbatim in the rendered HTML, 0
  mismatches — including the positioning statement, all six FAQ answers, both
  pricing cards and the subcontract note.
- Contrast: **0 failures** over 180 rendered text nodes at 375 and at 1440,
  measured after scrolling every reveal into its final state, compositing each
  `color` against the nearest opaque ancestor background.
- Keyboard: 21 tab stops, every control reachable in document order, every one
  ringed `2px solid rgb(59,76,255)` at `3px` offset. No focus trap. Every target
  ≥44×44 except the inline "Email me." link (74×20), which WCAG exempts as an
  inline link inside a sentence.
- No horizontal overflow at 375 / 768 / 1440 (`scrollWidth === innerWidth`).
- Zero console errors or warnings at any breakpoint.
- Timecode readout no longer overprints copy. It is an opaque full-width status
  bar in a reserved lane (`--timecode-lane`, 2.5rem, matched by `body`
  padding-bottom). `elementsFromPoint` under the bar at the document end returns
  nothing at 375 or 1440.
- Tab-driven scrolling is instant. `html` is `scroll-behavior: auto`;
  `SmoothAnchors` adds `.smooth-anchor` for 1200 ms after a click on an in-page
  anchor and nothing else ever sets it. Measured: after clicking `#contact`,
  `scrollY` does not move on Tab at the 40 ms sample.
- `prefers-reduced-motion: reduce`: the 300svh track collapses to one viewport,
  the pin becomes `position: static`, the canvas draws nothing and the poster
  stands in, and two screenshots 1.5 s apart at the same offset are
  byte-identical.
- JS disabled: every section's text renders, `<details>` FAQ opens natively, the
  contact form falls back to a native Formspree POST, the poster renders from
  `<noscript>`, the readout reads `STANDBY`, no overflow.
- Footer tap targets are 44×44. Disabled buttons carry `cursor: not-allowed`,
  reduced opacity and a slate border.

**Known broken — this build is rejected on the first three:**

1. **The `SCROLL` cue never fades out.** Spec §6.1 requires it gone by pin
   progress 0.05. Measured computed opacity is `1` at every progress from 0.00
   to 1.00 at all three breakpoints. Cause: `.hero-fade-in` in `globals.css` is
   a CSS `animation … both`, and an animation-origin declaration outranks the
   inline `opacity` GSAP writes, so `ScrollDirector.tsx:67` has no effect. At
   progress 0.95 the headline is at opacity 0 and the word `SCROLL` is the only
   thing on an otherwise empty screen. Fix in the CSS, not in GSAP — the
   headline fade works precisely because GSAP animates a wrapper that has no
   `hero-fade-in`.
2. **The poster is not frame 1.** `render-frames.py` renders posters from frame
   90 (hero) and 20 (cases); `lib/sequences.ts` declares `posterFrame: 1` for
   all four. The hero poster differs from `hero/1440/frame_0001.webp` by mean
   10.84/255 with 33.7% of pixels differing by >8, against a normal
   frame-to-frame step of 0.53 — so the canvas cuts to a different composition
   when it takes over from the SSR poster, and under reduced motion the readout
   prints `FRAME 001 / 180` over a still of frame 90. Render posters from
   `posterFrame`, and set `posterFrame` to 1 for the scrub hero so the handover
   is seamless.
3. **Every `aria-label` describes content that does not exist.** The manifest
   promises "cold-water catalogue photography", "specimen letterforms sliding
   across a foundry specimen page" and "an architectural elevation drifting
   across the frame"; all three case sequences render the same abstract light
   field, differing only in brightness (`INTENSITY` 0.92 / 1.00 / 0.86 over
   identical ribbons and mask). The hero label describes words that live in the
   DOM `<h1>`, not in the frames. `role="img"` + `aria-label` is the spec §8
   text alternative, so this is what a screen-reader user is told the artwork is.
4. **The fixed bar occludes focused controls at 375.** `html` has
   `scroll-padding-bottom: auto`, so focus scroll-into-view ignores the 40 px
   bar. Tabbing to Privacy or Terms at 375×812 leaves 24 px of the 44 px target
   — and the whole lower edge of the focus ring — under the opaque bar; the
   message textarea overlaps by 40 px. Not reproducible at 1440. One line:
   `scroll-padding-bottom: var(--timecode-lane)` on `html`.
5. **Form field bottom borders measure 1.46:1** against `--color-void`. That is
   the spec-mandated `--color-slate` and it is below the 3:1 WCAG 1.4.11 floor
   for identifying a UI component. Deliberately open and escalated — it needs a
   spec decision, not a silent token change. The same 1.46:1 applies to every
   card and rule on the page, which is why the slate-bordered pricing card reads
   as borderless beside the signal-bordered one.
6. `scripts/__pycache__/render-frames.cpython-312.pyc` is tracked in git.

**Not verified by this review:** the §10 "Slow 4G + 4× CPU" pass beyond what
Lighthouse mobile applies, any deployed staging URL, and the Formspree endpoint
against a live inbox.

**Latent, measured as harmless today:** `pickWidth()` selects on CSS *width*, but
the canvas draws `object-fit: cover`, which on a portrait viewport needs
`height × aspect` of source. At 375×812 the hero is drawn from the 375-wide
rendition into a 1444 px-wide rect — a 3.85× upscale. Against a 1440-rendition
reference this measures PSNR 48.7 dB / mean abs 0.48 of 255, i.e. invisible,
because the content is an almost featureless gradient. It will stop being
invisible the moment a sequence carries detail. If it is ever fixed, the target
is `max(cssWidth, cssHeight × aspect) × dpr`.

## Decisions

- **The hero headline reveal is CSS keyframes, never JS, and never a full-height
  mask.** An animation library renders its initial state into the SSR HTML, so a
  JS reveal ships an above-the-fold element that is invisible to a human and to
  the LCP observer until hydration. A CSS `@keyframes` with
  `animation-fill-mode: both` from `translateY(100%)` inside `overflow: hidden`
  reproduces the same failure. The resting state is the static state and the
  travel is 30%, so every line is legible in frame one. This cost three separate
  rebuilds; do not "simplify" it.
- **The frames are rendered, not generated.** A generative video model cannot be
  held to the safe-area contract — asked for a dark field with a quiet left
  third, one returned a grey field with a bright element crossing the left. That
  is a model ceiling, not a prompt problem. Rendering means every pixel is known
  and `verify-frames.py` can prove the contract over all 904 frames.
- **The three case loops share one material.** Only `INTENSITY` differs. Giving
  each its own seed, density and colour bias previously produced three unrelated
  designs. This is the right call for the *visuals*; it is the reason finding 3
  above is a labelling defect rather than an art-direction one.
- **The positioning statement deviates from spec §6.2, deliberately.** §6.2 asks
  for `--text-h1` on an 18ch measure, which the §7 copy turns into 88 px type
  with 80.96 px leading — leading tighter than the font size — filling 729 px,
  81% of a 900 px viewport, at 1440. Shipped instead: `--text-h2` (51.84 px at
  1440), `line-height: 1.15`, 26ch. Result is 6 lines / 358 px at 1440 and 768,
  11 lines / 380 px at 375. The copy is the fixed input, so the type scale gave
  way. `.positioning-statement` also relaxes letter-spacing from §4's −0.035em
  to −0.02em, for the same reason.
- **Smooth scrolling is opt-in per click, not a global `scroll-behavior`.**
  There is no CSS selector for "this scroll was caused by a click"; `:has(:target)`
  is not one, because `:target` stays matched after the first anchor navigation
  and every later Tab press then glides for ~900 ms. `SmoothAnchors` adds a class
  for the duration of the click-driven scroll instead. With JS off, anchors jump,
  which is correct rather than degraded.
- **The frame loader waits for first paint.** 180 WebP requests firing while the
  document was still painting cost ~2.9 s of LCP render delay. The gate is
  one-shot and module-wide: once the page is idle, later sequences load the
  moment their own observer fires.
- **The pin is CSS `position: sticky`, not a ScrollTrigger pin.** ScrollTrigger
  only drives the two scroll-linked opacity fades. Reduced motion then only has
  to collapse a height and a `position`.
- **The timecode is a reserved lane, not a scrim.** A to-transparent gradient over
  a 40 px bar is only ~50% opaque where the text sits, which is not enough over
  body copy; and nudging the offset moves the collision rather than removing it,
  at every breakpoint. An opaque bar plus `body { padding-bottom }` takes the
  readout out of the text column entirely, and a bottom status bar with a
  hairline top rule is exactly the furniture §4's colour-grading-suite reference
  implies.
- **Exactly one sequence owns the readout at a time.** Two work cases are on
  screen wherever their sections meet; without arbitration both wrote to the
  store on their own animation frames and the readout interleaved at a static
  scroll position. `lib/sequences.ts` picks the in-viewport candidate nearest the
  viewport centre, with a 24 px hysteresis margin so it does not flicker at the
  crossover.
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
