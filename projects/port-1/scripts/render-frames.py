#!/usr/bin/env python3
"""
Real frame sequences for §6.1 and §6.3 — replaces the §9 placeholders.

Run:  ~/.claude/skills/seo/.venv/bin/python scripts/render-frames.py

## Why these are rendered rather than generated

The site's motion is a canvas image sequence (spec C1/C2 ban `<video>`), so the
"footage" is whatever WebP frames sit in public/seq/. Those frames have to obey
a hard contract: `safeArea` in lib/sequences.ts marks the region DOM copy sits
over, and bone #EDEAE3 must clear 4.5:1 against every pixel of it, on the
busiest frame — not just frame 1.

A generative video model cannot be held to that. Asked for a dark field with a
quiet left third, one previously returned a grey field with a bright element
crossing the left. Composition constraints are not something prompt wording
fixes. Rendering the frames means every pixel is known, the safe area is
satisfied by construction, and `verify-frames.py` can prove it.

## The composition

A slow volumetric field — layered light ribbons drifting through dark haze,
the look of a long exposure rather than a subject. Luminance is deliberately
graded so the bright material lives where no copy does:

  hero     16:9,  180 frames, scrub. Energy ramps in past x=0.62; the left
                  60% (headline) stays near void. Peak sits far right, which
                  is also outside the ~26% centre crop a 390px phone takes,
                  so the mobile framing degrades to quiet rather than to a
                  bright shape behind full-width type.
  case-*   16:10,  60 frames, loop. Energy in the upper 60%; the bottom 38%
                  (where case metadata stacks on mobile) stays near void.

## Perfect loops

`case-*` run in `mode="loop"`, so every time-dependent term is an integer
harmonic of one base frequency — phase advances by a whole number of cycles
across the sequence and frame N wraps to frame 1 with no seam. The hero is
scrub-driven and does not need to close, but is built the same way so it can
be looped later without a re-render.
"""

from __future__ import annotations

import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SEQ_DIR = ROOT / "public" / "seq"

# Spec §4 tokens. Do not adjust.
VOID = np.array([0x08, 0x09, 0x0C], dtype=np.float64) / 255.0
SIGNAL = np.array([0x3B, 0x4C, 0xFF], dtype=np.float64) / 255.0
AMBER = np.array([0xFF, 0xB4, 0x3D], dtype=np.float64) / 255.0
BONE_L = 0.7900  # relative luminance of #EDEAE3, precomputed

# Ceiling on relative luminance inside a safe area. Bone over this clears
# (0.79 + 0.05) / (0.035 + 0.05) = 9.9:1, comfortably past the 4.5:1 floor
# with headroom for WebP quantisation.
SAFE_L_MAX = 0.035


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def luminance(rgb: np.ndarray) -> np.ndarray:
    """Relative luminance per WCAG, for an HxWx3 float array in sRGB 0-1."""
    lin = srgb_to_linear(rgb)
    return lin[..., 0] * 0.2126 + lin[..., 1] * 0.7152 + lin[..., 2] * 0.0722


def smoothstep(a: float, b: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# ---------------------------------------------------------------------------
# The field
# ---------------------------------------------------------------------------

# Each ribbon: (base y, amplitude, spatial freq in x, temporal harmonic,
#               phase, thickness, colour mix toward amber, weight)
# Temporal harmonics are integers, so the field closes over one sequence.
HERO_RIBBONS = [
    (0.30, 0.085, 1.0, 1, 0.00, 0.115, 0.00, 1.00),
    (0.46, 0.060, 1.5, 2, 1.90, 0.080, 0.12, 0.72),
    (0.62, 0.100, 0.8, 1, 3.60, 0.150, 0.05, 0.85),
    (0.22, 0.045, 2.0, 3, 5.10, 0.055, 0.55, 0.40),
    (0.75, 0.070, 1.2, 2, 2.40, 0.100, 0.30, 0.50),
]

CASE_RIBBONS = [
    (0.26, 0.070, 1.0, 1, 0.00, 0.105, 0.00, 1.00),
    (0.38, 0.055, 1.5, 2, 2.30, 0.075, 0.18, 0.70),
    (0.16, 0.040, 2.0, 3, 4.40, 0.050, 0.50, 0.42),
    (0.48, 0.085, 0.8, 1, 1.10, 0.130, 0.08, 0.62),
]


def render(
    width: int,
    height: int,
    t: float,
    ribbons,
    energy_mask: np.ndarray,
    seed: int,
) -> np.ndarray:
    """One frame as an HxWx3 sRGB float array in 0-1. `t` is 0-1 through the
    sequence; time terms use integer harmonics of 2*pi*t so the field closes."""
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / (width - 1)
    y = ys / (height - 1)

    accum = np.zeros((height, width), dtype=np.float64)
    tint = np.zeros((height, width), dtype=np.float64)

    for base, amp, fx, harmonic, phase, thick, warm, weight in ribbons:
        # Ribbon centreline: a travelling wave in x, drifting in time.
        centre = (
            base
            + amp * np.sin(fx * x * 2.0 * math.pi + phase + harmonic * t * 2.0 * math.pi)
            + 0.28 * amp * np.sin(2.0 * fx * x * 2.0 * math.pi - phase + 2 * harmonic * t * 2.0 * math.pi)
        )
        # Thickness breathes on its own integer harmonic.
        tk = thick * (1.0 + 0.22 * np.sin(harmonic * t * 2.0 * math.pi + phase))
        band = np.exp(-(((y - centre) / tk) ** 2))
        accum += weight * band
        tint += weight * band * warm

    # Normalise the tint by total energy before the mask, so colour does not
    # shift as the mask attenuates.
    with np.errstate(invalid="ignore", divide="ignore"):
        tint = np.where(accum > 1e-6, tint / np.maximum(accum, 1e-6), 0.0)

    # Broad haze so the field reads as volume rather than as stacked bands.
    haze = 0.30 * np.exp(-(((y - 0.42) / 0.55) ** 2)) * (0.6 + 0.4 * np.sin(t * 2.0 * math.pi))
    accum = accum * 0.55 + haze * 0.45

    accum *= energy_mask

    # Grain, seeded per sequence. Dark smooth gradients band badly in WebP;
    # a little noise dithers the quantisation away and costs almost nothing
    # in file size at this amplitude.
    rng = np.random.default_rng(seed)
    accum += rng.normal(0.0, 0.0035, size=accum.shape)
    accum = np.clip(accum, 0.0, None)

    colour = SIGNAL[None, None, :] * (1.0 - tint[..., None]) + AMBER[None, None, :] * tint[..., None]
    rgb = VOID[None, None, :] + colour * accum[..., None]
    return np.clip(rgb, 0.0, 1.0)


def hero_mask(width: int, height: int) -> np.ndarray:
    """Left 60% near-void (headline), energy ramping in to the right."""
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / (width - 1)
    y = ys / (height - 1)
    # Horizontal ramp: flat and low until 0.55, full by 0.86.
    m = 0.055 + 0.945 * smoothstep(0.55, 0.86, x)
    # Keep the very bottom quiet — the timecode lane and the headline baseline.
    m *= 1.0 - 0.55 * smoothstep(0.80, 1.0, y)
    return m


def case_mask(width: int, height: int) -> np.ndarray:
    """Upper 60% carries the energy; the bottom stays quiet because case
    metadata stacks over it on mobile.

    The falloff is deliberately wide and leaves a residual. A tighter grade
    (0.50→0.68, down to 6%) was measured and rendered: it clears contrast
    easily but the bottom 40% of the 16:10 frame goes flat black, so the frame
    reads as letterboxed rather than as a field receding. Verified headroom is
    14.7:1 against a 4.5 floor, so a faint lower presence is affordable — it
    buys depth for luminance the contract does not need.
    """
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / (width - 1)
    y = ys / (height - 1)
    m = 1.0 - 0.86 * smoothstep(0.34, 0.84, y)
    # Soften both vertical edges so the loop does not read as a hard band.
    m *= 0.35 + 0.65 * smoothstep(0.0, 0.18, x) * smoothstep(1.0, 0.82, x)
    return np.clip(m, 0.0, 1.0)


SEQUENCES = [
    # id, aspect, frames, widths, mask fn, ribbons, poster frame, seed
    # poster frame MUST equal `posterFrame` in lib/sequences.ts — verified.
    ("hero", 16 / 9, 180, [375, 768, 1440], hero_mask, HERO_RIBBONS, 1, 11),
    ("case-01", 16 / 10, 60, [375, 960], case_mask, CASE_RIBBONS, 1, 21),
    ("case-02", 16 / 10, 60, [375, 960], case_mask, CASE_RIBBONS, 1, 22),
    ("case-03", 16 / 10, 60, [375, 960], case_mask, CASE_RIBBONS, 1, 23),
]

# Per-sequence character. Only ONE control varies between the three cases —
# overall intensity — because giving each its own seed, density and colour bias
# produced three unrelated designs last time. They must read as one material.
INTENSITY = {"hero": 1.00, "case-01": 0.92, "case-02": 1.00, "case-03": 0.86}


def prune(out_dir: Path, count: int) -> int:
    """Delete anything in `out_dir` that is not one of the frames we just wrote.

    This directory lives under an iCloud-synced Desktop. Deleting the frames and
    re-rendering races the sync daemon, which restores the old files under a
    conflict name — `frame_0090 2.webp` alongside `frame_0090.webp`. The
    manifest only ever requests `frame_NNNN.webp`, so the forks are never
    fetched and the site looks fine; they simply double the directory on disk
    and in git. A previous run left 706 of them, 3.9 MB of stale placeholder.

    `rm -rf` before rendering does not prevent it — the restore lands after. So
    prune afterwards instead, and check the count.
    """
    keep = {f"frame_{i:04d}.webp" for i in range(1, count + 1)}
    removed = 0
    for f in out_dir.iterdir():
        if f.name not in keep:
            f.unlink()
            removed += 1
    return removed


def main() -> None:
    for seq_id, aspect, count, widths, mask_fn, ribbons, poster_frame, seed in SEQUENCES:
        gain = INTENSITY[seq_id]
        for width in widths:
            height = int(round(width / aspect))
            # Height must be even for predictable scaling; nudge if not.
            height += height % 2
            out_dir = SEQ_DIR / seq_id / str(width)
            out_dir.mkdir(parents=True, exist_ok=True)
            mask = mask_fn(width, height) * gain

            for i in range(1, count + 1):
                t = (i - 1) / count  # 0 .. (n-1)/n so frame n+1 == frame 1
                rgb = render(width, height, t, ribbons, mask, seed + i)
                img = Image.fromarray((rgb * 255.0 + 0.5).astype(np.uint8), "RGB")
                img.save(out_dir / f"frame_{i:04d}.webp", "WEBP", quality=72, method=4)

            print(f"  {seq_id}/{width}  {count} frames  {width}x{height}")

        # Poster: a byte-identical copy of the frame the manifest declares.
        #
        # It used to be re-rendered from its own frame index at a different
        # quality, which let it drift: the manifest said posterFrame 1 while
        # the file held frame 90. That is visible — FrameSequence publishes
        # `manifest.posterFrame` to the timecode readout whenever the draw loop
        # is not running, so the page announced "FRAME 001" over frame 90's
        # image. Copying makes the declaration true by construction, and
        # verify-frames.py compares the bytes so it cannot drift again.
        src = SEQ_DIR / seq_id / str(widths[-1]) / f"frame_{poster_frame:04d}.webp"
        shutil.copyfile(src, SEQ_DIR / seq_id / "poster.webp")
        print(f"  {seq_id}/poster.webp  <- {src.name}")


if __name__ == "__main__":
    main()
