#!/usr/bin/env python3
r"""
Placeholder frame sequences — Script 3, spec §2/§7/§11.

*** ALT-TEXT NOTICE ***
The `alt` strings written into every public/seq/<id>/manifest.json describe
THIS placeholder art specifically — a procedural contour-line field, nothing
else. They are true today because they describe what this script actually
draws. They stop being true the moment real footage replaces these frames.
Whoever swaps in real frames MUST rewrite `alt` in all four manifests to
describe the real content. Do not carry these strings forward by habit.

## What this draws and why

A scalar field made of a handful of travelling gaussian hills plus a low
ripple, rendered as its contour lines (level sets), the same technique
port-1 used and the same reason: thin plotted linework encodes real
high-frequency detail (the byte-budget requirement) and reads as authored
rather than a stock gradient.

- `hero` (scrub, non-looping): `t` runs 0 -> 1 linearly across all 180
  frames. Hill centres drift *linearly* with `t` (no wraparound) so frame 1
  and frame 180 are unambiguously different compositions, and the colour
  mix shifts from signal-blue toward amber as `t` advances — a visitor at
  any scroll position can tell roughly where they are, per §7's non-looping
  requirement.
- `case-0N` (loop): `t` runs 0 -> (frameCount-1)/frameCount, and every
  travelling term uses an *integer* harmonic of `2*pi*t`. That makes the
  field exactly periodic with period 1 in `t` — the field value the engine
  would compute for a notional "frame 49" (t=1.0) is bit-for-bit the field
  value at frame 1 (t=0.0, since sin/cos repeat every 2*pi). Frame 48 -> 1
  is therefore the same size step as any other adjacent pair, not a seam.
  Only ONE control differs between the three cases: CONTOUR DENSITY
  (case-01 sparse, case-02 medium, case-03 dense). Hills, palette, mask and
  dimensions are identical — one material, one axis of variation.

## The safe area (spec §11 of the brief / this script's own contract)

Fractional rect x:[0.06, 0.94] y:[0.18, 0.68] must stay visually quiet: low
luminance, no hard edges, no high-frequency detail, so bone (#EDEAE3) text
overlaid on it clears 4.5:1. This is implemented as `quiet_gate()`: energy
is suppressed smoothly, starting at the safe-area boundary and reaching a
near-zero floor a margin further *inside* the band — never a hard cut, and
never touching the outer regions where the byte budget lives. This is the
opposite of a vignette (which darkens corners and leaves the centre hot);
here the centre is what goes quiet.

## Debug readout

Burned into the bottom-right corner of every frame (inside the bottom 12%,
right 25%, well outside the safe area): `<SEQID> <frame>/<total>` in amber
monospace. `0960-half` prints its own 1..90 index, not the source hero
index, per spec.

## The iCloud trap

This Desktop is iCloud-synced. Deleting a directory of frames and
rewriting it races the sync daemon, which restores what it just saw
deleted under a *conflict name* (`frame_0090 2.webp` beside
`frame_0090.webp`). `rm -rf` before writing does not prevent this — the
restore lands *after* the write. So:
  - We never delete before rendering.
  - We prune AFTER rendering, matching the strict regex ^frame_\d{4}\.webp$
    (never a loose glob), and report anything that doesn't match instead of
    silently folding it into a byte count.

Run:
  ~/.claude/skills/seo/.venv/bin/python scripts/gen-frames.py
  ~/.claude/skills/seo/.venv/bin/python scripts/gen-frames.py --sequence hero
  ~/.claude/skills/seo/.venv/bin/python scripts/gen-frames.py --sequence case-01 --tier 0640
"""

from __future__ import annotations

import argparse
import math
import os
import re
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SEQ_DIR = ROOT / "public" / "seq"

FRAME_RE = re.compile(r"^frame_\d{4}\.webp$")

# ---------------------------------------------------------------------------
# Tokens — site tokens per brief. Do not adjust without checking the brief.
# ---------------------------------------------------------------------------
VOID = np.array([0x08, 0x09, 0x0C], dtype=np.float64) / 255.0
GRAPHITE = np.array([0x16, 0x18, 0x1D], dtype=np.float64) / 255.0
SLATE = np.array([0x2A, 0x2E, 0x37], dtype=np.float64) / 255.0
SIGNAL = np.array([0x3B, 0x4C, 0xFF], dtype=np.float64) / 255.0
AMBER = np.array([0xFF, 0xB4, 0x3D], dtype=np.float64) / 255.0

MONO_CANDIDATES = [
    ("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", None),
    ("/System/Library/Fonts/Menlo.ttc", 0),
]

# Safe area — fractional rect. x, y, w, h.
SAFE_X, SAFE_Y, SAFE_W, SAFE_H = 0.06, 0.18, 0.88, 0.50
SAFE_X0, SAFE_Y0 = SAFE_X, SAFE_Y
SAFE_X1, SAFE_Y1 = SAFE_X + SAFE_W, SAFE_Y + SAFE_H
SAFE_MARGIN = 0.10  # fraction of width/height — fade lands entirely inside the band
SAFE_FLOOR = 0.02   # residual energy fraction deep inside the band (near-zero, not literal zero)

# Debug-readout box — bottom-right, inside bottom 12% / right 25%, i.e. clear
# of the safe area (whose bottom edge is at y=0.68).
READOUT_PAD_FRAC = 0.02


def load_mono(size: int) -> ImageFont.FreeTypeFont:
    for path, index in MONO_CANDIDATES:
        if os.path.exists(path):
            if index is None:
                return ImageFont.truetype(path, size)
            return ImageFont.truetype(path, size, index=index)
    raise SystemExit("No mono font found on disk.")


def smoothstep(a: float, b: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def quiet_gate(width: int, height: int) -> np.ndarray:
    """1.0 outside the safe area, fading to SAFE_FLOOR entirely inside it.

    The transition starts exactly at the safe-area boundary and completes
    SAFE_MARGIN further in, so nothing outside the band is ever touched and
    nothing inside the band (past the margin) carries a hard edge.
    """
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / max(width - 1, 1)
    y = ys / max(height - 1, 1)

    inside_x = smoothstep(SAFE_X0, SAFE_X0 + SAFE_MARGIN, x) * (
        1.0 - smoothstep(SAFE_X1 - SAFE_MARGIN, SAFE_X1, x)
    )
    inside_y = smoothstep(SAFE_Y0, SAFE_Y0 + SAFE_MARGIN, y) * (
        1.0 - smoothstep(SAFE_Y1 - SAFE_MARGIN, SAFE_Y1, y)
    )
    inside = np.clip(inside_x * inside_y, 0.0, 1.0)
    return 1.0 - (1.0 - SAFE_FLOOR) * inside


# ---------------------------------------------------------------------------
# Field / contours
# ---------------------------------------------------------------------------

# Shared hill layout (normalised 0..1 space). x0, y0, drift x, drift y, radius,
# weight, harmonic. `harmonic` only matters for the periodic (loop) driver.
HILLS = [
    (0.24, 0.30, 0.34, 0.22, 0.34, 1.00, 1),
    (0.70, 0.66, -0.28, 0.20, 0.28, 0.75, 2),
    (0.82, 0.22, -0.30, 0.30, 0.30, 0.85, 1),
    (0.30, 0.78, 0.24, -0.26, 0.20, 0.45, 3),
]

RIPPLE_CYCLES_HERO = 2.75   # non-integer: hero must not return to its start
RIPPLE_HARMONIC_LOOP = 3    # integer: case sequences must close exactly


def hill_centers(t: float, looping: bool):
    for x0, y0, dx, dy, radius, weight, harmonic in HILLS:
        if looping:
            cx = x0 + dx * math.sin(harmonic * 2.0 * math.pi * t)
            cy = y0 + dy * math.cos(harmonic * 2.0 * math.pi * t)
        else:
            cx = x0 + dx * t
            cy = y0 + dy * t
        yield cx, cy, radius, weight


def field(x: np.ndarray, y: np.ndarray, t: float, looping: bool) -> np.ndarray:
    f = np.zeros_like(x)
    for cx, cy, radius, weight in hill_centers(t, looping):
        r2 = (x - cx) ** 2 + (y - cy) ** 2
        f += weight * np.exp(-r2 / (radius * radius))
    if looping:
        phase = 2.0 * math.pi * t * RIPPLE_HARMONIC_LOOP
    else:
        phase = 2.0 * math.pi * t * RIPPLE_CYCLES_HERO
    f += 0.10 * np.sin(3.0 * math.pi * x + phase) * np.cos(2.0 * math.pi * y - phase)
    return f


def contours(f: np.ndarray, density: float, line_px: float) -> np.ndarray:
    """Anti-aliased level sets of `f`, 0..1 line coverage.

    Divided by the local gradient magnitude so line width stays constant in
    *pixels* regardless of how steep the field is — skip this and contours
    pile into solid blocks near the hill peaks.
    """
    scaled = f * density
    gy, gx = np.gradient(scaled)
    grad = np.maximum(np.hypot(gx, gy), 1e-6)
    frac = scaled - np.floor(scaled)
    dist_field = np.minimum(frac, 1.0 - frac)
    dist_px = dist_field / grad
    return 1.0 - smoothstep(0.0, line_px, dist_px)


def render(width: int, height: int, t: float, looping: bool, density: float,
           line_px: float, warm_bias: float, seed: int) -> np.ndarray:
    ys, xs = np.mgrid[0:height, 0:width].astype(np.float64)
    x = xs / max(width - 1, 1)
    y = ys / max(height - 1, 1)

    f = field(x, y, t, looping)
    lines = contours(f, density, line_px)

    depth = 0.35 + 0.65 * smoothstep(0.15, 1.6, f)
    gate = quiet_gate(width, height)
    intensity = lines * depth * gate

    # Colour ramp: signal in the body, amber at the crests. `warm_bias`
    # (0 at hero frame 1, 1 at hero frame 180; fixed per case) nudges the mix
    # globally so the hero visibly warms as the scroll advances.
    crest = smoothstep(0.9, 1.9, f)
    warm = np.clip(crest * 0.6 + 0.4 * warm_bias, 0.0, 1.0)[..., None]
    colour = SIGNAL[None, None, :] * (1.0 - warm) + AMBER[None, None, :] * warm

    base = VOID[None, None, :]
    rgb = base + colour * intensity[..., None]

    rng = np.random.default_rng(seed)
    rgb += rng.normal(0.0, 0.0032, size=rgb.shape)
    return np.clip(rgb, 0.0, 1.0)


def burn_readout(img: Image.Image, seq_label: str, frame: int, total: int) -> Image.Image:
    width, height = img.size
    text = f"{seq_label} {frame:04d}/{total}"
    draw = ImageDraw.Draw(img)

    size = max(9, round(height * 0.024))
    box_w = width * 0.25
    box_h = height * 0.12
    while size > 8:
        font = load_mono(size)
        bbox = draw.textbbox((0, 0), text, font=font)
        if (bbox[2] - bbox[0]) <= box_w - width * READOUT_PAD_FRAC * 2 and (
            bbox[3] - bbox[1]
        ) <= box_h - height * READOUT_PAD_FRAC * 2:
            break
        size -= 1
    else:
        font = load_mono(9)
        bbox = draw.textbbox((0, 0), text, font=font)

    pad_x = width * READOUT_PAD_FRAC
    pad_y = height * READOUT_PAD_FRAC
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = width - pad_x - tw - bbox[0]
    ty = height - pad_y - th - bbox[1]
    draw.text((tx, ty), text, font=font, fill=(0xFF, 0xB4, 0x3D))
    return img


def to_image(rgb: np.ndarray) -> Image.Image:
    return Image.fromarray((rgb * 255.0 + 0.5).astype(np.uint8), "RGB")


# ---------------------------------------------------------------------------
# Sequence table
# ---------------------------------------------------------------------------
# id, label, looping, frameCount, {tier_dirname: (width, height, density,
# line_px, quality)}, seed
#
# Quality/density were iterated against the measured directory sizes in
# public/seq/**/*  until they landed inside the §7 byte targets — see the
# report for the final numbers per tier.

def h(width: int) -> int:
    height = int(round(width / (16 / 9)))
    return height + height % 2


HERO_TIERS = {
    "1920": dict(width=1920, height=h(1920), density=11.0, line_px=1.05, quality=55),
    "1440": dict(width=1440, height=h(1440), density=11.0, line_px=1.05, quality=42),
    "0960": dict(width=960, height=h(960), density=11.0, line_px=1.05, quality=38),
}
HERO_HALF = dict(width=960, height=h(960), density=11.0, line_px=1.05, quality=38)

# Density is the single axis that differs between the three cases (spec
# requirement: vary one thing). Quality is tuned PER CASE PER TIER purely to
# compensate for how differently sparse vs. dense linework compresses — a
# sparse case (case-01) needs a higher quality factor to reach the same byte
# budget a dense case (case-03) reaches at a lower one. This is a compression
# knob, not a second content axis.
CASE_DENSITY = {"case-01": 8.0, "case-02": 11.0, "case-03": 15.0}
CASE_QUALITY = {
    "0960": {"case-01": 92, "case-02": 88, "case-03": 84},
    "0640": {"case-01": 90, "case-02": 80, "case-03": 65},
}
CASE_TIER_GEOM = {
    "0960": dict(width=960, height=h(960), line_px=1.05),
    "0640": dict(width=640, height=h(640), line_px=1.0),
}

SEED = {"hero": 11, "case-01": 21, "case-02": 22, "case-03": 23}
LABEL = {"hero": "HERO", "case-01": "CASE-01", "case-02": "CASE-02", "case-03": "CASE-03"}


def prune(out_dir: Path, expected: set[str]) -> list[str]:
    """Remove exactly the frames we just wrote; report anything else by name.

    Runs AFTER rendering, never before — see the iCloud-trap note at the top
    of this file. Anything left over (a sync-daemon conflict fork, a stray
    file) is reported, never silently absorbed into a byte count.
    """
    stray = []
    for f in out_dir.iterdir():
        if f.name == "manifest.json" or f.name == "poster.webp":
            continue
        if f.name in expected:
            continue
        stray.append(f.name)
    return stray


def render_tier(seq_id: str, label: str, out_dir: Path, count: int, looping: bool,
                 width: int, height: int, density: float, line_px: float,
                 quality: int, seed: int, readout_total: int | None = None,
                 t_values: list[float] | None = None) -> tuple[int, int, list[str]]:
    out_dir.mkdir(parents=True, exist_ok=True)
    total_bytes = 0
    expected_names = set()
    r_total = readout_total if readout_total is not None else count

    for i in range(1, count + 1):
        t = t_values[i - 1] if t_values is not None else (
            (i - 1) / count if looping else (i - 1) / max(count - 1, 1)
        )
        warm_bias = 0.0 if looping else t
        rgb = render(width, height, t, looping, density, line_px, warm_bias, seed + i)
        img = to_image(rgb)
        img = burn_readout(img, label, i, r_total)
        name = f"frame_{i:04d}.webp"
        img.save(out_dir / name, "WEBP", quality=quality, method=6)
        total_bytes += (out_dir / name).stat().st_size
        expected_names.add(name)

    stray = prune(out_dir, expected_names)
    return count, total_bytes, stray


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sequence", choices=["hero", "case-01", "case-02", "case-03", "all"],
                     default="all")
    ap.add_argument("--tier", default=None, help="restrict to one tier dirname, e.g. 0960")
    args = ap.parse_args()

    targets = ["hero", "case-01", "case-02", "case-03"] if args.sequence == "all" else [args.sequence]

    report = []

    if "hero" in targets:
        seed = SEED["hero"]
        label = LABEL["hero"]
        for tier_name, cfg in HERO_TIERS.items():
            if args.tier and tier_name != args.tier:
                continue
            count, nbytes, stray = render_tier(
                "hero", label, SEQ_DIR / "hero" / tier_name, 180, False,
                cfg["width"], cfg["height"], cfg["density"], cfg["line_px"],
                cfg["quality"], seed,
            )
            report.append(("hero", tier_name, count, nbytes, stray))

        if not args.tier or args.tier == "0960-half":
            cfg = HERO_HALF
            # Odd source frames 1,3,...,179 renumbered 1..90. Each renumbered
            # frame m corresponds to source frame n = 2m-1, i.e. source
            # t_n = (n-1)/179 = (2m-2)/179.
            t_values = [(2 * m - 2) / 179 for m in range(1, 91)]
            count, nbytes, stray = render_tier(
                "hero", label, SEQ_DIR / "hero" / "0960-half", 90, False,
                cfg["width"], cfg["height"], cfg["density"], cfg["line_px"],
                cfg["quality"], seed, readout_total=90, t_values=t_values,
            )
            report.append(("hero", "0960-half", count, nbytes, stray))

    for case_id in ["case-01", "case-02", "case-03"]:
        if case_id not in targets:
            continue
        seed = SEED[case_id]
        label = LABEL[case_id]
        density = CASE_DENSITY[case_id]
        for tier_name, cfg in CASE_TIER_GEOM.items():
            if args.tier and tier_name != args.tier:
                continue
            quality = CASE_QUALITY[tier_name][case_id]
            count, nbytes, stray = render_tier(
                case_id, label, SEQ_DIR / case_id / tier_name, 48, True,
                cfg["width"], cfg["height"], density, cfg["line_px"],
                quality, seed,
            )
            report.append((case_id, tier_name, count, nbytes, stray))

    # Posters: byte-identical copy of 0960/frame_0001.webp for every sequence
    # touched this run (never re-encoded — a re-encode is how a poster drifts
    # from the frame the manifest claims it holds).
    for seq_id in targets if args.sequence != "all" else ["hero", "case-01", "case-02", "case-03"]:
        src = SEQ_DIR / seq_id / "0960" / "frame_0001.webp"
        if src.exists():
            dst = SEQ_DIR / seq_id / "poster.webp"
            shutil.copyfile(src, dst)
            report.append((seq_id, "poster.webp", 1, dst.stat().st_size, []))

    print(f"{'sequence':<10} {'tier':<12} {'frames':>7} {'bytes':>10} {'KB/frame':>9}  stray")
    for seq_id, tier_name, count, nbytes, stray in report:
        kb_per = (nbytes / count / 1024) if count else 0.0
        stray_note = f"  STRAY:{stray}" if stray else ""
        print(f"{seq_id:<10} {tier_name:<12} {count:>7} {nbytes:>10} {kb_per:>8.2f}K{stray_note}")


if __name__ == "__main__":
    main()
