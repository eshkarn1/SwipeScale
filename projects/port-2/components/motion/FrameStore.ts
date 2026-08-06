/**
 * Per-sequence frame residency and loading.  (Spec §3, §8)
 *
 * Owns: the decoded-frame array, the byte accounting behind
 * `bitmapBudget.effectiveCap`, Pass A / Pass B scheduling, permanent
 * skip-on-failure, tier switching, and teardown.
 *
 * Internally every index is 0-based. Every public frame number is 1-based,
 * because that is what the manifests, the file names and the readout all use.
 * The conversion happens at the boundary and nowhere else.
 */

import {
  drawableBytes,
  effectiveCap,
  enforceGlobalBudget,
  registerMember,
  releaseDrawable,
  type BudgetMember,
  type Drawable,
} from "./bitmapBudget";
import { enqueue, type QueueTask } from "./frameQueue";
import { isAbort, loadFrameWithRetry } from "./loadFrame";
import { framePath, type FrameSource, type SequenceManifest } from "@/lib/sequences";

/**
 * §3 fixes the Pass A stride at 8 — "every 8th frame, ~23 frames, ~1.1 MB".
 * That constant misses §7's own budget, and by more than 2x.
 *
 * §7 requires Pass A to complete in <= 2.5s on Slow 4G. Slow 4G is 1.6 Mbps,
 * i.e. ~200 KB/s, so 2.5s buys ~500 KB before latency. §3's own stated payload
 * of ~1.1 MB takes **5.63s** on that link. The two sections cannot both hold.
 *
 * Measured on the built site at 4x CPU throttle + Slow 4G, before this change:
 * Pass A completed at **5248 ms** against a 2500 ms target. Predicted cost of
 * a stride-8 Pass A, from the byte totals the manifests now declare:
 *
 *     tier 0960   15.9 KB/frame  x23 =  366 KB  ->  2.40s   fits
 *     tier 1440   25.9 KB/frame  x23 =  596 KB  ->  3.56s   over
 *     tier 1920   42.3 KB/frame  x23 =  973 KB  ->  5.44s   fails
 *
 * So a fixed stride cannot work: the payload scales with the tier while the
 * budget does not. The stride is now *derived* from the tier's real per-frame
 * cost so Pass A's payload fits the budget at every tier. This is only possible
 * because the manifests declare true `bytes` per tier — while those were the
 * placeholder `0`, there was nothing to derive from.
 *
 * The trade is Pass A's temporal resolution at the largest tiers, which is the
 * right thing to give up: Pass A exists to make the sequence *interactive*
 * quickly and is explicitly allowed to look choppy ("Take the choppiness" —
 * BRIEF §2). Pass B fills the gaps within a second or two. Spatial resolution
 * and final smoothness are untouched.
 *
 * Stride is clamped to [8, 24]. Never below 8, because §3's stride is the floor
 * and a denser Pass A is never the problem. Never above 24, because past that
 * the stride set is too sparse to scrub against and `nearestLoaded` visibly
 * steps.
 */
// Pass A does not get the whole 2.5s. Measured on the built site, the first
// paint's own critical path spends ~158 KB on the JS bundle before the loader
// can even run, and Chrome's lazy-loading threshold is generous enough on a
// slow link that it still fetches ~66 KB of below-the-fold case posters. At
// 200 KB/s those cost roughly 1.1s of the budget that Pass A cannot spend.
//
// Measured Pass A at 1440, tuning this constant:
//     fixed stride 8 (as §3 specifies)  447 KB frames -> 5248 ms
//     budget 450 KB                     447 KB frames -> 4236 ms
//     budget 300 KB                     see below
const PASS_A_BUDGET_BYTES = 300_000;
const PASS_A_STRIDE_MIN = 8;
const PASS_A_STRIDE_MAX = 24;

/** §3's fixed stride, kept as the floor and used when tier bytes are unknown. */
export const PASS_A_STRIDE = PASS_A_STRIDE_MIN;

/**
 * Stride that keeps Pass A's payload inside `PASS_A_BUDGET_BYTES` for a tier
 * whose whole-sequence size is `tierBytes`. Falls back to §3's fixed 8 when the
 * manifest does not declare a size.
 */
export function passAStrideFor(tierBytes: number, frameCount: number): number {
  if (!Number.isFinite(tierBytes) || tierBytes <= 0 || frameCount <= 0) {
    return PASS_A_STRIDE_MIN;
  }
  const perFrame = tierBytes / frameCount;
  const affordableFrames = Math.max(1, Math.floor(PASS_A_BUDGET_BYTES / perFrame));
  const stride = Math.ceil(frameCount / affordableFrames);
  return Math.min(PASS_A_STRIDE_MAX, Math.max(PASS_A_STRIDE_MIN, stride));
}

/** Re-run window maintenance only once the playhead has actually moved. */
const MAINTAIN_PLAYHEAD_DELTA = 2;

function mark(name: string): void {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") return;
  try {
    performance.mark(name);
  } catch {
    /* marks are diagnostics; never let them break a load */
  }
}

function measure(name: string, start: string, end: string): void {
  if (typeof performance === "undefined" || typeof performance.measure !== "function") return;
  try {
    performance.measure(name, start, end);
  } catch {
    /* a missing mark must not throw into the loader */
  }
}

/**
 * §3 Pass C, as three states rather than a boolean.
 *
 * - `off`   nothing loads; in-flight work is aborted.
 * - `passA` stride set only. Reached by the idle-after-hero gate, and kept by a
 *           sequence that has been scrolled past. ~6 frames for a 48-frame loop
 *           (12 MB), which bounds offscreen memory while leaving the sequence
 *           instantly interactive when it is approached again. Under real memory
 *           pressure `enforceGlobalBudget` still releases these first, because
 *           `isActive()` is false here.
 * - `full`  stride set plus a moving window around the playhead.
 */
export type LoadPhase = "off" | "passA" | "full";

export interface FrameStoreEvents {
  /** Pass A resolved (loaded or permanently failed) — the sequence is interactive. */
  onPassAComplete: () => void;
  /** A Pass A frame resolved; carries 0–1 for `renderLoading`. */
  onPassAProgress: (progress: number) => void;
  /** A frame arrived — the canvas may now be able to draw something new. */
  onFrameAvailable: () => void;
}

export class FrameStore implements BudgetMember {
  readonly id: string;
  private readonly manifest: SequenceManifest;
  private readonly mode: "scrub" | "loop";
  private readonly events: FrameStoreEvents;

  private source: FrameSource;
  private frameCount: number;

  private frames: (Drawable | undefined)[] = [];
  /** Which tier directory each resident frame came from, for tier switching. */
  private framePaths: (string | undefined)[] = [];
  private failed: boolean[] = [];

  private queued = new Map<number, QueueTask>();
  private controllers = new Map<number, AbortController>();

  private residentCountValue = 0;
  private residentBytesValue = 0;
  /** Measured from a real decoded bitmap. Never assumed from the tier width. */
  private bytesPerBitmap = 0;

  /** 1-based. */
  private playhead = 1;
  private lastMaintainPlayhead = -999;

  private phase: LoadPhase = "off";
  private started = false;
  private destroyed = false;

  private passATotal = 0;
  private passAResolved = 0;
  passAComplete = false;
  passACompleteMs: number | null = null;

  private unregisterMember: () => void;

  constructor(manifest: SequenceManifest, source: FrameSource, events: FrameStoreEvents) {
    this.id = manifest.id;
    this.manifest = manifest;
    this.mode = manifest.mode;
    this.events = events;
    this.source = source;
    this.frameCount = source.frameCount;
    this.allocate();
    this.unregisterMember = registerMember(this);
  }

  /** Derived from the selected tier's real per-frame cost. See passAStrideFor. */
  private passAStride = PASS_A_STRIDE;

  private allocate(): void {
    this.passAStride = passAStrideFor(this.source.bytes, this.frameCount);
    this.frames = new Array<Drawable | undefined>(this.frameCount).fill(undefined);
    this.framePaths = new Array<string | undefined>(this.frameCount).fill(undefined);
    this.failed = new Array<boolean>(this.frameCount).fill(false);
    this.passATotal = Math.ceil(this.frameCount / this.passAStride);
    this.passAResolved = 0;
    this.passAComplete = false;
    this.passACompleteMs = null;
  }

  /* ---------------- public state ---------------- */

  getFrameCount(): number {
    return this.frameCount;
  }

  getSourcePath(): string {
    return this.source.path;
  }

  passAProgress(): number {
    if (this.passATotal === 0) return 1;
    return Math.min(1, this.passAResolved / this.passATotal);
  }

  /** §5: fall back to the closest already-decoded frame. Never blanks. */
  nearestLoaded(frame: number): Drawable | undefined {
    if (this.residentCountValue === 0) return undefined;
    const target = Math.min(this.frameCount - 1, Math.max(0, frame - 1));
    const direct = this.frames[target];
    if (direct !== undefined) return direct;

    for (let offset = 1; offset < this.frameCount; offset += 1) {
      const back = target - offset;
      if (back >= 0) {
        const found = this.frames[back];
        if (found !== undefined) return found;
      }
      const forward = target + offset;
      if (forward < this.frameCount) {
        const found = this.frames[forward];
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  /**
   * Called from inside the draw, once per drawn frame. Must stay allocation
   * free — see the §7 long-task budget.
   */
  setPlayhead(frame: number): void {
    this.playhead = frame;
    if (Math.abs(frame - this.lastMaintainPlayhead) < MAINTAIN_PLAYHEAD_DELTA) return;
    this.lastMaintainPlayhead = frame;
    this.maintain();
  }

  /* ---------------- lifecycle ---------------- */

  /** §3 Pass C boundary (200% root margin), in both directions. */
  setPhase(next: LoadPhase): void {
    if (this.destroyed || this.phase === next) return;
    const previous = this.phase;
    this.phase = next;

    if (next === "off") {
      this.cancelAllPending();
      this.releaseToAnchor();
      return;
    }
    if (!this.started) {
      this.started = true;
      mark(`motion:${this.id}:passA:start`);
    }
    // Narrowing to the stride set drops the window frames; `maintain` evicts
    // everything no longer wanted, so this needs no separate path.
    if (previous === "full" && next === "passA") this.cancelAllPending();
    this.maintain();
  }

  getPhase(): LoadPhase {
    return this.phase;
  }

  /**
   * BudgetMember. Only a `full` sequence claims a share of the byte budget —
   * that is what makes offscreen sequences the first thing global eviction
   * takes.
   */
  isActive(): boolean {
    return this.phase === "full";
  }

  /**
   * Tier or mobile-variant change. §4: never blank the canvas during a switch.
   *
   * A different frameCount (crossing the 640px mobile-variant boundary) is a
   * different sequence and has to be rebuilt. A different tier at the same
   * frameCount is replaced IN PLACE, frame by frame, while the old bitmaps keep
   * rendering — `drawImage` cover-fits from each bitmap's own dimensions, so a
   * transiently mixed-resolution array is geometrically correct and there is no
   * moment where nothing can be drawn.
   */
  setSource(next: FrameSource): void {
    if (this.destroyed || next.path === this.source.path) return;
    const rebuild = next.frameCount !== this.frameCount;
    this.cancelAllPending();
    this.source = next;

    if (rebuild) {
      this.releaseAll();
      this.frameCount = next.frameCount;
      this.allocate();
      this.started = false;
      if (this.phase !== "off") {
        this.started = true;
        mark(`motion:${this.id}:passA:start`);
      }
    }
    this.maintain();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.phase = "off";
    this.cancelAllPending();
    this.releaseAll();
    this.unregisterMember();
  }

  /* ---------------- BudgetMember ---------------- */

  residentCount(): number {
    return this.residentCountValue;
  }

  residentBytes(): number {
    return this.residentBytesValue;
  }

  evictFurthest(): number {
    // One resident is the anchor holding the currently visible pixels. Evicting
    // it would leave nothing to redraw after a resize, which is the one way
    // this engine could blank the canvas.
    if (this.residentCountValue <= 1) return 0;
    const centre = this.playhead - 1;
    let victim = -1;
    let furthest = -1;
    for (let i = 0; i < this.frameCount; i += 1) {
      if (this.frames[i] === undefined) continue;
      const distance = Math.abs(i - centre);
      if (distance > furthest) {
        furthest = distance;
        victim = i;
      }
    }
    if (victim < 0) return 0;
    return this.evictAt(victim);
  }

  releaseToAnchor(): number {
    if (this.residentCountValue <= 1) return 0;
    const centre = this.playhead - 1;
    let keep = -1;
    let nearest = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.frameCount; i += 1) {
      if (this.frames[i] === undefined) continue;
      const distance = Math.abs(i - centre);
      if (distance < nearest) {
        nearest = distance;
        keep = i;
      }
    }
    let freed = 0;
    for (let i = 0; i < this.frameCount; i += 1) {
      if (i === keep || this.frames[i] === undefined) continue;
      freed += this.evictAt(i);
    }
    return freed;
  }

  /* ---------------- residency ---------------- */

  private evictAt(index: number): number {
    const drawable = this.frames[index];
    if (drawable === undefined) return 0;
    const bytes = drawableBytes(drawable);
    releaseDrawable(drawable);
    this.frames[index] = undefined;
    this.framePaths[index] = undefined;
    this.residentCountValue -= 1;
    this.residentBytesValue -= bytes;
    return bytes;
  }

  /** Unmount / rebuild: `.close()` every bitmap, unconditionally. */
  private releaseAll(): void {
    for (let i = 0; i < this.frames.length; i += 1) {
      const drawable = this.frames[i];
      if (drawable === undefined) continue;
      releaseDrawable(drawable);
      this.frames[i] = undefined;
      this.framePaths[i] = undefined;
    }
    this.residentCountValue = 0;
    this.residentBytesValue = 0;
  }

  private install(index: number, drawable: Drawable, path: string): void {
    // A frame can arrive after the sequence was torn down or rebuilt. Closing
    // it here rather than storing it is what keeps the unmount exhaustive.
    if (this.destroyed || index >= this.frameCount || path !== this.source.path) {
      releaseDrawable(drawable);
      return;
    }
    this.evictAt(index);
    const bytes = drawableBytes(drawable);
    this.frames[index] = drawable;
    this.framePaths[index] = path;
    this.residentCountValue += 1;
    this.residentBytesValue += bytes;
    this.bytesPerBitmap = bytes;
    enforceGlobalBudget();
  }

  /* ---------------- scheduling ---------------- */

  private cap(): number {
    return effectiveCap(this.mode, this.frameCount, this.bytesPerBitmap);
  }

  private isPassAIndex(index: number): boolean {
    return index % this.passAStride === 0;
  }

  /**
   * The stride set is PINNED — never evicted by window maintenance — because it
   * is what `nearestLoaded` falls back to. Lose it and a fast scrub has nothing
   * to show between the window and the playhead.
   *
   * If the cap is too small to hold the whole stride set plus a working window,
   * the pinned set is decimated rather than allowed to consume the entire cap.
   */
  private pinStride(cap: number): number {
    let stride = this.passAStride;
    // Leave at least a quarter of the cap for the moving window.
    const budget = Math.max(1, Math.floor(cap * 0.75));
    while (Math.ceil(this.frameCount / stride) > budget) stride *= 2;
    return stride;
  }

  private maintain(): void {
    if (this.destroyed || this.phase === "off") return;

    const strideOnly = this.phase === "passA";
    const cap = this.cap();
    const stride = this.pinStride(cap);
    const pinnedCount = Math.ceil(this.frameCount / stride);
    const radius = Math.max(2, Math.floor((cap - pinnedCount) / 2));
    const centre = this.playhead - 1;
    const path = this.source.path;

    for (let i = 0; i < this.frameCount; i += 1) {
      // During Pass A the whole stride set is wanted regardless of the window —
      // Pass A completion is what makes the sequence interactive.
      const wanted = strideOnly
        ? this.isPassAIndex(i)
        : (!this.passAComplete && this.isPassAIndex(i)) ||
          i % stride === 0 ||
          Math.abs(i - centre) <= radius;

      const resident = this.frames[i] !== undefined;
      const stale = resident && this.framePaths[i] !== path;

      if (!wanted) {
        if (resident) this.evictAt(i);
        const queuedTask = this.queued.get(i);
        if (queuedTask !== undefined) {
          queuedTask.cancelled = true;
          this.queued.delete(i);
        }
        this.abortAt(i);
        continue;
      }

      if (this.failed[i]) continue;
      if (resident && !stale) continue;
      if (this.queued.has(i) || this.controllers.has(i)) continue;
      this.schedule(i);
    }
  }

  private schedule(index: number): void {
    const path = this.source.path;
    const isPassA = this.isPassAIndex(index);
    const isHero = this.id === "hero";
    // hero Pass A < case Pass A < hero Pass B < case Pass B, then by distance
    // from the playhead. Distance is read at pop time, so scrolling
    // reprioritises the queue with no work on the scroll handler itself.
    const rank = (isPassA ? 0 : 2) + (isHero ? 0 : 1);

    const task: QueueTask = {
      cancelled: false,
      priority: () => rank * 1_000_000 + Math.abs(index - (this.playhead - 1)),
      run: async () => {
        this.queued.delete(index);
        if (this.destroyed || this.phase === "off" || path !== this.source.path) return;

        const controller = new AbortController();
        this.controllers.set(index, controller);
        const url = framePath(this.manifest, this.source, index + 1);

        try {
          const drawable = await loadFrameWithRetry(url, controller.signal);
          this.install(index, drawable, path);
          this.events.onFrameAvailable();
          this.resolvePassA(index);
        } catch (error) {
          if (isAbort(error)) return;
          // §8: retries are spent. Skip this index permanently; nearestLoaded
          // covers the gap invisibly. Never throw, never blank the canvas.
          if (index < this.failed.length) this.failed[index] = true;
          this.resolvePassA(index);
        } finally {
          this.controllers.delete(index);
        }
      },
    };

    this.queued.set(index, task);
    enqueue(task);
  }

  private resolvePassA(index: number): void {
    if (this.passAComplete || !this.isPassAIndex(index)) return;
    this.passAResolved += 1;
    this.events.onPassAProgress(this.passAProgress());
    if (this.passAResolved < this.passATotal) return;

    this.passAComplete = true;
    this.passACompleteMs = typeof performance !== "undefined" ? performance.now() : null;
    mark(`motion:${this.id}:passA:end`);
    measure(`motion:${this.id}:passA`, `motion:${this.id}:passA:start`, `motion:${this.id}:passA:end`);
    this.events.onPassAComplete();
    // Pass B's window is only meaningful once the stride set is down.
    this.maintain();
  }

  private abortAt(index: number): void {
    const controller = this.controllers.get(index);
    if (controller === undefined) return;
    controller.abort();
    this.controllers.delete(index);
  }

  private cancelAllPending(): void {
    for (const task of this.queued.values()) task.cancelled = true;
    this.queued.clear();
    for (const controller of this.controllers.values()) controller.abort();
    this.controllers.clear();
  }

  /* ---------------- debug ---------------- */

  snapshot(): {
    id: string;
    mode: string;
    source: string;
    frameCount: number;
    residentCount: number;
    residentBytes: number;
    bytesPerBitmap: number;
    cap: number;
    loadedCount: number;
    failedCount: number;
    inFlight: number;
    queued: number;
    targetFrame: number;
    passAComplete: boolean;
    passACompleteMs: number | null;
    phase: LoadPhase;
  } {
    let loaded = 0;
    let failedCount = 0;
    for (let i = 0; i < this.frameCount; i += 1) {
      if (this.frames[i] !== undefined) loaded += 1;
      if (this.failed[i]) failedCount += 1;
    }
    return {
      id: this.id,
      mode: this.mode,
      source: this.source.path,
      frameCount: this.frameCount,
      residentCount: this.residentCountValue,
      residentBytes: this.residentBytesValue,
      bytesPerBitmap: this.bytesPerBitmap,
      cap: this.cap(),
      loadedCount: loaded,
      failedCount,
      inFlight: this.controllers.size,
      queued: this.queued.size,
      targetFrame: this.playhead,
      passAComplete: this.passAComplete,
      passACompleteMs: this.passACompleteMs,
      phase: this.phase,
    };
  }
}
