/**
 * Sequence manifest registry + the frame-state pub/sub store.
 *
 * The manifest is the contract between this build (Script 1), the motion engine
 * (Script 2) and the asset pipeline (Script 3). Widening `widths` when higher
 * renditions land on disk must require no change anywhere else.
 *
 * Frame files live at:  public/seq/<id>/<width>/frame_0001.webp   (1-based, 4 digits)
 * Poster lives at:      public/seq/<id>/poster.webp
 */

export type SequenceId = "hero" | "case-01" | "case-02" | "case-03";
export type SequenceMode = "scrub" | "loop";

export interface SequenceManifest {
  id: SequenceId;
  /** shown in the Timecode readout, e.g. "HERO" */
  label: string;
  mode: SequenceMode;
  /** total frames, 1-based */
  frameCount: number;
  /** rendition widths present on disk, ascending */
  widths: number[];
  /** width / height, e.g. 16/9 */
  aspect: number;
  /**
   * 1-based index of the representative frame.
   *
   * `poster.webp` must BE this frame, byte for byte — FrameSequence publishes
   * this number to the timecode readout whenever the draw loop is idle, so a
   * poster holding some other frame makes the page announce a frame it is not
   * showing. scripts/render-frames.py copies rather than re-renders it, and
   * scripts/verify-frames.py compares the bytes.
   */
  posterFrame: number;
  /**
   * aria-label for the canvas (`role="img"`) — the spec §8 text alternative.
   *
   * **Describe the frames that exist, not the concept they illustrate.** These
   * labels previously promised "cold-water catalogue photography moving under
   * a typographic overlay", "specimen letterforms sliding across a foundry
   * specimen page" and "an architectural elevation drifting across the frame".
   * None of that was ever rendered: all four sequences are one abstract
   * contour-line field, identical between the three cases but for brightness.
   *
   * Re-check these whenever the art direction changes. They were corrected
   * once for describing footage that never existed, then went stale again the
   * moment the render changed from soft ribbons to contour lines — a label
   * that was true when written is not true forever.
   *
   * A screen-reader user was being told there were three distinct pieces of
   * photographic, typographic and architectural footage while a sighted user
   * saw three near-identical gradients. That is the studio's own rule against
   * fabricated content, applied to alt text — and it is the more damaging
   * place to break it, because the people relying on it cannot check.
   *
   * The shared material is the right call visually (vary one thing, not four).
   * It is the labels that have to tell the truth about it.
   */
  alt: string;
  /**
   * Region of the frame that must stay visually quiet, as fractions of the
   * frame (0–1, origin top-left). DOM copy sits over this area, so anything
   * high-contrast or busy inside it will collide with type.
   *
   * This exists because the placeholder frames collided with the headline —
   * `HERO 001 / 180` printed straight through the word "that feel" at every
   * breakpoint — and nothing in the repo told the asset pipeline otherwise.
   * The vignette does not solve it: it darkens the corners and leaves the
   * centre at full strength, which is exactly where the headline crosses.
   *
   * "Quiet" means: no hard edges, no text, no high-frequency detail, and
   * luminance low enough that bone (#EDEAE3) clears 4.5:1 over it. A dark
   * graded field or soft out-of-focus material is right; a bright subject or
   * lettering is not.
   */
  safeArea: { x: number; y: number; w: number; h: number };
  frameSrc: (width: number, frame: number) => string;
  posterSrc: string;
}

function padFrame(frame: number): string {
  return String(frame).padStart(4, "0");
}

interface ManifestInput {
  id: SequenceId;
  label: string;
  mode: SequenceMode;
  frameCount: number;
  widths: number[];
  aspect: number;
  posterFrame: number;
  alt: string;
  safeArea: { x: number; y: number; w: number; h: number };
}

function defineSequence(input: ManifestInput): SequenceManifest {
  return {
    ...input,
    frameSrc: (width: number, frame: number) =>
      `/seq/${input.id}/${width}/frame_${padFrame(frame)}.webp`,
    posterSrc: `/seq/${input.id}/poster.webp`,
  };
}

export const SEQUENCES: Record<SequenceId, SequenceManifest> = {
  hero: defineSequence({
    id: "hero",
    label: "HERO",
    mode: "scrub",
    frameCount: 180,
    widths: [375, 768, 1440],
    aspect: 16 / 9,
    posterFrame: 1,
    alt: "A scroll-driven title sequence: concentric contour lines, like a topographic survey, resolving out of darkness on the right while the left stays black for the headline.",
    // Headline block sits bottom-left and measured y=258→744 of a 900px
    // viewport at 1440, so it crosses the vignette's transparent centre band.
    // Left 60%, from 22% down to 96%, must stay quiet.
    safeArea: { x: 0, y: 0.22, w: 0.6, h: 0.74 },
  }),
  "case-01": defineSequence({
    id: "case-01",
    label: "CASE 01",
    mode: "loop",
    frameCount: 60,
    widths: [375, 960],
    aspect: 16 / 10,
    posterFrame: 1,
    alt: "An ambient loop for the Halden concept: the same contour-line field, drifting slowly across the frame.",
    // Measured: NOTHING overlays this canvas at 375, 768 or 1440 — WorkCase is
    // a grid, so the metadata stacks below rather than over. The old y 0.62
    // reserve cost 38% of the frame for a collision that cannot happen. This
    // short bottom band is insurance against a future layout that does overlay.
    safeArea: { x: 0, y: 0.82, w: 1, h: 0.18 },
  }),
  "case-02": defineSequence({
    id: "case-02",
    label: "CASE 02",
    mode: "loop",
    frameCount: 60,
    widths: [375, 960],
    aspect: 16 / 10,
    posterFrame: 1,
    alt: "An ambient loop for the Meridian Type concept: the same contour-line field, at its brightest of the three.",
    // Measured: NOTHING overlays this canvas at 375, 768 or 1440 — WorkCase is
    // a grid, so the metadata stacks below rather than over. The old y 0.62
    // reserve cost 38% of the frame for a collision that cannot happen. This
    // short bottom band is insurance against a future layout that does overlay.
    safeArea: { x: 0, y: 0.82, w: 1, h: 0.18 },
  }),
  "case-03": defineSequence({
    id: "case-03",
    label: "CASE 03",
    mode: "loop",
    frameCount: 60,
    widths: [375, 960],
    aspect: 16 / 10,
    posterFrame: 1,
    alt: "An ambient loop for the Fold concept: the same contour-line field, the most subdued of the three.",
    // Measured: NOTHING overlays this canvas at 375, 768 or 1440 — WorkCase is
    // a grid, so the metadata stacks below rather than over. The old y 0.62
    // reserve cost 38% of the frame for a collision that cannot happen. This
    // short bottom band is insurance against a future layout that does overlay.
    safeArea: { x: 0, y: 0.82, w: 1, h: 0.18 },
  }),
};

export function getSequence(id: SequenceId): SequenceManifest {
  return SEQUENCES[id];
}

/** Pick the smallest rendition that still covers the rendered CSS width. */
export function pickWidth(manifest: SequenceManifest, cssWidth: number, dpr = 1): number {
  const target = cssWidth * Math.min(dpr, 2);
  const ascending = [...manifest.widths].sort((a, b) => a - b);
  for (const w of ascending) {
    if (w >= target) return w;
  }
  return ascending[ascending.length - 1] ?? manifest.widths[0] ?? 1440;
}

/* ------------------------------------------------------------------ *
 * Frame-state store — a plain module-level pub/sub.
 * No context provider, no state library.
 *
 * `getFrameState` is consumed by <Timecode /> through useSyncExternalStore,
 * so it MUST return a referentially stable object. Building a fresh object
 * per call produces "The result of getSnapshot should be cached to avoid an
 * infinite loop".
 * ------------------------------------------------------------------ */

export interface FrameState {
  id: SequenceId;
  label: string;
  frame: number;
  total: number;
}

let current: FrameState | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function publishFrameState(state: FrameState | null): void {
  if (state === null) {
    if (current === null) return;
    current = null;
    emit();
    return;
  }
  if (
    current !== null &&
    current.id === state.id &&
    current.label === state.label &&
    current.frame === state.frame &&
    current.total === state.total
  ) {
    // Nothing moved — keep the same object identity.
    return;
  }
  current = { id: state.id, label: state.label, frame: state.frame, total: state.total };
  emit();
}

/**
 * Clear only if `id` is still the sequence on screen. A sequence leaving the
 * viewport must not wipe the readout of one that has already taken over.
 */
export function clearFrameState(id: SequenceId): void {
  if (current !== null && current.id === id) publishFrameState(null);
}

export function subscribeFrameState(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getFrameState(): FrameState | null {
  return current;
}

export function getServerFrameState(): FrameState | null {
  return null;
}

/* ------------------------------------------------------------------ *
 * Dominance arbitration.
 *
 * Two work cases are on screen at once wherever their sections meet, and every
 * mounted, playing sequence used to write to the store on its own animation
 * frame. The readout therefore interleaved two sequences at a *static* scroll
 * position. The store was never the bug; the missing arbitration was.
 *
 * Exactly one candidate owns the readout: the in-viewport one whose centre is
 * nearest the viewport centre, ties broken by document order. A non-dominant
 * sequence must not write to the store at all — that check lives at each call
 * site, so `publishFrameState` keeps its shape.
 *
 * Dominance can only change when the page scrolls, when layout resizes, or
 * when a sequence mounts or unmounts, so this listens for exactly those rather
 * than re-measuring every frame.
 * ------------------------------------------------------------------ */

export interface DominanceCandidate {
  /** document order; the lower value wins a tie */
  order: number;
  /**
   * Distance in CSS px from the candidate's centre to the viewport centre,
   * or `null` when the candidate is not intersecting the viewport at all.
   */
  measure: () => number | null;
}

/**
 * px a challenger must beat the incumbent by before it takes the readout.
 * Without it, two candidates straddling the crossover point swap on alternate
 * frames while scrolling and the readout flickers.
 */
const DOMINANCE_MARGIN = 24;

const candidates = new Map<SequenceId, DominanceCandidate>();
const dominanceListeners = new Set<() => void>();
let dominant: SequenceId | null = null;
let recomputeQueued = false;
let listening = false;

const SEQUENCE_ORDER = Object.keys(SEQUENCES) as SequenceId[];

/** Document order of a sequence. `SEQUENCES` is declared in page order. */
export function sequenceOrder(id: SequenceId): number {
  const index = SEQUENCE_ORDER.indexOf(id);
  return index === -1 ? SEQUENCE_ORDER.length : index;
}

function emitDominance(): void {
  for (const listener of dominanceListeners) listener();
}

function recomputeDominance(): void {
  let nextId: SequenceId | null = null;
  let nextDistance = Number.POSITIVE_INFINITY;
  let nextOrder = Number.POSITIVE_INFINITY;
  let incumbentDistance = Number.POSITIVE_INFINITY;

  for (const [id, candidate] of candidates) {
    const distance = candidate.measure();
    if (distance === null) continue;
    if (id === dominant) incumbentDistance = distance;
    if (distance < nextDistance || (distance === nextDistance && candidate.order < nextOrder)) {
      nextId = id;
      nextDistance = distance;
      nextOrder = candidate.order;
    }
  }

  if (nextId === dominant) return;
  // The incumbent keeps the readout unless the challenger is clearly closer.
  // An incumbent that has left the viewport measured `Infinity` and always loses.
  if (nextDistance > incumbentDistance - DOMINANCE_MARGIN) return;

  const previous = dominant;
  dominant = nextId;
  // The old holder no longer owns the readout. `clearFrameState` is a no-op if
  // someone else already took it; the new holder republishes on its next frame.
  if (previous !== null) clearFrameState(previous);
  emitDominance();
}

export function requestDominanceRecompute(): void {
  if (recomputeQueued || typeof window === "undefined") return;
  recomputeQueued = true;
  window.requestAnimationFrame(() => {
    recomputeQueued = false;
    recomputeDominance();
  });
}

function startListening(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("scroll", requestDominanceRecompute, { passive: true });
  window.addEventListener("resize", requestDominanceRecompute, { passive: true });
}

function stopListening(): void {
  if (!listening || typeof window === "undefined") return;
  listening = false;
  window.removeEventListener("scroll", requestDominanceRecompute);
  window.removeEventListener("resize", requestDominanceRecompute);
}

/** Returns the deregistration function. */
export function registerDominance(id: SequenceId, candidate: DominanceCandidate): () => void {
  candidates.set(id, candidate);
  startListening();
  requestDominanceRecompute();
  return () => {
    candidates.delete(id);
    if (dominant === id) {
      dominant = null;
      emitDominance();
    }
    if (candidates.size === 0) stopListening();
    else requestDominanceRecompute();
  };
}

export function isDominant(id: SequenceId): boolean {
  return dominant === id;
}

export function subscribeDominance(callback: () => void): () => void {
  dominanceListeners.add(callback);
  return () => {
    dominanceListeners.delete(callback);
  };
}
