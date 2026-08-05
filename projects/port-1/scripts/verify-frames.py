#!/usr/bin/env python3
"""
Proves the frame sequences satisfy their safe-area contract. Exit 1 on failure.

Run:  ~/.claude/skills/seo/.venv/bin/python scripts/verify-frames.py

`safeArea` in lib/sequences.ts marks the region DOM copy sits over. Bone
#EDEAE3 must clear 4.5:1 against it. This checks **every frame at every
rendition**, not a sample — the README's definition of done calls for the
busiest frame, and the only way to know which one that is, is to measure all
of them.

The safe-area rectangles are parsed out of lib/sequences.ts rather than
restated here. A documented number nobody recomputes is a number that drifts;
if the manifest changes, this follows it.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SEQ_DIR = ROOT / "public" / "seq"
MANIFEST = ROOT / "lib" / "sequences.ts"

FRAME_RE = re.compile(r"frame_\d{4}\.webp")

BONE_L = 0.7900  # relative luminance of #EDEAE3
FLOOR = 4.5


def parse_manifest() -> dict[str, dict]:
    """Pull id, widths and safeArea straight out of the TS manifest."""
    src = MANIFEST.read_text()
    # Each entry looks like:  id: "hero", ... widths: [375, 768, 1440], ...
    #                         safeArea: { x: 0, y: 0.22, w: 0.6, h: 0.74 },
    blocks = re.findall(
        r'id:\s*"([\w-]+)".*?widths:\s*\[([\d,\s]+)\].*?posterFrame:\s*(\d+).*?'
        r"safeArea:\s*\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+),\s*w:\s*([\d.]+),\s*h:\s*([\d.]+)\s*\}",
        src,
        re.S,
    )
    out = {}
    for seq_id, widths, poster_frame, x, y, w, h in blocks:
        out[seq_id] = {
            "widths": [int(v) for v in widths.split(",") if v.strip()],
            "posterFrame": int(poster_frame),
            "safe": (float(x), float(y), float(w), float(h)),
        }
    return out


def luminance(arr: np.ndarray) -> np.ndarray:
    c = arr.astype(np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return lin[..., 0] * 0.2126 + lin[..., 1] * 0.7152 + lin[..., 2] * 0.0722


def main() -> int:
    manifest = parse_manifest()
    if not manifest:
        print("FAIL  could not parse lib/sequences.ts", file=sys.stderr)
        return 1

    failures: list[str] = []
    print(f"{'sequence':<12} {'width':>6} {'frames':>7} {'worst frame':>12} "
          f"{'max L':>8} {'contrast':>9}  {'bytes':>10}")
    print("-" * 74)

    for seq_id, info in manifest.items():
        sx, sy, sw, sh = info["safe"]
        for width in info["widths"]:
            d = SEQ_DIR / seq_id / str(width)
            # Strict match, not glob("frame_*.webp"). This directory is on an
            # iCloud-synced Desktop, which forks re-rendered files under a
            # conflict name — `frame_0090 2.webp` next to `frame_0090.webp`.
            # A loose glob measures those stale copies as though they shipped.
            # It caught them once (3.54:1 on restored placeholder frames), but
            # reporting them as a contrast failure of the *current* render is
            # misleading — they are a different defect and get named as one.
            everything = sorted(p for p in d.iterdir() if p.is_file())
            frames = [p for p in everything if FRAME_RE.fullmatch(p.name)]
            stray = [p.name for p in everything if not FRAME_RE.fullmatch(p.name)]
            if stray:
                failures.append(
                    f"{seq_id}/{width}: {len(stray)} non-conforming file(s), "
                    f"e.g. {stray[0]!r} — likely iCloud conflict forks; "
                    f"re-run render-frames.py, which prunes them"
                )
            if not frames:
                failures.append(f"{seq_id}/{width}: no frames on disk")
                continue

            worst_l, worst_name, total = -1.0, "", 0
            for f in frames:
                total += f.stat().st_size
                try:
                    a = np.asarray(Image.open(f).convert("RGB"))
                except (OSError, TimeoutError) as exc:
                    # iCloud evicts files and materialises them on read; a cold
                    # one can time out. That is not a contrast result either way.
                    failures.append(f"{seq_id}/{width}: could not read {f.name}: {exc}")
                    continue
                h, w = a.shape[:2]
                y0, y1 = int(sy * h), int((sy + sh) * h)
                x0, x1 = int(sx * w), int((sx + sw) * w)
                m = luminance(a[y0:y1, x0:x1]).max()
                if m > worst_l:
                    worst_l, worst_name = m, f.name

            contrast = (BONE_L + 0.05) / (worst_l + 0.05)
            flag = "" if contrast >= FLOOR else "   <-- FAIL"
            if contrast < FLOOR:
                failures.append(
                    f"{seq_id}/{width}: {contrast:.2f}:1 at {worst_name} (floor {FLOOR})"
                )
            print(f"{seq_id:<12} {width:>6} {len(frames):>7} {worst_name:>12} "
                  f"{worst_l:>8.4f} {contrast:>8.2f}:1  {total:>10,}{flag}")

        # The poster must BE the frame the manifest declares. FrameSequence
        # publishes `manifest.posterFrame` to the timecode whenever the draw
        # loop is idle, so a poster holding some other frame makes the page
        # announce a number that does not match the image on screen. Compare
        # the bytes rather than trusting the renderer.
        poster = SEQ_DIR / seq_id / "poster.webp"
        if not poster.exists():
            failures.append(f"{seq_id}: poster.webp missing")
        else:
            pf = info["posterFrame"]
            declared = SEQ_DIR / seq_id / str(info["widths"][-1]) / f"frame_{pf:04d}.webp"
            if not declared.exists():
                failures.append(f"{seq_id}: posterFrame {pf} has no frame file")
            elif poster.read_bytes() != declared.read_bytes():
                failures.append(
                    f"{seq_id}: poster.webp is not frame_{pf:04d}.webp "
                    f"({poster.stat().st_size:,} vs {declared.stat().st_size:,} bytes) — "
                    f"the timecode will announce frame {pf} over a different image"
                )

    print()
    if failures:
        print("FAILURES:", file=sys.stderr)
        for f in failures:
            print(f"  {f}", file=sys.stderr)
        return 1
    print(f"PASS  every frame clears {FLOOR}:1 for bone inside its safe area.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
