#!/usr/bin/env python3
"""
Frame sequences for §6.1 and §6.3 — the contour-field art direction.

Run:  ~/.claude/skills/seo/.venv/bin/python scripts/render-frames.py

## Why this replaced the previous render

The first version was a soft volumetric blur: layered gaussian ribbons through
haze. It satisfied every contract — safe area, loop closure, byte budget — and
looked like a default desktop wallpaper. Optimising for a measurable contract
is not the same as making something good, and it was rejected on sight.

This is plotted linework instead: contours of a moving scalar field, thin and
anti-aliased, the look of a topographic survey or an interferogram. Hard edges,
visible precision, a structure you can read. It reads as authored because it is
— every line is the level set of a function, not a blur.

## The field

`field()` sums a few travelling gaussian hills and a low ripple. `contours()`
then draws the level sets: for a scalar f, the distance to the nearest contour
is `min(frac, 1-frac) / (DENSITY * |grad f|)`, which is a true *spatial*
distance in pixels, so line weight stays constant no matter how steep the field
gets. Without the gradient term, contours crowd into solid blocks wherever the
field is steep — which is what makes naive isoline renders look like mud.

## Perfect loops

`case-*` run in `mode="loop"`, so every time-dependent term is an integer
harmonic of one base frequency: phase advances a whole number of cycles across
the sequence and frame n+1 wraps to frame 1 with no seam. The hero is
scrub-driven and does not need to close, but is built the same way.

## The safe area still governs

Thin bright lines are far more dangerous to text than a blur was — the
verifier measures the *maximum* luminance in the safe rectangle, and one line
crossing it is a spike, not an average. So the energy mask is applied to the
line intensity itself: inside the safe area the lines fade to nothing rather
than dimming uniformly. scripts/verify-frames.py proves the result over every
frame.
"""

from __future__ import annotations

import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SEQ_DIR = ROOT / "public" / "seq"

# Spec §4 tokens.
VOID = np.array([0x08, 0x09, 0x0C], dtype=np.float64) / 255.0
SIGNAL = np.array([0x3B, 0x4C, 0xFF], dtype=np.float64) / 255.0
BONE = np.array([0xED, 0xEA, 0xE3], dtype=np.float64) / 255.0

# Contour spacing, in level-sets per unit of field value.
#
# Tuned against file size AND taste, which agreed for once. Linework is roughly
# 10x more expensive to encode than the blur this replaced — a WebP frame went
# from 5 KB to 54 KB at 1440 — and line count is the dominant term. Measured at
# 1440, quality 68:
#
#   density 26  ->  46 KB/frame   8.1 MB per 180-frame sequence
#   density 16  ->  31 KB/frame   5.4 MB
#   density 12  ->  25 KB/frame   4.3 MB
#   density  9  ->  19 KB/frame   3.4 MB
#
# 12 is where it stopped being a trade: fewer, wider-spaced contours read as
# deliberate rather than busy, and look more expensive than 26 did. Below 9 the
# structure stops reading as a survey and starts reading as a few ovals.
DENSITY = 12.0
# Line half-width in pixels. Below ~0.6 the lines alias into dashes at 375;
# raised alongside the density drop so the lines keep their weight.
LINE_PX = 1.05


def smoothstep(a: float, b: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# Travelling hills: (x0, y0, drift x, drift y, radius, weight, harmonic)
# Harmonics are integers so the field closes over one sequence.
HERO_HILLS = [
    (0.86, 0.30, 0.030, 0.045, 0.40, 1.00, 1),
    (0.72, 0.66, 0.045, -0.035, 0.30, 0.75, 2),
    (1.02, 0.52, -0.035, 0.030, 0.34, 0.85, 1),
    (0.62, 0.16, 0.025, 0.040, 0.20, 0.45, 3),
]

CASE_HILLS = [
    (0.30, 0.28, 0.050, 0.030, 0.36, 1.00, 1),
    (0.68, 0.20, -0.040, 0.045, 0.30, 0.80, 2),
    (0.50, 0.40, 0.035, -0.030, 0.24, 0.55, 3),
]


def field(x: np.ndarray, y: np.ndarray, t: float, hills) -> np.ndarray:
    """Scalar field whose level sets become the contour lines."""
    f = np.zeros_like(x)
    two_pi_t = 2.0 * math.pi * t
    for x0, y0, dx, dy, radius, weight, harmonic in hills:
        cx = x0 + dx * math.sin(harmonic * two_pi_t)
        cy = y0 + dy * math.cos(harmonic * two_pi_t)
        r2 = (x - cx) ** 2 + (y - cy) ** 2
        f += weight * np.exp(-r2 / (radius * radius))
    # A low ripple so the contours are not perfect concentric ovals.
    f += 0.10 * np.sin(3.0 * math.pi * x + two_pi_t) * np.cos(2.0 * math.pi * y - two_pi_t)
    return f


def contours(f: np.ndarray, width: int, height: int) -> np.ndarray:
    """Anti-aliased level sets of `f`, returned as 0-1 line coverage.

    Divides by the gradient magnitude so line weight is constant in *pixels*
    rather than in field units. Skip that and the lines pile into solid blocks
    wherever the field is steep.
    """
    scaled = f * DENSITY
    gy, gx = np.gradient(scaled)
    grad = np.hypot(gx, gy)          # field units per pixel
    grad = np.maximum(grad, 1e-6)

    frac = scaled - np.floor(scaled)
    dist_field = np.minimum(frac, 1.0 - frac)   # distance to contour, field units
    dist_px = dist_field / grad                 # ...converted to pixels

    return 1.0 - smoothstep(0.0, LINE_PX, dist_px)


def render(width, height, t, hills, energy_mask, seed) -> np.ndarray:
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / (width - 1)
    y = ys / (height - 1)

    f = field(x, y, t, hills)
    lines = contours(f, width, height)

    # Depth: contours nearer the field's peaks read brighter, so the structure
    # has a light source rather than being a flat wireframe.
    depth = 0.35 + 0.65 * smoothstep(0.15, 1.6, f)
    intensity = lines * depth * energy_mask

    # Colour ramp along the same axis — signal in the body, bone at the crests.
    warm = smoothstep(0.9, 1.9, f)[..., None]
    colour = SIGNAL[None, None, :] * (1.0 - warm) + BONE[None, None, :] * warm

    rgb = VOID[None, None, :] + colour * intensity[..., None]

    # Grain, seeded per frame. Dark flat areas band under WebP quantisation.
    rng = np.random.default_rng(seed)
    rgb += rng.normal(0.0, 0.0032, size=rgb.shape)
    return np.clip(rgb, 0.0, 1.0)


def hero_mask(width: int, height: int) -> np.ndarray:
    """Left 60% is the headline's; lines resolve out of darkness to the right."""
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / (width - 1)
    y = ys / (height - 1)
    m = smoothstep(0.50, 0.88, x)
    # Keep the very bottom quiet — headline baseline and the timecode lane.
    m *= 1.0 - 0.7 * smoothstep(0.78, 1.0, y)
    return m


def case_mask(width: int, height: int) -> np.ndarray:
    """Nearly the whole frame is usable; only the last band stays quiet.

    The manifest used to reserve y 0.62 -> 1.0 for "case metadata on mobile,
    where it stacks". Measured at 375, 768 and 1440 against every text node in
    the section: **zero overlap on all three canvases at all three widths**.
    WorkCase is a CSS grid — the canvas is one cell and the metadata another,
    so stacking puts the copy *below* the canvas, never over it. The reserve
    was guarding a collision that cannot happen, and it cost 38% of every case
    frame: the structure faded to flat black across the bottom third and the
    16:10 frame read as letterboxed.

    A short band at the bottom is kept as insurance against a future layout
    that does overlay something, which is what the contract is for.
    """
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / (width - 1)
    y = ys / (height - 1)
    m = 1.0 - smoothstep(0.80, 0.96, y)
    m *= smoothstep(0.0, 0.10, x) * smoothstep(1.0, 0.90, x)
    m *= smoothstep(0.0, 0.08, y)
    return np.clip(m, 0.0, 1.0)


SEQUENCES = [
    # id, aspect, frames, widths, mask fn, hills, poster frame, seed
    # poster frame MUST equal `posterFrame` in lib/sequences.ts — verified.
    ("hero", 16 / 9, 180, [375, 768, 1440], hero_mask, HERO_HILLS, 1, 11),
    ("case-01", 16 / 10, 60, [375, 960], case_mask, CASE_HILLS, 1, 21),
    ("case-02", 16 / 10, 60, [375, 960], case_mask, CASE_HILLS, 1, 22),
    ("case-03", 16 / 10, 60, [375, 960], case_mask, CASE_HILLS, 1, 23),
]

# Only ONE control varies between the three cases — overall intensity. Giving
# each its own seed, density and colour bias produced three unrelated designs
# on a previous project; they must read as one material.
INTENSITY = {"hero": 1.00, "case-01": 0.92, "case-02": 1.00, "case-03": 0.84}


def prune(out_dir: Path, count: int) -> int:
    """Delete anything that is not one of the frames we just wrote.

    This directory lives under an iCloud-synced Desktop. Deleting frames and
    re-rendering races the sync daemon, which restores the old files under a
    conflict name — `frame_0090 2.webp` beside `frame_0090.webp`. The manifest
    only requests `frame_NNNN.webp`, so the forks are never fetched and the
    site looks fine; they simply double the directory on disk and in git. A
    previous run left 706 of them, 3.9 MB of stale placeholder.

    `rm -rf` before rendering does not prevent it — the restore lands after.
    """
    keep = {f"frame_{i:04d}.webp" for i in range(1, count + 1)}
    removed = 0
    for f in out_dir.iterdir():
        if f.name not in keep:
            f.unlink()
            removed += 1
    return removed


def main() -> None:
    for seq_id, aspect, count, widths, mask_fn, hills, poster_frame, seed in SEQUENCES:
        gain = INTENSITY[seq_id]
        for width in widths:
            height = int(round(width / aspect))
            height += height % 2
            out_dir = SEQ_DIR / seq_id / str(width)
            out_dir.mkdir(parents=True, exist_ok=True)
            mask = mask_fn(width, height) * gain

            for i in range(1, count + 1):
                t = (i - 1) / count  # 0 .. (n-1)/n so frame n+1 == frame 1
                rgb = render(width, height, t, hills, mask, seed + i)
                Image.fromarray((rgb * 255.0 + 0.5).astype(np.uint8), "RGB").save(
                    out_dir / f"frame_{i:04d}.webp", "WEBP", quality=68, method=6
                )

            stale = prune(out_dir, count)
            print(f"  {seq_id}/{width}  {count} frames  {width}x{height}"
                  + (f"  (pruned {stale} stale)" if stale else ""))

        # Poster: a byte-identical copy of the frame the manifest declares.
        # It used to be re-rendered from its own index at a different quality,
        # which let it drift — the manifest said posterFrame 1 while the file
        # held frame 90, so the readout announced "FRAME 001" over frame 90's
        # image. verify-frames.py compares the bytes.
        src = SEQ_DIR / seq_id / str(widths[-1]) / f"frame_{poster_frame:04d}.webp"
        shutil.copyfile(src, SEQ_DIR / seq_id / "poster.webp")
        print(f"  {seq_id}/poster.webp  <- {src.name}")


if __name__ == "__main__":
    main()
