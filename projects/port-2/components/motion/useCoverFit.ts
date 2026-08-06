/**
 * `object-fit: cover` maths.  (Spec §4)
 *
 * `object-fit` does not apply to canvas CONTENTS — it only affects how the
 * canvas element itself is scaled. The rect has to be computed.
 */

export interface CoverRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * @param cw canvas CSS width
 * @param ch canvas CSS height
 * @param iw source intrinsic width
 * @param ih source intrinsic height
 */
export function coverRect(cw: number, ch: number, iw: number, ih: number): CoverRect {
  const scale = Math.max(cw / iw, ch / ih);
  const w = iw * scale;
  const h = ih * scale;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

/**
 * Allocation-free variant for the draw loop. The draw runs once per animation
 * frame and a fresh object each time is 60 short-lived allocations a second
 * competing with decode for the same GC — cheap individually, but the §7 budget
 * is "zero long tasks over 50 ms" and this is free to avoid.
 */
export function coverRectInto(
  cw: number,
  ch: number,
  iw: number,
  ih: number,
  out: CoverRect,
): CoverRect {
  const scale = Math.max(cw / iw, ch / ih);
  out.w = iw * scale;
  out.h = ih * scale;
  out.x = (cw - out.w) / 2;
  out.y = (ch - out.h) / 2;
  return out;
}
