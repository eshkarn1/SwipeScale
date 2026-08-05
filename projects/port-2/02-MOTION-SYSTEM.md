# SCRIPT 2 — MOTION SYSTEM
## Canvas image-sequence engine

**Agent role:** Motion / performance engineer
**Owns:** `components/motion/*`, `lib/sequences.ts`
**Depends on:** Script 1 §3 (repo structure), Script 3 (frame assets + manifests)
**Definition of done:** both modes working, all budgets in §7 met, all A11y cases in §8 pass.

---

## 1. What we are building, precisely

Two motion primitives. Nothing else animates images.

| Mode | Driver | Use | Example |
|---|---|---|---|
| `scrub` | Scroll position via GSAP ScrollTrigger | Hero. Frame index maps 1:1 to scroll progress. User controls time. | 180 frames over a 300vh pinned track |
| `loop` | `requestAnimationFrame` clock | Work case ambients. Seamless, autoplaying, pauses offscreen. | 48 frames at 24fps = 2.0s loop |

Both render to a single `<canvas>` via `drawImage`. **Never** swap `<img>` src, never stack absolutely-positioned images and toggle opacity, never use CSS `steps()` sprite animation for these. Those approaches all cause layout thrash or memory blowup at this frame count.

### The video clarification — read this once
The client requirement is **no `<video>` element in the browser**. Video is completely fine as a *production intermediate*: Script 3 may render or generate an MP4 and extract frames from it with ffmpeg. What ships to the browser is a directory of `.webp` stills. Do not raise this as a conflict.

---

## 2. Manifest contract

Every sequence is described by a JSON file at `public/seq/<id>/manifest.json`. Script 3 produces these. This is the **only** interface between the two scripts.

```json
{
  "id": "hero",
  "mode": "scrub",
  "frameCount": 180,
  "fps": 24,
  "aspect": 1.7778,
  "alt": "A folded paper form unwrapping into a grid of typographic panels.",
  "posterFrame": 1,
  "tiers": [
    { "width": 960,  "path": "/seq/hero/0960", "bytes": 3100000 },
    { "width": 1440, "path": "/seq/hero/1440", "bytes": 6200000 },
    { "width": 1920, "path": "/seq/hero/1920", "bytes": 8900000 }
  ],
  "filePattern": "frame_{n}.webp",
  "padding": 4
}
```

- `{n}` is replaced with the 1-indexed frame number, zero-padded to `padding`.
- Tiers are ascending by width. The loader picks the **smallest tier whose width ≥ `viewportWidth × min(devicePixelRatio, 2)`**, falling back to the largest available.
- `posterFrame` is the frame shown under reduced-motion and before load completes.

Registry file:

```ts
// lib/sequences.ts
export const SEQUENCE_IDS = ["hero", "case-01", "case-02", "case-03"] as const;
export type SequenceId = (typeof SEQUENCE_IDS)[number];

type Listener = (frame: number, total: number, id: SequenceId) => void;
const listeners = new Set<Listener>();
let active: { id: SequenceId; frame: number; total: number } | null = null;

export const timecode = {
  set(id: SequenceId, frame: number, total: number) {
    active = { id, frame, total };
    listeners.forEach((l) => l(frame, total, id));
  },
  get: () => active,
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
```

---

## 3. Loading strategy — the part that decides whether this feels good

Naive "load all 180 frames then start" is a 9 MB blocking wait. Do this instead:

**Pass A — stride preload.** Load every 8th frame (`1, 9, 17, …`). ~23 frames, ~1.1 MB. As soon as Pass A completes, the sequence is *interactive*: any requested frame renders the nearest loaded frame. It looks slightly choppy for a moment and then smooths out. This is the correct trade.

**Pass B — gap fill.** Load the remainder with a concurrency cap of **6**, in an order that prioritises frames nearest the current playhead. Reprioritise on scroll.

**Pass C — idle.** Non-hero sequences don't start loading until either (a) `requestIdleCallback` fires after the hero completes Pass A, or (b) the sequence enters a 200% root-margin IntersectionObserver. Whichever is first.

Decode off the main thread with `createImageBitmap`. Never assign to `<img>` and wait for `onload` — that decodes on the main thread and will jank the scroll.

```ts
// components/motion/useFrameLoader.ts
export async function loadFrame(url: string, signal: AbortSignal): Promise<ImageBitmap> {
  const res = await fetch(url, { signal, cache: "force-cache" });
  if (!res.ok) throw new Error(`Frame fetch failed: ${url} (${res.status})`);
  const blob = await res.blob();
  return createImageBitmap(blob);
}
```

**Memory:** an `ImageBitmap` is decoded, uncompressed pixels. 1920×1080 RGBA ≈ 8.3 MB *each*. 180 of those is 1.5 GB and will crash a phone.

Therefore, hard rule: **cap resident bitmaps at 200 for scrub sequences and at `frameCount` for loops** (loops are ≤ 60 frames so they can be fully resident). If a scrub sequence exceeds the cap, evict the bitmap furthest from the playhead and call `.close()` on it. On unmount, `.close()` every bitmap. Verify in DevTools → Memory that heap returns to baseline after navigating away.

This is the single most common failure mode in image-sequence builds. Do not skip it.

---

## 4. Cover-fit maths

`object-fit: cover` does not apply to canvas contents. Compute it:

```ts
// components/motion/useCoverFit.ts
export function coverRect(
  cw: number, ch: number,   // canvas CSS size
  iw: number, ih: number    // image intrinsic size
) {
  const scale = Math.max(cw / iw, ch / ih);
  const w = iw * scale;
  const h = ih * scale;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}
```

Canvas sizing:

```ts
const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2
canvas.width  = Math.round(cssWidth  * dpr);
canvas.height = Math.round(cssHeight * dpr);
canvas.style.width  = `${cssWidth}px`;
canvas.style.height = `${cssHeight}px`;
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

Resize handling: `ResizeObserver`, debounced 150ms. On resize, re-evaluate the tier — if a larger tier is now needed, switch and reload in the background while continuing to render the old tier. Never blank the canvas during a tier switch.

---

## 5. Render loop

**Draw exactly once per animation frame, only when dirty.** Never draw inside a scroll handler.

```ts
let targetFrame = 1;
let drawnFrame = -1;
let rafId = 0;

function tick() {
  rafId = requestAnimationFrame(tick);
  if (targetFrame === drawnFrame) return;          // nothing changed
  const bmp = nearestLoaded(targetFrame);           // fallback to closest available
  if (!bmp) return;
  const { x, y, w, h } = coverRect(cssW, cssH, bmp.width, bmp.height);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.drawImage(bmp, x, y, w, h);
  drawnFrame = targetFrame;
  timecode.set(id, targetFrame, frameCount);
}
```

**Scrub mode** — ScrollTrigger writes `targetFrame`, nothing more:

```ts
ScrollTrigger.create({
  trigger: sectionRef.current,
  start: "top top",
  end: "+=300%",
  pin: pinRef.current,
  pinSpacing: true,
  scrub: 0.6,                        // 0.6s smoothing — do not exceed 1
  invalidateOnRefresh: true,
  onUpdate: (self) => {
    targetFrame = Math.min(
      frameCount,
      Math.max(1, Math.round(self.progress * (frameCount - 1)) + 1)
    );
  },
});
```

**Loop mode** — clock-driven, wraps cleanly:

```ts
const frameDuration = 1000 / fps;
let t0 = performance.now();

function advance(now: number) {
  const elapsed = now - t0;
  targetFrame = (Math.floor(elapsed / frameDuration) % frameCount) + 1;
}
```

Pause loops when offscreen:

```ts
const io = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) { t0 = performance.now(); start(); }
    else stop();
  },
  { threshold: 0.01 }
);
```

Also stop on `document.visibilitychange → hidden`. An offscreen or backgrounded loop must consume zero CPU.

---

## 6. Component API

```ts
// components/motion/types.ts
export interface FrameSequenceProps {
  id: SequenceId;
  mode: "scrub" | "loop";
  className?: string;
  /** scrub only — scroll distance as a multiple of viewport height. Default 3. */
  scrollLength?: number;
  /** loop only — overrides manifest fps. */
  fps?: number;
  /** Called once when Pass A completes. */
  onReady?: () => void;
  /** Renders while Pass A is in flight. Receives 0–1. */
  renderLoading?: (progress: number) => React.ReactNode;
}
```

Usage:

```tsx
<FrameSequence
  id="hero"
  mode="scrub"
  scrollLength={3}
  onReady={() => heroIntro.play()}
  renderLoading={(p) => (
    <span className="font-mono text-micro text-amber">
      LOADING {String(Math.round(p * 100)).padStart(3, "0")}%
    </span>
  )}
/>
```

The hero headline intro **must not fire until `onReady`**. Text animating over an empty canvas is the tell that reads as unfinished.

---

## 7. Performance budgets — measured, not estimated

| Metric | Target | Fail condition |
|---|---|---|
| Hero total transfer, 1920 tier | ≤ 9.0 MB | > 10 MB |
| Hero per-frame average | ≤ 60 KB | > 75 KB |
| Loop sequence total, each | ≤ 2.0 MB | > 2.5 MB |
| Time to Pass A complete, Slow 4G | ≤ 2.5 s | > 4 s |
| LCP | ≤ 2.5 s | > 3.0 s |
| CLS | ≤ 0.02 | > 0.05 |
| INP | ≤ 200 ms | > 300 ms |
| Long tasks during scrub | 0 over 50 ms | any over 80 ms |
| Sustained scrub FPS, 4× CPU throttle | ≥ 50 | < 40 |
| Heap after unmount | within 10% of baseline | leak |

**Mobile tier reduction.** Below 640px viewport width, the hero uses a **90-frame** decimated variant (every 2nd frame) at the 960 tier. Script 3 produces this as `/seq/hero/0960-half/`. Perceptually identical when scrubbing on a small screen, and halves the payload.

**Test protocol:** Chrome DevTools → Performance, CPU 4× slowdown, Network Slow 4G, scroll the hero end-to-end at a natural speed, record. Read the FPS meter and the long-task lane. Also test on a real mid-range Android if one is available — the emulator flatters.

---

## 8. Accessibility & failure states

| Case | Behaviour |
|---|---|
| `prefers-reduced-motion: reduce` | Load **only** `posterFrame`. No preload, no rAF, no ScrollTrigger pin. Canvas renders one still. Section becomes normal document flow. |
| JS disabled | `<noscript>` renders `<img>` of the poster frame at the same aspect ratio. No layout shift. |
| `createImageBitmap` unsupported | Fall back to `new Image()` + `await img.decode()`. Same render path. |
| Fetch failure on a frame | Retry twice with 400ms backoff, then permanently skip that index. `nearestLoaded()` covers the gap invisibly. Never throw, never blank the canvas. |
| Slow connection, Pass A incomplete after 8s | Render poster frame, continue loading in background, call `onReady` anyway so the page is never stuck behind a loader. |
| Screen reader | `<canvas role="img" aria-label={manifest.alt} />`. The scroll track is `aria-hidden` — the pin is a visual device, not content. |

Reserve space with `aspect-ratio` from the manifest **before** any frame loads. CLS must be zero.

---

## 9. Timecode component

```tsx
// components/ui/Timecode.tsx
"use client";
import { useEffect, useState } from "react";
import { timecode, type SequenceId } from "@/lib/sequences";

const LABELS: Record<SequenceId, string> = {
  hero: "HERO",
  "case-01": "CASE 01",
  "case-02": "CASE 02",
  "case-03": "CASE 03",
};

export function Timecode() {
  const [s, setS] = useState<{ f: number; t: number; id: SequenceId } | null>(null);
  useEffect(() => timecode.subscribe((f, t, id) => setS({ f, t, id })), []);
  if (!s) return null;
  return (
    <div
      aria-hidden
      className="fixed bottom-6 left-[--gutter] z-50 font-mono text-micro tracking-[0.06em] text-amber"
    >
      FRAME {String(s.f).padStart(3, "0")} / {s.t}
      <span className="hidden sm:inline"> · {LABELS[s.id]}</span>
    </div>
  );
}
```

Hidden entirely under `prefers-reduced-motion`.

---

## 10. Hard prohibitions

- ❌ No `<video>`, GIF, APNG, Lottie, or WebM anywhere in `/public` or the DOM
- ❌ No scroll-jacking / smooth-scroll libraries — native scroll only
- ❌ No `will-change` on the canvas (it forces a layer that costs more than it saves here)
- ❌ No `filter`, `backdrop-filter`, or `mix-blend-mode` on the canvas element
- ❌ No drawing inside `onScroll`, `onWheel`, or ScrollTrigger's `onUpdate`
- ❌ No `localStorage` / `sessionStorage`
- ❌ No loading all frames before first paint
- ❌ No uncapped `devicePixelRatio`

---

## 11. Verification script

```bash
# no video anywhere
! grep -rn "<video\|\.mp4\|\.webm\|\.gif" app/ components/ public/ --include="*.tsx" --include="*.ts"

# every manifest is valid and complete
for m in public/seq/*/manifest.json; do
  node -e "
    const m = require('./$m');
    const req = ['id','mode','frameCount','aspect','alt','posterFrame','tiers','filePattern','padding'];
    const missing = req.filter(k => m[k] === undefined);
    if (missing.length) { console.error('$m missing:', missing); process.exit(1); }
    console.log('$m OK —', m.frameCount, 'frames,', m.tiers.length, 'tiers');
  "
done

# frame counts match manifests
for d in public/seq/*/; do
  id=$(basename $d)
  declared=$(node -pe "require('./public/seq/$id/manifest.json').frameCount")
  for tier in $d*/; do
    actual=$(ls $tier 2>/dev/null | grep -c '\.webp$')
    [ "$actual" -eq "$declared" ] || echo "MISMATCH $tier: $actual vs $declared"
  done
done
```

All three must pass clean before this script is done.
