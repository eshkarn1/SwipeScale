# Engineering notes

Hard-won failures from real builds. **Read this before starting work.** Every
entry cost someone a debugging session or a rebuild; none is theoretical.

Subagents start cold — you have no memory of previous projects. This file is
that memory.

---

## The three that cost the most

### 1. Nothing was ever compiled

39 source files were written before anyone ran `npm install`. Nothing had been
type-checked. Four independent blockers were sitting undiscovered — a dead Node
version, a type mismatch between two libraries, a filesystem case collision, and
missing type packages. All four were findable in one install.

**Rule: dependencies installed and a green build before the fifth source file.**
Not at the end. `inspection` exists for this and must run first.

### 2. The UI was built without ever being looked at

Multiple rounds of "fixing" a 3D hero from source alone. Every real cause was
invisible in the code and obvious in a screenshot: an object was flooding green
because of an emissive setting, the composition collided with the headline, and
a duplicate brand string sat under the nav.

**Rule: any visual change is unverified until someone has rendered it and looked
at the pixels.** `browser-qa` does this. "It compiles" is not "it works", and
"it should look right" is not evidence.

### 3. Claims were made that were not true

A comment asserted a colour met WCAG 3:1. It measured 1.78:1. Every card border
and input on the site used it.

**Rule: never state a measured value you did not measure.** If you did not run
it, label it unverified. A documented number nobody recomputes is a number that
drifts — write a script instead.

---

## Verification discipline

Applies to every agent, without exception.

- **Report only what you ran.** Never "tests pass" without the output. Never a
  file size, contrast ratio, or frame rate you did not read off the artefact.
- **"Unverified" is a complete and acceptable answer.** A precise "I could not
  check this in my environment" is worth far more than a confident guess,
  because the lead will act on what you say.
- **A build that compiles is not a feature that works.** Compilation proves
  syntax and types. It proves nothing about behaviour, layout, or appearance.
- **Check the claim, not the intent.** If a report says an asset meets budget,
  measure the file. If it says a route works, request it.
- **Check your instrument before you believe the defect.** A saturated tool
  reports a clean, specific, entirely false result.

### The measurement traps that have produced false bug reports

- **`performance.getEntriesByType('resource')` silently caps at 250 entries.**
  On a page with a 360-frame image sequence this fabricates a missing-asset
  bug: two sequences appeared to load zero frames, and the readout showing a
  frame number for them looked like a second bug on top. Both runs returned
  exactly `250` total requests — *that* was the tell. Call
  `performance.setResourceTimingBufferSize(5000)` in an init script **before
  navigation**, and treat a round-number total as a saturated buffer until
  proven otherwise. Corrected numbers were 377 requests, 364 of them frames.
- **`elementsFromPoint` always returns something under a `position: fixed`
  element**, so a naive overlap probe reports a collision everywhere the fixed
  element sits. Test the elements you care about, not the point.
- **A headless WebGL frame rate is SwiftShader on the CPU.** Not a device
  number; do not report it as fps.
- **A downscaled screenshot is not evidence about colour.** A full-page shot of
  a long page arrives scaled ~3× down. In one, a toast on a dark page read as a
  white card with dark text, and a whole "sonner is ignoring the theme
  variables" diagnosis was written before checking. Sampling the pixels gave
  `rgb(28,34,44)` — the correct token — and `getComputedStyle` agreed. What had
  actually been visible was the toast's light *text* and its action button,
  smeared together by the downscale. **Before writing up any colour defect,
  sample the pixel or read the computed style.** Layout and composition survive
  downscaling; colour and thin strokes do not.
- **A contrast probe must composite alpha before it divides.** Tinted surfaces
  (`rgb(232 163 61 / 0.14)`) come back from `getComputedStyle` as rgba, and a
  naive luminance ratio of a colour against its own translucent tint returns
  `1.0` — reported as a catastrophic failure that does not exist. Walk the
  ancestor chain, composite every layer down to an opaque colour, then compute.
  Done properly, the same badge measured 7.27:1.
- **Playwright's `get_by_role` skips elements hidden from the accessibility
  tree**, and Radix marks the rest of the page `aria-hidden` while a Select,
  Dialog or Sheet is open. A role locator that resolved fine before the overlay
  opened will time out immediately after, which looks like the trigger being
  destroyed. Grab a CSS locator, or capture the handle before opening.

When a measurement implies a defect, reproduce it a second way before writing
it up. Two instruments agreeing is evidence; one instrument is a hypothesis.

### A background agent's output file is not a liveness signal

Cost: a corrupted working tree, twice nearly repeated.

A subagent's task output file is a **batched transcript**, not a live log. It
sat unchanged for ten minutes while the agent was actively creating files. Read
literally, "idle 600s" says dead; it meant nothing of the sort.

Acting on that reading, work was started inside the agent's project. It had
just written its own `package.json` pinning `typescript` to 6.0.3 — the correct
pin, per the Next.js section below. The concurrent `pnpm add` resolved
`typescript@latest` and left **`node_modules` on 7.0.2 against a package.json
pinning 6.0.3**. Every `typecheck` run in that window measured a toolchain
nobody had specified, so neither a pass nor a failure would have been evidence.

**The reliable check is the project, not the agent:**

```bash
find . -type f -not -path "*/node_modules/*" -not -path "*/.next/*" \
  -exec stat -f "%Sm %N" -t "%H:%M:%S" {} \; | sort -r | head
```

Recent mtimes on source files mean it is working. If you still believe it is
dead, message it and wait for the reply — do not start writing where it is
writing. And if you have already collided, say so explicitly and hand over the
exact repair steps rather than leaving a mismatch for someone else to measure
through.

---

## Environment (this machine)

- **The shell default `node` is v16.20.2 and is too old for everything.**
  Node 24 lives at `$HOME/.nvm/versions/node/v24.16.0/bin`. Shell state does
  **not** persist between Bash calls, so prepend it every single time:
  ```bash
  export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
  ```
  Confirm `node -v` before trusting any result.
- **Playwright + Chromium are installed** at
  `~/.claude/skills/seo/.venv/bin/python`. This is how you look at a page.
  Headless Chromium renders WebGL through **SwiftShader (CPU)** — frame-rate
  numbers from it are meaningless for real hardware. Say so rather than
  reporting them as fps.
- **Use the Node version in the project's `.nvmrc`, not merely one that
  satisfies `engines`.** A project pinning `24.16.0` was run on 20.20.2 —
  inside its own `engines` range — and `pnpm test` died with
  `TypeError: webidl.util.markAsUncloneable is not a function` from
  `undici/lib/web/cache/cachestorage.js`, by way of jsdom. Nothing was wrong
  with the tests; they pass 5/5 on 24.16.0. The stack trace names two
  dependencies and never mentions Node, so this reads as a broken test suite
  until you check `node -v` against `.nvmrc`. CI uses `node-version-file`, so
  CI is right and you are wrong.
- **Never run `build` while a `dev` server is live on the same `.next`.** Same
  root cause as the typecheck race, different symptom: the *running dev server*
  is what breaks. After a concurrent `pnpm build`, the page at localhost still
  returned 200 but had lost a component — a Playwright locator that had matched
  minutes earlier timed out, which looks exactly like a component you just
  broke. `lsof -ti:3000 | xargs kill -9`, `rm -rf .next`, then run the two one
  at a time.
- **Never run `npm run build` and `npm run typecheck` concurrently.** They race
  on `.next/types` and emit phantom duplicate-identifier errors that look like
  real type failures. Run them in sequence.
- **`pkill -f "next start"` does not reliably kill a pnpm-spawned server.** The
  port stays held, the replacement dies with `EADDRINUSE`, and you go on
  measuring the *previous* build without noticing. The tell is a stylesheet 404
  or a page that renders unstyled — which looks exactly like you broke the CSS.
  Use `lsof -ti:<port> | xargs kill -9`, then confirm the CSS URL in the HTML
  returns 200 before trusting a single measurement.
- **Pillow is not in the system python3 here.** Scripts needing it run with
  `~/.claude/skills/seo/.venv/bin/python`, which also has Playwright.
- **The repo sits on an iCloud-synced Desktop, and it fights you over
  regenerated assets.** Deleting a directory of files and re-writing it races
  the sync daemon, which restores what it just saw deleted under a *conflict
  name*: `frame_0090 2.webp` lands beside `frame_0090.webp`. Consequences, all
  of which happened in one run:
  - 706 stale files, 3.9 MB, invisible because nothing requests that filename.
  - A verifier globbing `frame_*.webp` measured the restored **placeholders**
    and reported a contrast failure against the *current* render. The number
    was real; the diagnosis it implied was wrong.
  - Reading a cold, evicted file can raise `TimeoutError: [Errno 60]` mid-run.

  `rm -rf` before writing does **not** prevent this — the restore lands after.
  Prune *after* rendering, match filenames with a strict regex rather than a
  glob, and treat a non-conforming name as its own failure rather than folding
  it into whatever you were measuring.

  **It also hits `.next/types`, where it looks like a compiler error.**
  `pnpm typecheck` failed with 33 `Duplicate identifier` errors in files named
  `routes.d 2.ts`. Nothing was wrong with the code. Any duplicate-identifier
  error naming a file with a space and a digit before the extension is this,
  not a type bug — `rm -rf .next && pnpm build` clears it. Check the filenames
  in the error before you start reading source.

---

## Next.js / React

- **TypeScript 7 is npm `latest` but Next 16 rejects its compiler API.** Pin
  TypeScript 6.x. Check before upgrading.
- **`metadataBase` is required** or Next emits no canonical and no `og:image`,
  and every share renders a blank card. Set it, then `alternates: { canonical }`.
- **`NEXT_PUBLIC_SITE_URL` must be set at deploy** or the sitemap and canonicals
  ship pointing at localhost.
- **Server Components cannot use hooks or browser APIs.** Anything touching
  `window` needs `'use client'` and an effect.
- **A Prisma `Decimal` field crossing a Server -> Client Component boundary
  fails silently past `tsc`, `eslint`, and `next build`.** It only shows up as
  a runtime console error — "Only plain objects can be passed to Client
  Components from Server Components. Decimal objects are not supported." —
  the moment a page with a non-null `Decimal` column actually renders. None
  of the automated gates catch it: the Prisma-generated type for a `Decimal`
  column is a real TS type, so passing the whole row through a client
  component's props typechecks cleanly, and the dev-mode error is a console
  log, not a thrown exception, so the page still renders (with the field
  simply missing/garbled) and `next build`'s static analysis never touches
  it. Found by actually loading a data-heavy list page in a browser and
  reading the terminal — a Next.js dev-tools "N" badge in the corner turned
  red with an issue count, which was the only visible symptom in the
  screenshot itself. The same applies to a Server Action's return value
  serialized back to the client (same Flight protocol). Fix: convert every
  `Decimal` field to a plain string (`.toString()`) before it crosses either
  boundary; `Date`, by contrast, *is* one of Flight's supported types and
  needs no such conversion. Grep for every `Decimal`-typed column in
  `schema.prisma` and check each one reaches a Client Component or an
  action's return value only after that conversion.

### The LCP trap — it has now bitten three times, in two different technologies

**The rule, stated correctly:**

> Above the fold, the element must be **painted in its final visible position in
> the very first frame**. Only its *motion* may be delayed. The technology
> — JS, CSS, or anything else — is irrelevant.

Read that again before reaching for the shortcut version, because the shortcut
version is what caused the third failure.

**How it appeared each time:**

1. **JS.** `<Reveal>` with `initial={{ opacity: 0 }}`. Animation libraries render
   their initial state into the SSR HTML, so the element ships invisible —
   present for crawlers, absent for a human and for the LCP observer until
   hydration. Measured **2876ms**.
2. **JS again, one element down.** Fixing only the `h1` moved LCP to the
   paragraph below it, still 2.8s. **Fix the whole fold at once**, never a
   single element — LCP just relocates to the next-largest thing.
3. **CSS.** An earlier version of this note said "animate from CSS, never from
   JS". A team followed it exactly and reproduced the failure:
   ```css
   .hero-line { overflow: hidden; }
   .hero-line > span {
     transform: translateY(100%);
     animation: rise 1.1s var(--ease-out) both;
   }
   ```
   `animation-fill-mode: both` applies the `from` keyframe before the animation
   starts, so the line sat clipped entirely outside its mask at t=0. Invisible
   is invisible; the LCP observer does not care which language hid it. Measured
   **3.4s, 2.9s of it render delay**.

**What actually works:** keep the resting state visible and make the travel
small enough to stay inside the mask. `translateY(30%)` reads as a line-rise and
is legible in frame one; `translateY(100%)` is a blank screen with a timer on it.

**How to check, rather than assume:** run Lighthouse or a `PerformanceObserver`
and read the **LCP element**, not just the number. If it is a `<span>`, a
headline line, or anything inside a reveal wrapper, you have this bug. Opacity,
transform, clip-path, `visibility`, and `content-visibility` all cause it.

---

## CSS / layout

- **A scrim or overlay above a canvas swallows every click** unless it has
  `pointer-events-none`. The interaction silently does nothing and looks like a
  broken feature.
- **Directional gradients are layout-specific.** A left-to-right scrim protects
  copy in a left column and protects *nothing* when the copy goes full-width on
  mobile. Mobile usually needs a vertical gradient and a `md:` override.
- **Desktop-tuned constants break mobile.** Any hardcoded offset or size needs a
  narrow-viewport branch, and needs checking at 375px.
- **JSX comments `{/* … */}` evaluate to `undefined`.** In a component whose
  children are typed strictly (e.g. `EffectComposer`), a comment between
  children fails to typecheck with an error that names an unrelated type. Build
  the children as an array instead.

---

## WebGL / React Three Fiber

- **`metalness` near 1 with no environment map renders near-black.** A metal
  material shows *what it reflects*; with nothing to reflect it is dark and flat
  no matter how many lights you add. Direct lights give specular dots, not form.
  Add an `Environment` — Lightformers work offline; the `preset` prop fetches an
  HDR from a CDN and is a render-blocking third-party request.
- **Emissive is added after lighting.** It ignores facet orientation, so it
  tints the *entire body* uniformly and can never read as a rim or an edge. If
  you want a coloured edge, it must come from a reflection or a light — not
  emissive. A lime emissive turned a dark metal object into an avocado.
- **A large bright environment source floods a mirror-like material** rather
  than rimming it. Narrow strip lights rim; big panels flood.
- **Never allocate inside `useFrame`.** No `new Vector3()`. Hoist to a ref.
- **Clamp delta** (`Math.min(delta, 1/30)`). A backgrounded tab produces a huge
  delta and the object teleports on return.
- **Under `frameloop="never"`, `state.clock.elapsedTime` is not wall-clock
  time.** It advances per `advance()` call. Accumulate your own time from the
  clamped delta or animation runs at the wrong speed.
- **Wrap accumulated time before it reaches the GPU.** A large float loses
  precision and the motion visibly stutters after a long session.
- **Multiple canvases must pause off screen.** Otherwise every one renders a
  full-screen shader every frame while nobody is looking. Measured 9 → 25fps
  from an IntersectionObserver gate alone.
- **Dispose geometries, materials, and textures on unmount.** A leaked GPU
  resource is a bug, not a nitpick.

---

## Design system

- **Vary one thing, not four.** Giving each section its own seed, density,
  colour bias *and* intensity produced five unrelated designs. Sections must
  share their material; only one narrow control should differ.
- **Falloff at a section's own edges destroys continuity.** If each section
  fades out top and bottom, each visibly begins and ends and the page reads as
  separate panels.
- **Contrast is measured, never eyeballed.** Keep a script that parses the real
  token values and fails on regression.
- **Tap targets clear 44px** even when the label is small (`min-h-11`). That
  includes menu items and select options — a dropdown row is a tap target, and
  it is the place a mis-fire is most likely to land on the destructive item
  below.
- **`transition-colors` covers `outline-color`, so it makes the focus ring fade
  in.** Measured on a Tab: the ring rendered `rgb(76,49,10)` — a blend of the
  label colour and the ring token — for the whole 150ms before settling on
  `rgb(122,74,5)`. A focus indicator has to be correct on the frame it appears.
  Spell the properties out: `transition-[color,background-color,border-color]`.
- **A "quiet" text token is usually not AA at small sizes.** A token documented
  as 4.12:1 was used for a 12px uppercase row label — it needs 4.5:1. Tokens
  below 4.5 are for non-text UI (the 3:1 bar) and large text only; write that
  restriction into the token's own comment, because "subtle/UI text" reads as
  permission to use it on small labels.
- **A `disabled:` and an `aria-busy:` rule on the same property are equally
  specific**, so which one wins is decided by CSS source order — not by intent.
  A loading button that must not also look faded should have the faded class
  omitted in the component, not overridden by a second variant.
- **`cursor-pointer` on every clickable element**, `disabled:cursor-not-allowed`
  on disabled ones.

---

## Content integrity

**Never fabricate:** metrics, testimonials, client names, logos, review counts,
case studies, or `aggregateRating` markup. On a site whose purpose is
credibility this is self-defeating, and for schema it is a Google policy
violation.

**Legitimate to design:** illustrative product explanations — a diagram of how a
system works is yours to draw, provided it claims no customer and carries no
metrics. Label it as illustrative.

**When real content does not exist:** build a designed empty state or answer the
objections a buyer actually has. Both beat placeholder text, and neither has to
be unpicked later.

---

## Generation APIs

- **`freeGeneration: true` in a model list is not authoritative.** The
  subscription gate is applied at submit. Pro tiers refuse where Standard tiers
  pass.
- **A provider-side failure does not consume a free generation.** Check the
  balance before assuming it did.
- **Preflight cost** before an expensive generation.
- **Free-tier video models ignore composition constraints.** Asked for a black
  background with the left third empty and static camera, one returned a grey
  background with a bright element crossing the left. Prompt wording will not
  fix a model ceiling — say so rather than burning another attempt.

---

## Security

- **Never accept a price or amount from the client.** Resolve it server-side
  from your own catalogue. An endpoint taking an amount from the browser is a
  bug.
- **Verify webhook signatures against the raw body.** Parsing and
  re-serialising changes bytes and the signature stops matching.
- **Return 2xx from a webhook even when your own handler throws.** Providers
  retry non-2xx for days. Log loudly, acknowledge, fix forward.
- **Never leak provider errors to the client.** Log them; return something
  actionable.
- **Secrets come from environment variables only.** Never in source, config, or
  logs.
