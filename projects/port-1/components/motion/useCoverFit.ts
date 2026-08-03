// PLACEHOLDER — owned by Script 2 (motion engine). Public API is contractual; implementation is not.

import type { CoverFitRect } from "./types";

/**
 * `object-fit: cover` maths for a source of aspect `aspect` (w/h) drawn into a
 * destination box. Pure function — no allocation in a render loop beyond the
 * single returned object, which callers may reuse via `out`.
 */
export function coverFit(
  boxWidth: number,
  boxHeight: number,
  aspect: number,
  out?: CoverFitRect,
): CoverFitRect {
  const target = out ?? { dx: 0, dy: 0, dw: 0, dh: 0 };
  const boxAspect = boxWidth / boxHeight;

  if (boxAspect > aspect) {
    // box is wider than the source — match width, overflow height
    target.dw = boxWidth;
    target.dh = boxWidth / aspect;
  } else {
    target.dh = boxHeight;
    target.dw = boxHeight * aspect;
  }
  target.dx = (boxWidth - target.dw) / 2;
  target.dy = (boxHeight - target.dh) / 2;
  return target;
}

export function useCoverFit(): (
  boxWidth: number,
  boxHeight: number,
  aspect: number,
  out?: CoverFitRect,
) => CoverFitRect {
  return coverFit;
}
