#!/usr/bin/env python3
"""
public/og.jpg — 1200x630 social card.

Built with Pillow from the real brand faces (Bricolage Grotesque Bold and
Martian Mono Regular, fetched as TTF from the Google Fonts API) so the card
matches the site rather than approximating it.

Amber stays reserved for the timecode readout, exactly as on the page: the one
amber line here is the frame counter, in the same bottom-left position the
fixed <Timecode /> occupies.

Usage:
  ~/.claude/skills/seo/.venv/bin/python scripts/gen-og-image.py <font-dir>

<font-dir> must contain Bricolage-Bold.ttf and MartianMono-Regular.ttf.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og.jpg"

WIDTH, HEIGHT = 1200, 630
GUTTER = 76

VOID = "#08090C"
BONE = "#EDEAE3"
AMBER = "#FFB43D"
SLATE = "#2A2E37"

HEADLINE = ["Websites", "that feel", "expensive."]
COUNTER = "FRAME 180 / 180  ·  SWIPE & SCALE"

DISPLAY_SIZE = 116
DISPLAY_LEADING = 0.92
DISPLAY_TRACKING = -0.035  # em, spec §4
MONO_SIZE = 19
MONO_TRACKING = 0.06  # em, spec §4


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: str,
    tracking_em: float,
) -> float:
    """Pillow has no letter-spacing, so advance per glyph. Returns the end x."""
    tracking = tracking_em * font.size
    x, y = xy
    for character in text:
        draw.text((x, y), character, font=font, fill=fill)
        x += font.getlength(character) + tracking
    return x


def main() -> None:
    font_dir = Path(sys.argv[1])
    display = ImageFont.truetype(str(font_dir / "Bricolage-Bold.ttf"), DISPLAY_SIZE)
    mono = ImageFont.truetype(str(font_dir / "MartianMono-Regular.ttf"), MONO_SIZE)

    image = Image.new("RGB", (WIDTH, HEIGHT), VOID)
    draw = ImageDraw.Draw(image)

    line_height = DISPLAY_SIZE * DISPLAY_LEADING
    block_height = line_height * len(HEADLINE)
    counter_baseline = HEIGHT - GUTTER - MONO_SIZE

    top = (counter_baseline - 56 - block_height) / 2 + 8
    for index, line in enumerate(HEADLINE):
        draw_tracked(draw, (GUTTER, top + index * line_height), line, display, BONE, DISPLAY_TRACKING)

    rule_y = counter_baseline - 34
    draw.line([(GUTTER, rule_y), (WIDTH - GUTTER, rule_y)], fill=SLATE, width=1)

    draw_tracked(draw, (GUTTER, counter_baseline), COUNTER, mono, AMBER, MONO_TRACKING)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, format="JPEG", quality=88, optimize=True, progressive=True)
    print(f"{OUT} — {image.size[0]}x{image.size[1]}, {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
