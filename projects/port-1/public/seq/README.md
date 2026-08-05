# Frame sequences — asset contract

The site's motion is a canvas image sequence. Spec **C1** bans `<video>`, HLS,
GIF and Lottie outright, and **C2** allows only CSS/GSAP transforms on DOM or an
image sequence rendered to `<canvas>`. So this directory *is* the video layer —
there is no other one, and nothing here may become a media element.

The frames are consumed through the manifest in `lib/sequences.ts`. Widening
`widths` when new renditions land must require no change anywhere else.

---

## What is on disk now

**Rendered, not placeholder.** `scripts/render-frames.py` produces the shipped
sequences: contours of a moving scalar field — plotted linework, the look of a
topographic survey — graded so the bright structure never lands where copy does.

An earlier version was a soft volumetric blur. It satisfied every contract here
and looked like a default desktop wallpaper; it was rejected on sight. Passing
the gates is necessary, not sufficient.

```bash
~/.claude/skills/seo/.venv/bin/python scripts/render-frames.py   # write frames
~/.claude/skills/seo/.venv/bin/python scripts/verify-frames.py   # prove the contract
```

The renderer is deterministic — same inputs, same bytes — so the frames are
reproducible from the tracked script.

### Why rendered rather than generated

A generative video model cannot be held to the safe-area contract below. Asked
for a dark field with a quiet left third, one returned a grey field with a
bright element crossing the left. That is a model ceiling, not a prompt problem.
Rendering means every pixel is known, the contract holds by construction, and
`verify-frames.py` can prove it over every frame rather than a sample.

---

## File layout

```
public/seq/<id>/<width>/frame_0001.webp    1-based, zero-padded to 4
public/seq/<id>/poster.webp                the representative still
```

`<id>` is one of `hero`, `case-01`, `case-02`, `case-03`.

---

## Renditions

| id | aspect | frames | mode | widths |
|---|---|---|---|---|
| `hero` | 16:9 | 180 | scrub | 375, 768, 1440 |
| `case-01` | 16:10 | 60 | loop | 375, 960 |
| `case-02` | 16:10 | 60 | loop | 375, 960 |
| `case-03` | 16:10 | 60 | loop | 375, 960 |

`pickWidth()` selects the narrowest rendition that covers the element, so a
375px phone fetches the 375 set — not the 1440 one. Keep the `widths` array in
`lib/sequences.ts` ascending.

---

## The safe area — read this before shooting or rendering

Each sequence declares a `safeArea` in the manifest: the fraction of the frame
that **must stay visually quiet** because DOM copy sits over it.

| id | safe area | what is on top of it |
|---|---|---|
| `hero` | x 0 → 0.60, y 0.22 → 0.96 | The headline, bottom-left, at `--text-mega` |
| `case-*` | full width, y 0.82 → 1.0 | Nothing today — see below |

**The case reserve used to be y 0.62 → 1.0 and was wrong.** It claimed case
metadata overlaid the lower third on mobile. Measured against every text node
in the section at 375, 768 and 1440: **zero overlap, all three canvases, all
three widths.** `WorkCase` is a CSS grid — the canvas is one cell and the
metadata another, so "stacks" puts the copy *below* the canvas, never over it.
The reserve was costing 38% of every case frame to prevent a collision that
cannot occur, and the 16:10 frames read as letterboxed because of it. The short
band that remains is insurance against a future layout that does overlay
something.

The hero reserve is real: its headline block is absolutely positioned over the
canvas.

**Quiet means:**

- No hard edges, no lettering, no high-frequency detail
- Luminance low enough that bone `#EDEAE3` clears **4.5:1** over it
- A dark graded field, soft gradient, or out-of-focus material is right
- A bright subject, a horizon line, or type is not

**Why this exists.** The placeholder frames collided with the headline —
`HERO 001 / 180` printed straight through the words "that feel" at every
breakpoint, in the normal render, the reduced-motion render *and* the
JS-disabled render.

**The vignette does not save you.** It is
`radial-gradient(circle at 50% 45%, transparent 30%, var(--color-void) 92%)`,
which darkens the *corners* and leaves the frame centre at full strength. The
headline crosses that transparent centre band at every breakpoint. It is a mood
device, not a legibility device.

**Mobile crops to the centre.** The hero is 16:9 rendered `cover` into a tall
phone viewport; at 390×844 only the central ~26% of the frame's width survives.
So bright material parked on the right edge is invisible on a phone — which is
the right failure (quiet), but do not mistake a good desktop framing for a good
mobile one. Check both.

The last row of the viewport belongs to the fixed timecode status bar. It is
opaque, so nothing needs reserving in the frame — but do not put anything you
care about in the bottom `--timecode-lane` (2.5rem); it will be covered.

---

## Encoding

- **WebP.** No `<video>`, no HLS, no GIF, no Lottie — spec C1 and C2.
- Budget the whole sequence, not the single frame. The hero is 180 frames, so
  a 20 KB frame is a 3.6 MB sequence.
- **Linework costs roughly 10x what a blur does.** The same hero frame at 1440
  went from 5 KB as a soft gradient to 54 KB as contours. Line *count* is the
  dominant term, not quality: measured at 1440/q68, density 26 → 46 KB, 16 →
  31 KB, 12 → 25 KB, 9 → 19 KB. The shipped value is 12, which is also the
  best-looking — fewer, wider-spaced contours read as deliberate rather than
  busy. If you need bytes back, take lines out before you take quality out.
- Grain costs nothing here (measured: identical encoded size with and without)
  because the background is flat void rather than a gradient, so there is no
  banding for it to dither. It is kept as insurance, not as a fix.
- Frames stream in order, so favour consistent per-frame size over a small
  average with spikes.
- The poster is what renders under `prefers-reduced-motion`, in `<noscript>`,
  and before the sequence loads. It must stand alone as a still and satisfy the
  same safe area.

---

## Perfect loops

`case-*` run in `mode="loop"`. Every time-dependent term in the renderer is an
**integer harmonic of one base frequency**, so phase advances a whole number of
cycles across the sequence and frame *n+1* wraps to frame 1 with no seam. Break
that rule anywhere — one term at 1.5× — and the loop visibly jumps once per
cycle.

The hero is scrub-driven and does not need to close, but is built the same way
so it can be looped later without a re-render.

---

## Definition of done

- [x] All four sequences present at every width in the table
- [x] A poster per sequence
- [x] Bone verified ≥ 4.5:1 over the safe area on **every** frame, not frame 1 —
      `verify-frames.py` measures all of them and exits non-zero on a failure
- [x] `widths` ascending in `lib/sequences.ts`
- [ ] Re-run the §10 throttled-mobile check after any re-render — this is the
      one acceptance item a frame change can regress
