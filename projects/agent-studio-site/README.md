# AI Agent Studio — website

Marketing and commerce site. Next.js App Router, React Three Fiber, GSAP +
Lenis scroll choreography, Sanity CMS, Stripe checkout.

---

## Running it

**Node 24 is required.** This machine's shell default is Node v16.20.2, which
is far too old — Vite/Next tooling here needs ≥20.19. If `npm run dev` fails
with a syntax error in a dependency, this is why.

```bash
nvm use                 # reads .nvmrc → v24.16.0
npm install
npm run dev             # http://localhost:3000
```

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs typecheck) |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

TypeScript is pinned to **6.0.3**. TypeScript 7 is npm `latest` but Next 16
rejects its compiler API — do not upgrade without checking that first.

---

## Environment

Copy `.env.example` to `.env.local`. **Every variable is optional** — the site
builds and runs with none of them set, and degrades honestly rather than
breaking:

| Missing | Behaviour |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Serves the local catalogue in `src/content/agents.ts`, logs a warning |
| `RESEND_API_KEY` / `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` | `/api/contact` returns 503 with a message pointing at email. It never fakes success |
| `STRIPE_SECRET_KEY` | Buy buttons render as "Book a call" instead |

---

## How to add an agent

Agents drive the catalogue, the detail pages, and checkout.

**With Sanity configured:** create an `agent` document in the Studio. No deploy
needed — pages revalidate hourly. To sell it by card, set
`pricing.stripePriceId` to a Stripe Price ID; leave it empty and the buy button
falls back to "Book a call".

**Without Sanity:** add an entry to the `AGENTS` array in
`src/content/agents.ts`. The TypeScript interface is the same shape as the CMS
schema in `sanity/schema.ts` — keep the two in sync when either changes.

Required fields are `slug`, `name`, `category`, `tagline`, `description`,
`useCases`, `setupTime`, `pricing`. `variantKey` selects the 3D form.

> The catalogue currently in `src/content/agents.ts` is **placeholder product
> data**, marked as such at the top of the file. It is structurally complete so
> the templates work; replace it with the real catalogue.

## How to edit pricing

Three places, and they must agree:

1. `src/app/pricing/page.tsx` — the tier table copy
2. `pricing` on each agent — what shows on catalogue and detail pages
3. Stripe — the actual Price objects that get charged

Changing a number in 1 or 2 does **not** change what a customer pays. Only
Stripe does that.

## How to publish a post

Not wired yet. `src/app/resources/page.tsx` renders a designed empty state with
planned topics. When the first post is written, add a `post` type to
`sanity/schema.ts` and a `getPosts()` to `src/lib/sanity.ts` following the
`getAgents()` pattern; the grid is already shaped for it.

---

## Architecture, and why

### One RAF loop — `SmoothScrollProvider`

The most important file in the project. Lenis, ScrollTrigger and R3F each want
their own animation frame; three independent loops reading and writing scroll
state produce a permanent one-frame lag between DOM and canvas that reads as
"the 3D feels detached" and is miserable to diagnose later.

So: Lenis runs `autoRaf: false`, GSAP's ticker is the only clock and drives it,
Lenis pushes `ScrollTrigger.update`, `lagSmoothing(0)` stops a stall becoming a
camera jump, and the Canvas runs `frameloop="never"` advanced from that same
ticker.

**Nothing in this app may call `requestAnimationFrame` directly.** If you need a
frame, use `gsap.ticker`.

### Scroll → scene — `scene-state.ts` + `ScrollChoreography`

`sceneState` is a plain mutable module object, not React state. ScrollTrigger
writes to it up to 60×/second; through `setState` that would re-render the tree
on every frame of every scroll.

`ScrollChoreography` is the **only** writer. Components may read it anywhere.
Triggers bind to `[data-beat]` elements rather than pixel offsets, so
choreography stays anchored to content and survives copy changes.

### Device tiering — `device-tier.ts`

The single place fidelity is decided; `SceneCanvas` provides it via context.
**Scene components must not call `detectDeviceTier()` themselves** — independent
detection is how two components end up disagreeing about the device. Unknown
devices default to `medium`, not `high`.

### Why the 3D looks the way it does — `SceneEnvironment`

Materials are `metalness ~0.9`. A metal material renders *what it reflects*, so
without an environment map it resolves to near-black and looks flat no matter
how many lights you add. The Lightformer studio is not decoration; removing it
breaks the look.

It is built from geometry rather than drei's `preset`, which fetches an HDR from
a CDN — a render-blocking third-party request against the 2.5s LCP budget that
also fails offline.

---

## Accessibility contract

Non-negotiable, and checked before anything ships:

- **The 3D is never the only way to read anything.** The workflow graph on
  `/teams` is driven *by* its DOM roster, not the reverse — keyboard, screen
  reader, and WebGL-disabled all work, and the full edge list renders as markup.
- **Reduced motion is designed, not disabled.** Offering forms arrive
  pre-separated, the hero holds a composed still, scrubs become cuts.
- Text renders and is readable before any WebGL loads. Canvas never appears in
  SSR output.
- Focus is never suppressed and always drawn with an offset.
- Tap targets clear 44px (`min-h-11` on small-label controls).

---

## Deliberate omissions

These are missing on purpose. Do not fill them with placeholder content.

| Missing | Why | To fix |
|---|---|---|
| Proof strip, testimonials, client logos | No real ones exist. Fabricated social proof on a page whose job is credibility is self-defeating. `ObjectionsSection` occupies the slot honestly | Supply real metrics and 2–3 quotes |
| Real workflow in the team graph | The one shipped is illustrative and labelled as such | Supply one real deployed workflow with genuine hand-offs |
| Legal copy | `src/content/legal.ts` is **template content, not legal advice**, with `[SQUARE BRACKET]` placeholders for facts only you know | Lawyer review |
| Stripe webhook | Checkout works; fulfilment side is not built | Add `/api/webhooks/stripe` with signature verification |

---

## Known issues

- **9 npm audit advisories**, all transitive through Next and
  `eslint-config-next`. `npm audit fix --force` would downgrade Next 16 → 9.3.3.
  Do not run it. They clear when Next patches upstream.
- The hero and workflow scenes have been verified to compile and build but not
  visually reviewed in a browser by the authoring process. Check them on real
  hardware before launch.
