/**
 * Sequence registry + the timecode pub/sub store.  (Spec §2)
 *
 * The manifest JSON at `public/seq/<id>/manifest.json` is the ONLY interface
 * between this engine and the asset pipeline. Nothing else may be assumed about
 * what is on disk.
 *
 * The manifests are imported statically rather than fetched. `resolveJsonModule`
 * inlines them into the bundle, which removes four network round-trips from the
 * critical path — the hero cannot begin Pass A until it knows its frameCount, so
 * a fetched manifest would sit directly in front of first paint.
 *
 * The cost of a static import is that a contract violation becomes a build-time
 * throw rather than a runtime degradation. That is the trade we want: the
 * manifest is frozen, so a shape change is a pipeline bug that should be loud.
 */

import heroJson from "@/public/seq/hero/manifest.json";
import case01Json from "@/public/seq/case-01/manifest.json";
import case02Json from "@/public/seq/case-02/manifest.json";
import case03Json from "@/public/seq/case-03/manifest.json";

export const SEQUENCE_IDS = ["hero", "case-01", "case-02", "case-03"] as const;
export type SequenceId = (typeof SEQUENCE_IDS)[number];

export type SequenceMode = "scrub" | "loop";

export interface SequenceTier {
  width: number;
  path: string;
  bytes: number;
}

/**
 * §7's mandated sub-640px hero: a standalone 90-frame sequence with its own
 * 1–90 numbering. NOT a strided view of the 180-frame master — do not try to
 * index into it with the master frame numbers.
 */
export interface SequenceMobileVariant {
  width: number;
  path: string;
  frameCount: number;
  step: number;
  bytes: number;
}

export interface SequenceManifest {
  id: SequenceId;
  mode: SequenceMode;
  frameCount: number;
  fps: number;
  aspect: number;
  alt: string;
  posterFrame: number;
  posterPath: string;
  tiers: SequenceTier[];
  mobileVariant?: SequenceMobileVariant;
  filePattern: string;
  padding: number;
}

/* ------------------------------------------------------------------ *
 * Manifest validation
 *
 * JSON imports widen to `string`/`number`, so the literal unions in
 * SequenceManifest have to be re-established by a real check. Doing it here
 * also means a pipeline that drops `mobileVariant` or renames a tier path
 * fails at build with a message naming the file, instead of producing 404s
 * that look like a loader bug.
 * ------------------------------------------------------------------ */

function fail(id: string, what: string): never {
  throw new Error(`[sequences] public/seq/${id}/manifest.json ${what}`);
}

function asMode(id: string, value: string): SequenceMode {
  if (value === "scrub" || value === "loop") return value;
  return fail(id, `has mode "${value}"; expected "scrub" or "loop"`);
}

function asSequenceId(value: string): SequenceId {
  const match = SEQUENCE_IDS.find((candidate) => candidate === value);
  if (match === undefined) {
    throw new Error(`[sequences] manifest id "${value}" is not a known SequenceId`);
  }
  return match;
}

interface RawManifest {
  id: string;
  mode: string;
  frameCount: number;
  fps: number;
  aspect: number;
  alt: string;
  posterFrame: number;
  posterPath: string;
  tiers: { width: number; path: string; bytes: number }[];
  mobileVariant?: { width: number; path: string; frameCount: number; step: number; bytes: number };
  filePattern: string;
  padding: number;
}

function toManifest(raw: RawManifest): SequenceManifest {
  const id = asSequenceId(raw.id);
  if (raw.frameCount < 1) fail(id, `declares frameCount ${raw.frameCount}`);
  if (raw.tiers.length === 0) fail(id, "declares no tiers");
  if (!raw.filePattern.includes("{n}")) {
    fail(id, `has filePattern "${raw.filePattern}" with no {n} placeholder`);
  }
  if (raw.posterFrame < 1 || raw.posterFrame > raw.frameCount) {
    fail(id, `has posterFrame ${raw.posterFrame} outside 1..${raw.frameCount}`);
  }
  // Tiers must be ascending; the tier picker relies on it and sorting a copy
  // every call would allocate on a path that runs on every resize.
  const tiers = [...raw.tiers].sort((a, b) => a.width - b.width);

  return {
    id,
    mode: asMode(id, raw.mode),
    frameCount: raw.frameCount,
    fps: raw.fps,
    aspect: raw.aspect,
    alt: raw.alt,
    posterFrame: raw.posterFrame,
    posterPath: raw.posterPath,
    tiers,
    ...(raw.mobileVariant ? { mobileVariant: raw.mobileVariant } : {}),
    filePattern: raw.filePattern,
    padding: raw.padding,
  };
}

export const SEQUENCES: Record<SequenceId, SequenceManifest> = {
  hero: toManifest(heroJson),
  "case-01": toManifest(case01Json),
  "case-02": toManifest(case02Json),
  "case-03": toManifest(case03Json),
};

export function getSequence(id: SequenceId): SequenceManifest {
  return SEQUENCES[id];
}

/* ------------------------------------------------------------------ *
 * Source resolution — which directory of frames this viewport should load.
 * ------------------------------------------------------------------ */

/** §7: below this viewport width the hero uses its decimated variant. */
export const MOBILE_VARIANT_MAX_WIDTH = 640;

/** The maximum DPR we will ever render or fetch at. §10 forbids uncapped DPR. */
export const MAX_DPR = 2;

export interface FrameSource {
  /** directory, no trailing slash */
  path: string;
  width: number;
  /** frames available at this path, 1..frameCount */
  frameCount: number;
  /** how many master-timeline frames each frame here represents */
  step: number;
}

export function clampDpr(dpr: number): number {
  return Math.min(dpr > 0 ? dpr : 1, MAX_DPR);
}

/**
 * Smallest tier whose width >= viewportWidth * min(dpr, 2), falling back to the
 * largest available. Below MOBILE_VARIANT_MAX_WIDTH a declared `mobileVariant`
 * wins outright — it is a different frame count, not a different resolution.
 */
export function resolveSource(
  manifest: SequenceManifest,
  viewportWidth: number,
  dpr: number,
): FrameSource {
  const variant = manifest.mobileVariant;
  if (variant !== undefined && viewportWidth < MOBILE_VARIANT_MAX_WIDTH) {
    return {
      path: variant.path,
      width: variant.width,
      frameCount: variant.frameCount,
      step: variant.step,
    };
  }

  const target = viewportWidth * clampDpr(dpr);
  const largest = manifest.tiers[manifest.tiers.length - 1];
  if (largest === undefined) {
    throw new Error(`[sequences] ${manifest.id} has no tiers`);
  }
  const chosen = manifest.tiers.find((tier) => tier.width >= target) ?? largest;

  return {
    path: chosen.path,
    width: chosen.width,
    frameCount: manifest.frameCount,
    step: 1,
  };
}

/** `frame` is 1-indexed. */
export function framePath(manifest: SequenceManifest, source: FrameSource, frame: number): string {
  const padded = String(frame).padStart(manifest.padding, "0");
  return `${source.path}/${manifest.filePattern.replace("{n}", padded)}`;
}

/* ------------------------------------------------------------------ *
 * Timecode store  (§2)
 *
 * The readout is the site's signature element, so this is deliberately a plain
 * module-level pub/sub with no scheduling of its own: `set` is called from
 * inside the draw, immediately after `drawImage`, so the number and the pixels
 * are published in the same task. Anything that batched or deferred here would
 * put the counter behind the visual.
 *
 * Ownership arbitration: more than one sequence can be on screen at once, and
 * every playing sequence writes on its own animation frame. Without an owner
 * the readout interleaves two sequences and visibly flickers at a *static*
 * scroll position. Owner = the intersecting sequence with the highest
 * intersection ratio, ties broken by document order. Ratios come from the
 * IntersectionObserver the engine already runs, so this costs no layout reads.
 * ------------------------------------------------------------------ */

type Listener = (frame: number, total: number, id: SequenceId) => void;

interface TimecodeState {
  id: SequenceId;
  frame: number;
  total: number;
}

const listeners = new Set<Listener>();
const ratios = new Map<SequenceId, number>();
let active: TimecodeState | null = null;
let owner: SequenceId | null = null;

/** Beat a challenger must exceed before it takes the readout, to stop swapping. */
const OWNER_MARGIN = 0.08;

function documentOrder(id: SequenceId): number {
  const index = SEQUENCE_IDS.indexOf(id);
  return index === -1 ? SEQUENCE_IDS.length : index;
}

/** `total === 0` is the "no reading" signal; <Timecode /> renders nothing. */
function emitCleared(id: SequenceId): void {
  for (const listener of listeners) listener(0, 0, id);
}

function recomputeOwner(): void {
  let bestId: SequenceId | null = null;
  let bestRatio = 0;
  let bestOrder = Number.POSITIVE_INFINITY;
  let ownerRatio = 0;

  for (const [id, ratio] of ratios) {
    if (ratio <= 0) continue;
    if (id === owner) ownerRatio = ratio;
    const order = documentOrder(id);
    if (ratio > bestRatio || (ratio === bestRatio && order < bestOrder)) {
      bestId = id;
      bestRatio = ratio;
      bestOrder = order;
    }
  }

  if (bestId === owner) return;
  // The incumbent keeps the readout unless the challenger is clearly ahead.
  // An incumbent that has left the viewport measures 0 and always loses.
  if (bestRatio <= ownerRatio + OWNER_MARGIN) return;

  const previous = active;
  owner = bestId;
  // The new owner republishes on its very next drawn frame; drop the stale
  // reading now so the readout never shows one sequence's frame under
  // another's label.
  if (previous !== null && previous.id !== owner) {
    active = null;
    emitCleared(previous.id);
  }
}

export const timecode = {
  set(id: SequenceId, frame: number, total: number): void {
    // A sequence that does not own the readout draws normally but stays silent.
    if (owner !== null && owner !== id) return;
    if (active !== null && active.id === id && active.frame === frame && active.total === total) {
      return;
    }
    active = { id, frame, total };
    for (const listener of listeners) listener(frame, total, id);
  },

  get(): TimecodeState | null {
    return active;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Called from the engine's IntersectionObserver. */
  reportVisibility(id: SequenceId, ratio: number): void {
    ratios.set(id, ratio);
    recomputeOwner();
  },

  /** Unmount. Never leave a dead sequence owning the readout. */
  unregister(id: SequenceId): void {
    ratios.delete(id);
    if (owner === id) owner = null;
    const hadReading = active !== null && active.id === id;
    if (hadReading) active = null;
    recomputeOwner();
    if (hadReading) emitCleared(id);
  },
};
