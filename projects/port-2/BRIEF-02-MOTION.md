# BRIEF — Agent 02: Motion System

Read this before `02-MOTION-SYSTEM.md`. This tells you *why*. The spec tells you *what*.

---

## Shared context

**Client:** Swipe & Scale — a one-person motion-led web design studio.
**This project:** the studio's own marketing site, which must demonstrate the exact skill it's selling.
**Ship date:** two weeks.

You are building the part of this site that *is* the product. Everything else is packaging. If the motion is mediocre, nothing else on the page can rescue it.

---

## Your mission

Build a canvas-based image-sequence engine with two modes — scroll-scrubbed and ambient loop — that runs at 50+ fps on a throttled mid-range Android and loads fast enough on 4G that nobody sees a spinner.

## The actual difficulty

The naive version of this is a two-hour job and it will be broken in three specific ways that only appear under real conditions. All three are why this has a dedicated agent:

**1. Memory.** An `ImageBitmap` is decoded, uncompressed pixels — a 1920×1080 frame is ~8.3 MB in RAM regardless of how small the WebP is on disk. Keep 180 resident and you're at 1.5 GB. Desktop Chrome will absorb it and look fine. Phones will crash. The spec's residency cap and `.close()` eviction is not optional polish; it's the difference between working and not.

**2. Loading.** "Preload everything, then start" turns a 9 MB sequence into a 12-second blank screen on 4G. The stride-then-fill strategy in §3 gets you interactive in under 3 seconds with a brief moment of slight choppiness. Take the choppiness. It's invisible compared to a loader.

**3. Main-thread decode.** `new Image()` + `onload` decodes on the main thread and will visibly jank the scroll. `createImageBitmap` decodes off-thread. Same amount of code, completely different feel.

If you only get three things right, get those three right.

## What "good" feels like

Scrubbing the hero should feel like dragging a physical object — direct, weighted, no lag, no rubber-banding, no frames dropped. Set `scrub: 0.6` for a touch of smoothing. Above `1.0` it starts feeling disconnected from the user's hand, which is worse than slightly jittery.

The ambient loops should be invisible. If a visitor notices the loop point, it's broken.

## What you're optimising for, in order

1. **Frame-rate stability under throttle.** Consistent 50fps beats a variable 60.
2. **Time to interactive.** Nobody waits.
3. **Memory ceiling.** No crash on a 4GB phone.
4. **Visual fidelity.** Last, because at these dimensions the difference between q76 and q88 is invisible and 40% of the payload.

## Non-obvious things that matter

**"No video" means no `<video>` element in the browser.** MP4 as a production intermediate is fine — Agent 03 will render or generate clips and ffmpeg them into frames. Don't flag this as a contradiction; it's already resolved.

**Draw once per rAF, only when dirty.** Never draw inside a scroll handler or ScrollTrigger's `onUpdate`. Those fire more often than the display refreshes and you'll do redundant work every frame.

**Don't reach for `will-change` on the canvas.** It forces a compositor layer that costs more than it saves in this specific case.

**The frame counter is the site's signature element.** Your engine feeds it. It must be accurate — if the number lags the visual by even a few frames it undermines the one thing the design is built around.

**iOS Safari address-bar collapse** changes viewport height mid-scroll and will make the pin jump. Use `100svh` and `ignoreMobileResize`. Test on a real device; the simulator hides this.

## Guardrails

- No animation library other than GSAP core + ScrollTrigger
- No smooth-scroll or scroll-hijacking library — native scroll only
- No Three.js / WebGL
- No `<img>` swapping, opacity-stacked images, or CSS sprite `steps()` for sequences
- No `localStorage` / `sessionStorage`
- No uncapped `devicePixelRatio`
- Never blank the canvas — on any failure, hold the last good frame

## When to stop and ask

Escalate only if a performance budget in §7 is unachievable after genuine optimisation — and when you do, bring the measurement and a proposed frame-count reduction, not just the problem. Everything else: resolve it.

## Handoff

Done when: both modes work, every budget in §7 is met *measured under 4× CPU throttle and Slow 4G*, every accessibility case in §8 passes, and the verification script in §11 runs clean.

Your contract with Agent 03 is the manifest JSON in §2 and nothing else. Publish that shape early so they can produce against it in parallel. Build against placeholder frames rather than waiting for real ones.
