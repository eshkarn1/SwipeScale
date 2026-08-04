#!/usr/bin/env python3
"""
Placeholder frame sequences — spec §9.

ImageMagick is not available in this environment, so the `magick` loop in the
spec is reimplemented with Pillow. Output is byte-compatible with the manifest
contract in lib/sequences.ts, so real renders from Script 3 are a drop-in
replacement:

    public/seq/<id>/<width>/frame_0001.webp   1-based, 4 digits
    public/seq/<id>/poster.webp               same dimensions as the frames

These are meant to read as placeholders. Each frame carries:
  - the mono label  "HERO 043 / 180"  in signal blue on graphite
  - a progress bar across the bottom whose width tracks frame/total
  - a sweeping vertical tick and a drifting label baseline, so that scrubbing
    is visibly driving the sequence during QA rather than "maybe working".

The label sits in the upper fifth of the frame, not at its centre. The hero
headline block occupies the vertical centre at every breakpoint, and a centred
label printed straight across the words. It is also held inside a narrow
horizontal safe area, because the hero frame is 16:9 rendered `cover` into a
tall phone viewport: at 390x844 only the central ~26% of the frame's width
survives the crop, and anything wider than that is cut in half.

Run:  ~/.claude/skills/seo/.venv/bin/python scripts/gen-placeholder-frames.py
"""

from __future__ import annotations

import math
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SEQ_DIR = ROOT / "public" / "seq"

# Tokens — spec §4. Do not adjust.
GRAPHITE = "#16181D"
SIGNAL = "#3B4CFF"
SLATE = "#2A2E37"

MONO_CANDIDATES = [
    ("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", None),
    ("/System/Library/Fonts/Menlo.ttc", 0),
]

# Mirrors SEQUENCES in lib/sequences.ts.
# id, label, frames, width, height, poster, label safe-area fraction.
#
# The safe-area fraction is the share of the frame's width the label may
# occupy. The hero is drawn full-bleed `cover` from 16:9, so a 390x844 phone
# only ever shows the central 26% of it — 0.24 keeps the label whole there.
# The case sequences are 16:10 rendered into a 16:10 box and are never cropped,
# so they can afford a larger, more legible label.
SEQUENCES = [
    ("hero", "HERO", 180, 1440, 810, 1, 0.24),
    ("case-01", "CASE 01", 60, 960, 600, 1, 0.44),
    ("case-02", "CASE 02", 60, 960, 600, 1, 0.44),
    ("case-03", "CASE 03", 60, 960, 600, 1, 0.44),
]

WEBP = {"format": "WEBP", "quality": 70, "method": 4}

# Label placement, as fractions of frame height. The centre is the headline's;
# the top fifth is clear of it at 1440, 1024 and 375.
LABEL_TOP_FRACTION = 0.22
LABEL_DRIFT_FRACTION = 0.035


def load_mono(size: int) -> ImageFont.FreeTypeFont:
    for path, index in MONO_CANDIDATES:
        if os.path.exists(path):
            if index is None:
                return ImageFont.truetype(path, size)
            return ImageFont.truetype(path, size, index=index)
    raise SystemExit("No mono font found on disk.")


def label_text(label: str, frame: int, total: int) -> str:
    return f"{label} {frame:03d} / {total}"


def fit_label_font(text: str, width: int, safe_fraction: float) -> ImageFont.FreeTypeFont:
    """
    Largest mono size whose rendered label still fits the horizontal safe area.
    The frame number is zero-padded and the total is fixed, so the string length
    is constant across a sequence and this only needs solving once per sequence.
    """
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    limit = width * safe_fraction
    size = max(14, width // 22)
    while size > 14:
        font = load_mono(size)
        box = probe.textbbox((0, 0), text, font=font)
        if box[2] - box[0] <= limit:
            return font
        size -= 1
    return load_mono(14)


def draw_frame(
    label: str,
    frame: int,
    total: int,
    width: int,
    height: int,
    big: ImageFont.FreeTypeFont,
) -> Image.Image:
    image = Image.new("RGB", (width, height), GRAPHITE)
    draw = ImageDraw.Draw(image)

    progress = (frame - 1) / max(total - 1, 1)

    # Sweeping tick — the unambiguous "the frame index changed" signal.
    tick_x = int(round(progress * (width - 1)))
    draw.line([(tick_x, 0), (tick_x, height)], fill=SLATE, width=2)

    # Label: horizontally centred inside the safe area, parked in the upper
    # fifth clear of the headline, drifting vertically so that consecutive
    # frames never look identical.
    text = label_text(label, frame, total)
    drift = math.sin(progress * math.tau * 2) * (height * LABEL_DRIFT_FRACTION)
    centre_y = height * LABEL_TOP_FRACTION + drift
    box = draw.textbbox((0, 0), text, font=big)
    draw.text(
        (
            (width - (box[2] - box[0])) / 2 - box[0],
            centre_y - (box[3] - box[1]) / 2 - box[1],
        ),
        text,
        font=big,
        fill=SIGNAL,
    )

    # Progress bar, width tracks frame/total.
    bar_h = max(4, height // 135)
    draw.rectangle([0, height - bar_h, width - 1, height - 1], fill=SLATE)
    draw.rectangle([0, height - bar_h, int(round(progress * (width - 1))), height - 1], fill=SIGNAL)

    return image


def main() -> None:
    total_bytes = 0
    total_files = 0

    for seq_id, label, count, width, height, poster_frame, safe_fraction in SEQUENCES:
        rendition = SEQ_DIR / seq_id / str(width)
        rendition.mkdir(parents=True, exist_ok=True)

        big = fit_label_font(label_text(label, count, count), width, safe_fraction)

        for frame in range(1, count + 1):
            image = draw_frame(label, frame, count, width, height, big)
            path = rendition / f"frame_{frame:04d}.webp"
            image.save(path, **WEBP)
            total_bytes += path.stat().st_size
            total_files += 1

            if frame == poster_frame:
                poster = SEQ_DIR / seq_id / "poster.webp"
                image.save(poster, **WEBP)
                total_bytes += poster.stat().st_size
                total_files += 1

        print(
            f"{seq_id}: {count} frames + poster at {width}x{height}, "
            f"label {big.size}px within central {safe_fraction:.0%}"
        )

    print(f"\n{total_files} files, {total_bytes} bytes ({total_bytes / 1_048_576:.2f} MiB)")


if __name__ == "__main__":
    main()
