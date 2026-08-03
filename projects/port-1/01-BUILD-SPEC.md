# SCRIPT 1 — BUILD SPEC
## Swipe & Scale — marketing site v1

**Agent role:** Frontend build agent
**Depends on:** nothing (start here)
**Blocks:** Script 2 (motion), Script 3 (assets)
**Definition of done:** deployed URL, Lighthouse ≥ 90 on all four axes, all sections below present with the exact copy in §7.

> **Rule for this whole document:** if something is not specified here, it is specified in Script 2 or 3. Do not invent, do not ask, do not substitute. If a required asset does not exist yet, use the placeholder protocol in §9.

---

## 1. Non-negotiable constraints

| # | Constraint | Reason |
|---|---|---|
| C1 | **No `<video>` element anywhere in the shipped site.** No `<video>`, no HLS, no GIF, no Lottie, no autoplaying media element. | Client requirement |
| C2 | All motion is either (a) CSS/GSAP transform on DOM, or (b) an image-sequence rendered to `<canvas>`. Nothing else. | Client requirement |
| C3 | No Three.js, no WebGL, no R3F in v1. | Weight budget |
| C4 | Single page. No routes other than `/`, `/privacy`, `/terms`. | Ship speed |
| C5 | No CMS, no database, no auth. Content is in typed TS files. | Ship speed |
| C6 | Total JS shipped to the client ≤ 180 KB gzipped, excluding image frames. | Performance |
| C7 | Site must be fully readable and navigable with JS disabled and with `prefers-reduced-motion: reduce`. | Quality floor |

---

## 2. Stack — exact versions

```
Next.js 15.x            App Router, TypeScript, static export where possible
React 19.x
Tailwind CSS 4.x        CSS-first config via @theme
GSAP 3.13.x             core + ScrollTrigger only. No other plugins.
Deploy: Vercel
Package manager: pnpm
Node: 20 LTS
```

Do **not** add: framer-motion, lenis, locomotive-scroll, three, react-three-fiber, swiper, any UI kit, any animation library beyond GSAP. Smooth scroll is **native** (`scroll-behavior: smooth` on anchors only). No scroll hijacking.

---

## 3. Repo structure — create exactly this

```
swipe-and-scale/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── privacy/page.tsx
│   └── terms/page.tsx
├── components/
│   ├── motion/
│   │   ├── FrameSequence.tsx        ← Script 2 owns this file
│   │   ├── useFrameLoader.ts        ← Script 2
│   │   ├── useCoverFit.ts           ← Script 2
│   │   └── types.ts                 ← Script 2
│   ├── sections/
│   │   ├── Hero.tsx
│   │   ├── Positioning.tsx
│   │   ├── Work.tsx
│   │   ├── WorkCase.tsx
│   │   ├── Process.tsx
│   │   ├── Pricing.tsx
│   │   ├── Faq.tsx
│   │   ├── Contact.tsx
│   │   └── Footer.tsx
│   └── ui/
│       ├── Timecode.tsx
│       ├── Eyebrow.tsx
│       └── Button.tsx
├── content/
│   ├── work.ts
│   ├── pricing.ts
│   └── faq.ts
├── lib/
│   └── sequences.ts                 ← sequence manifest registry
├── public/
│   ├── seq/                         ← Script 3 owns this directory
│   └── og.jpg
└── package.json
```

---

## 4. Design tokens — use these values, do not adjust

Direction: **a colour-grading suite**. Cold near-black, bone paper, ultramarine as the single signal colour, amber reserved *exclusively* for timecode and frame counters. Nothing else gets amber.

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* colour */
  --color-void:      #08090C;
  --color-graphite:  #16181D;
  --color-slate:     #2A2E37;
  --color-bone:      #EDEAE3;
  --color-signal:    #3B4CFF;
  --color-amber:     #FFB43D;

  /* type */
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-body:    "Instrument Sans", system-ui, sans-serif;
  --font-mono:    "Martian Mono", ui-monospace, monospace;

  /* scale — clamp-based, no breakpoint jumps */
  --text-mega:  clamp(3.25rem, 11vw, 11rem);
  --text-h1:    clamp(2.5rem, 6.5vw, 5.5rem);
  --text-h2:    clamp(1.875rem, 3.6vw, 3.25rem);
  --text-h3:    clamp(1.25rem, 1.9vw, 1.75rem);
  --text-body:  clamp(1rem, 1.15vw, 1.125rem);
  --text-micro: 0.6875rem;

  /* rhythm */
  --gutter: clamp(1.25rem, 4vw, 5rem);
  --stack-lg: clamp(6rem, 14vh, 11rem);
  --stack-md: clamp(3rem, 7vh, 5rem);

  /* motion */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

**Fonts:** load via `next/font/google` — `Bricolage_Grotesque`, `Instrument_Sans`, `Martian_Mono`. Subset `latin`, `display: "swap"`. Weights: Bricolage 400/700/800 (variable), Instrument Sans 400/500, Martian Mono 400 only.

**Type rules:**
- Display face only at `--text-h2` and above. Never for body, never for buttons.
- Display headings: `letter-spacing: -0.035em`, `line-height: 0.92`.
- Body: `line-height: 1.55`, `max-width: 62ch`.
- Mono face used *only* for: frame counters, section numbers, prices, timecodes, form labels. `letter-spacing: 0.06em`, uppercase, at `--text-micro`.

**Borders & radius:** `1px solid var(--color-slate)`. Radius is `0` everywhere except buttons, which are `2px`. No shadows. No gradients except the single hero vignette in §6.1.

---

## 5. The signature element — read this before building

The site is built from frame sequences. So **expose that**. A fixed-position mono readout in the bottom-left corner shows the live frame state of whichever sequence is currently in view:

```
FRAME 043 / 180   ·   HERO
```

It updates on scroll, in amber, `--text-micro`, mono. On mobile it stays but drops the sequence name.

This is the one memorable thing on the page. Everything else stays quiet and disciplined. Do not add a second flourish, do not add particles, cursors, magnetic buttons, marquees, or noise overlays. **Restraint is the brief.**

Implementation: a `<Timecode />` component subscribing to a tiny module-level store that `FrameSequence` (Script 2) writes to. No context provider, no state library — a plain pub/sub object in `lib/sequences.ts`.

---

## 6. Section-by-section build order

Build in this order. Each section ships complete before the next starts.

### 6.1 `<Hero />` — pinned scrub sequence

- Full viewport. `position: sticky` pin via ScrollTrigger over a **300vh** scroll track.
- `<FrameSequence mode="scrub" id="hero" />` fills the viewport, `object-fit: cover` behaviour (Script 2 handles the maths).
- Overlay: radial vignette, `background: radial-gradient(circle at 50% 45%, transparent 30%, var(--color-void) 92%)`, `pointer-events: none`. This is the only gradient in the build.
- Headline sits over the sequence, bottom-left aligned to `--gutter`, `--text-mega`, display face, `--color-bone`.
- Headline animates in on load: each line `y: 100%` → `0` with `overflow: hidden` wrapper, stagger `0.08`, duration `1.1`, `--ease-out`. Fires after first frame paints, not before.
- Headline fades to `opacity: 0` between scroll progress `0.75` and `0.9` of the pin.
- Scroll cue: mono text `SCROLL` bottom-centre, fades out at progress `0.05`.

### 6.2 `<Positioning />` — the thesis

- Single centred statement, `--text-h1`, display face, max `18ch`.
- Split into words; each word reveals on scroll with `opacity 0 → 1`, `y: 24px → 0`, stagger `0.04`, ScrollTrigger `start: "top 70%"`, no scrub.
- Background `--color-void`. Generous `--stack-lg` padding.

### 6.3 `<Work />` + `<WorkCase />` — three cases

Data comes from `content/work.ts`. Three entries. Each `<WorkCase>` is:

```
┌──────────────────────────────────────────────┐
│  [ambient loop sequence, 16:10, full width ] │
├──────────────────────────────────────────────┤
│  CASE 01 / CONCEPT          [mono, amber]    │
│  Brand name                 [display, h2]    │
│  One-sentence premise       [body, 48ch]     │
│  ─────────────────────────────────────────── │
│  ROLE      Motion, art direction, build      │
│  STACK     GSAP, canvas frame sequence       │
│  STATUS    Unsolicited concept               │
└──────────────────────────────────────────────┘
```

- The loop uses `<FrameSequence mode="loop" />`, paused when out of viewport (Script 2 handles).
- `STATUS: Unsolicited concept` must appear on all three. Do not imply these were paid client work.
- Cases alternate: 01 and 03 image-left metadata-right on desktop; 02 reversed. On mobile all stack.
- Metadata rows are mono, `--text-micro`, `1px` top border, `0.75rem` vertical padding.

### 6.4 `<Process />` — four steps

Numbered `01–04` **because it is a real sequence** — the order carries information. Four rows, mono numbers in `--color-slate`, display-face step titles, body-face descriptions. Reveal with a `0.06` stagger on scroll.

### 6.5 `<Pricing />` — two cards, prices visible

- Two columns desktop, stacked mobile. Card 2 gets a `--color-signal` 1px border; card 1 gets `--color-slate`.
- Price in mono, `--text-h2`, `--color-bone`.
- Each card: name, price, timeline, 5 deliverable bullets, one CTA button.
- Bullets use a mono `+` prefix, not a bullet glyph or a check icon.
- Below both cards, one line of body copy: the subcontract note (§7).

### 6.6 `<Faq />` — six items

Native `<details>/<summary>`. No JS accordion. Summary in display face `--text-h3`, marker replaced with a mono `+` / `−`. Border-top `1px --color-slate` on each.

### 6.7 `<Contact />`

- Headline, one line of body, and a form: Name, Email, Company, Budget (select: the two package prices + "Not sure yet"), Message.
- POST to Formspree or Resend — agent picks one, uses an env var `NEXT_PUBLIC_FORM_ENDPOINT`.
- Inputs: transparent background, `1px` bottom border only, mono labels above, `--color-bone` text. Focus state: bottom border becomes `--color-signal`, plus a visible `2px` outline offset for keyboard users.
- Success state replaces the form in place with a mono confirmation. Error state names what failed and how to fix it. No apology copy.

### 6.8 `<Footer />`

Email address, two social links, `© 2026 Swipe & Scale`, privacy/terms links. Mono, `--text-micro`. Nothing else.

---

## 7. Final copy — use verbatim

**Hero headline** (three lines, hard-broken):
```
Websites
that feel
expensive.
```

**Hero sub** (mono, below headline, `--text-micro`):
`MOTION-LED WEB DESIGN · BUILT IN 2–6 WEEKS · FIXED PRICE`

**Positioning:**
> AI can build you a website in an afternoon. It cannot make anyone feel anything. That last ten percent — the weight, the timing, the restraint — is the entire difference between a site that works and a site that sells.

**Process steps:**

| # | Title | Body |
|---|---|---|
| 01 | Scope in one call | Forty-five minutes. You show me the brand, I tell you which package fits and what it will cost. No proposal document, no second call. |
| 02 | Direction, not mood boards | You get one art direction with real type, real colour, and one animated moment built for real. You approve the thing itself, not a picture of it. |
| 03 | Build in the open | A staging URL from day two. You watch it come together and give notes as it happens, so nothing lands as a surprise at the end. |
| 04 | Ship and hand over | Deployed, documented, and yours. Two weeks of fixes included. Editable by you or your developer without calling me. |

**Pricing card 1:**
- Name: `Signature Page`
- Price: `$5,400`
- Timeline: `2 weeks · one revision round`
- Bullets:
  - One long-form landing page, fully responsive
  - One scroll-driven motion sequence, custom built
  - Art direction, type system, and colour
  - Copy refinement on your existing text
  - Deployed and handed over, source included

**Pricing card 2:**
- Name: `Full Site`
- Price: `$18,000`
- Timeline: `4–6 weeks · two revision rounds`
- Bullets:
  - Up to eight pages, fully responsive
  - Three motion sequences and a full interaction system
  - Complete brand-to-web design system
  - CMS setup so your team can edit without me
  - Deployed, documented, thirty days of support

**Below pricing:**
> Agencies: I take on the motion layer as a subcontractor on your builds. Same pricing, your name on the work. [Email me.](mailto:)

**FAQ — six items, verbatim:**

1. **Why is there a price on this page?** Because it saves us both a week. If the number works, we talk. If it doesn't, you haven't lost an afternoon to a discovery call.
2. **What if I only have a logo?** That's a normal starting point. Art direction is included in both packages — I build the type, colour, and motion language from whatever you've got.
3. **Do you write the copy?** I refine what you have and rewrite anything that's fighting the design. If you're starting from a blank page, that's a separate scope and I'll say so upfront.
4. **Can my developer maintain it?** Yes. It's a standard Next.js codebase with no proprietary tooling. You get the repo.
5. **Will the animation slow my site down?** No. Every sequence is budgeted before it's built, and the site is tested on a throttled mid-range Android before it ships. Speed is part of the deliverable, not a trade-off against it.
6. **What happens if I need changes later?** Two weeks of fixes are included. After that, ongoing work runs monthly and you can stop any time.

**Contact headline:** `Tell me what you're building.`
**Contact body:** `A few sentences is enough. If it's a fit, I'll reply within two business days with a price and a start date. If it isn't, I'll tell you that instead.`

---

## 8. Responsive & accessibility floor

- Breakpoints: `640 / 1024 / 1440`. Design mobile-first.
- Tap targets ≥ 44px.
- Every interactive element has a visible focus ring: `outline: 2px solid var(--color-signal); outline-offset: 3px`. Do not remove it.
- Colour contrast: bone on void = 15.8:1 ✓. **Signal blue on void is 4.1:1 — never use `--color-signal` for body text.** Borders, focus rings, and large display type only.
- Amber on void = 10.2:1 ✓.
- All sequences get a text alternative: the `<canvas>` carries `role="img"` and an `aria-label` from the sequence manifest.
- `@media (prefers-reduced-motion: reduce)`: all GSAP timelines resolve instantly to their end state; all sequences render a single poster frame; the pin becomes a normal static section.

---

## 9. Placeholder protocol

If Script 3 has not delivered frames yet, **do not block**. Generate a placeholder sequence:

```bash
mkdir -p public/seq/hero/1920
for i in $(seq -f "%04g" 1 180); do
  magick -size 1920x1080 xc:"#16181D" \
    -fill "#3B4CFF" -pointsize 96 -gravity center \
    -annotate 0 "HERO $i/180" public/seq/hero/$1920/frame_$i.webp
done
```

Build against placeholders, swap real frames in later. The manifest contract in Script 2 makes this a drop-in replacement.

---

## 10. Acceptance checklist

- [ ] `grep -r "<video" app/ components/` returns nothing
- [ ] `grep -r "localStorage\|sessionStorage" app/ components/` returns nothing
- [ ] All copy in §7 present verbatim
- [ ] Timecode readout live and accurate on all sequences
- [ ] Keyboard-only pass: every control reachable, focus always visible
- [ ] `prefers-reduced-motion` pass: no motion, no pin, page fully readable
- [ ] JS-disabled pass: all text content readable
- [ ] Lighthouse mobile ≥ 90 performance / 100 accessibility / 100 best practices / 100 SEO
- [ ] Tested on throttled "Slow 4G" + 4× CPU slowdown
