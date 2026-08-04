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
  /** 1-based index of the representative frame */
  posterFrame: number;
  /** aria-label for the canvas (role="img") */
  alt: string;
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
    widths: [1440],
    aspect: 16 / 9,
    posterFrame: 1,
    alt: "A scroll-driven title sequence: the words Websites that feel expensive resolving out of a dark graded field.",
  }),
  "case-01": defineSequence({
    id: "case-01",
    label: "CASE 01",
    mode: "loop",
    frameCount: 60,
    widths: [960],
    aspect: 16 / 10,
    posterFrame: 1,
    alt: "An ambient loop from the Halden concept: cold-water catalogue photography moving under a typographic overlay.",
  }),
  "case-02": defineSequence({
    id: "case-02",
    label: "CASE 02",
    mode: "loop",
    frameCount: 60,
    widths: [960],
    aspect: 16 / 10,
    posterFrame: 1,
    alt: "An ambient loop from the Meridian Type concept: specimen letterforms sliding across a foundry specimen page.",
  }),
  "case-03": defineSequence({
    id: "case-03",
    label: "CASE 03",
    mode: "loop",
    frameCount: 60,
    widths: [960],
    aspect: 16 / 10,
    posterFrame: 1,
    alt: "An ambient loop from the Fold concept: an architectural elevation drifting slowly across the frame.",
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
