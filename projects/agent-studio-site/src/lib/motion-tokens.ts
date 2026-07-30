/**
 * TypeScript mirror of the motion tokens in globals.css.
 *
 * GSAP and Motion take easings as arrays/functions, not CSS strings, so the
 * values have to exist in both places. They are the same numbers — if you
 * change one, change the other. There is no runtime that can enforce this,
 * so it is called out here and in globals.css.
 */

/** Cubic-bezier control points, in the [x1, y1, x2, y2] form both GSAP and Motion accept. */
export const EASE = {
  /** Default for entrances and camera arrivals. Fast start, long settle. */
  outExpo: [0.16, 1, 0.3, 1],
  /** Slightly gentler than outExpo. Hover and small state changes. */
  outQuart: [0.25, 1, 0.5, 1],
  /** Symmetric. Route transitions and anything that leaves and returns. */
  inOutQuart: [0.76, 0, 0.24, 1],
  /** Overshoots. Magnetic buttons and cursor snapping only — never text. */
  spring: [0.34, 1.56, 0.64, 1],
} as const satisfies Record<string, [number, number, number, number]>;

/** Seconds — GSAP and Motion both work in seconds, unlike CSS. */
export const DURATION = {
  instant: 0.12,
  fast: 0.24,
  base: 0.4,
  slow: 0.7,
  reveal: 1.0,
} as const;

/** Stagger steps for grouped reveals, in seconds. */
export const STAGGER = {
  /** Words within a line. */
  tight: 0.02,
  /** Lines within a heading. */
  line: 0.08,
  /** Cards in a grid, list items. */
  item: 0.06,
} as const;

/**
 * Distance a masked line travels on reveal, as a fraction of its own height.
 * Slightly over 1 so the line clears its mask before easing out, which reads
 * as intentional rather than as a clipping bug.
 */
export const REVEAL_OFFSET = 1.1;
