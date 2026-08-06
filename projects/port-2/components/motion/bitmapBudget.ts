/**
 * Global resident-bitmap budget.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS — do not "simplify" it back to a bare count of 200.
 * ---------------------------------------------------------------------------
 * Spec §3 caps resident bitmaps at 200 for scrub sequences and at `frameCount`
 * for loops. Do the arithmetic for THIS project:
 *
 *     hero  = 180 frames  ->  180 < 200, so the count cap NEVER FIRES
 *     1920 x 1080 RGBA    ->  1920 * 1080 * 4 = 8,294,400 bytes = 8.29 MB
 *     180 * 8.29 MB       ->  1,492,992,000 bytes = 1.49 GB resident
 *
 * 1.49 GB is precisely the number the brief names as the thing that kills
 * phones. §3's count cap only protects sequences LONGER than 200 frames; this
 * one is shorter, so on its own §3 protects nothing here.
 *
 * So a byte budget sits underneath the count cap:
 *
 *     effectiveCap = clamp(
 *       floor(budgetBytes / bytesPerBitmap),
 *       MIN_RESIDENT,
 *       mode === "loop" ? frameCount : 200
 *     )
 *
 * The result is always <= 200, so this is STRICTER than §3 and never looser.
 *
 * Two further corrections to §3, both in the same direction:
 *
 * 1. The budget is GLOBAL, not per-sequence. Three 48-frame loops at the 960
 *    tier is 3 * 48 * (960*540*4 = 2.07 MB) = 298 MB of bitmaps sitting on top
 *    of the hero, and a per-sequence rule cannot see that total.
 *
 * 2. `budgetBytes` is divided between the sequences that are currently on
 *    screen, so N concurrent sequences cannot each claim the whole budget.
 *    Offscreen sequences release down to a single anchor frame and stop
 *    counting against the share.
 *
 * `bytesPerBitmap` is MEASURED from a decoded bitmap, never assumed from the
 * tier width — the decoder may hand back something other than the nominal
 * size, and the mobile variant and a mid-scroll tier switch both change it.
 */

const MB = 1024 * 1024;

/**
 * Never go below the Pass A stride set (23 frames for the 180-frame hero).
 * Below this the nearest-loaded fallback has nothing to fall back to, the
 * loader thrashes re-fetching what it just evicted, and the scrub falls apart.
 */
export const MIN_RESIDENT = 24;

/** §3's count cap for scrub sequences. This module only ever lowers it. */
export const SCRUB_COUNT_CAP = 200;

/**
 * A decoded frame: `createImageBitmap` normally, `HTMLImageElement` on the §8
 * fallback path for browsers without it (pre-15.5 iOS Safari). `drawImage`
 * accepts both. Only the first has `.close()`.
 */
export type Drawable = ImageBitmap | HTMLImageElement;

export function drawableWidth(drawable: Drawable): number {
  return "naturalWidth" in drawable ? drawable.naturalWidth : drawable.width;
}

export function drawableHeight(drawable: Drawable): number {
  return "naturalHeight" in drawable ? drawable.naturalHeight : drawable.height;
}

/** Decoded size in bytes. RGBA, 4 bytes per pixel. */
export function drawableBytes(drawable: Drawable): number {
  return drawableWidth(drawable) * drawableHeight(drawable) * 4;
}

/**
 * Release a decoded frame. `HTMLImageElement` has no `.close()` — dropping the
 * last reference is the only release available for it — so this must not
 * assume either type.
 */
export function releaseDrawable(drawable: Drawable): void {
  if ("close" in drawable && typeof drawable.close === "function") {
    drawable.close();
  }
}

/**
 * `navigator.deviceMemory` is Chrome/Android only — undefined in Safari and
 * Firefox. The undefined case includes every iPhone, so it takes the
 * conservative middle value rather than the optimistic one.
 */
export function deviceBudgetBytes(): number {
  if (typeof navigator === "undefined") return 384 * MB;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory !== "number") return 384 * MB;
  if (memory <= 4) return 192 * MB;
  if (memory <= 8) return 384 * MB;
  return 768 * MB;
}

let budgetBytes = 384 * MB;
let budgetResolved = false;

export function getBudgetBytes(): number {
  if (!budgetResolved && typeof navigator !== "undefined") {
    budgetBytes = deviceBudgetBytes();
    budgetResolved = true;
  }
  return budgetBytes;
}

/* ------------------------------------------------------------------ *
 * Membership
 * ------------------------------------------------------------------ */

export interface BudgetMember {
  readonly id: string;
  /** Is this sequence within the load/keep boundary (§3 Pass C's 200% margin)? */
  isActive(): boolean;
  residentCount(): number;
  residentBytes(): number;
  /**
   * Evict the single resident furthest from the playhead and `.close()` it.
   * Returns bytes freed, or 0 if nothing could be evicted.
   */
  evictFurthest(): number;
  /** Drop to a single anchor frame. Used when the sequence goes offscreen. */
  releaseToAnchor(): number;
}

const members = new Set<BudgetMember>();

export function registerMember(member: BudgetMember): () => void {
  members.add(member);
  return () => {
    members.delete(member);
  };
}

export function activeMemberCount(): number {
  let count = 0;
  for (const member of members) if (member.isActive()) count += 1;
  return count;
}

export function totalResidentBytes(): number {
  let total = 0;
  for (const member of members) total += member.residentBytes();
  return total;
}

/**
 * Per-sequence residency cap.
 *
 * `bytesPerBitmap <= 0` means nothing has decoded yet, so there is nothing to
 * measure — allow MIN_RESIDENT through so Pass A can get started and produce
 * the measurement.
 */
export function effectiveCap(
  mode: "scrub" | "loop",
  frameCount: number,
  bytesPerBitmap: number,
): number {
  const ceiling = mode === "loop" ? frameCount : SCRUB_COUNT_CAP;
  const floor = Math.min(MIN_RESIDENT, ceiling);
  if (bytesPerBitmap <= 0) return floor;

  // Divide the budget between the sequences actually on screen. One sequence on
  // screen gets the whole budget, which is exactly §3's formula.
  const share = getBudgetBytes() / Math.max(1, activeMemberCount());
  const byBytes = Math.floor(share / bytesPerBitmap);

  return Math.min(Math.max(byBytes, floor), ceiling);
}

/**
 * Backstop for the case the share-based cap cannot cover: several sequences
 * transiently on screen, or a tier switch that doubled bytesPerBitmap under a
 * cap computed against the old value.
 *
 * Offscreen sequences give up their bitmaps first; only then do on-screen ones
 * shed their furthest-from-playhead frames. Bounded so a member that refuses to
 * evict cannot spin this loop.
 */
export function enforceGlobalBudget(): void {
  const budget = getBudgetBytes();
  if (totalResidentBytes() <= budget) return;

  for (const member of members) {
    if (member.isActive()) continue;
    member.releaseToAnchor();
    if (totalResidentBytes() <= budget) return;
  }

  let guard = 0;
  while (totalResidentBytes() > budget && guard < 4096) {
    guard += 1;
    let victim: BudgetMember | null = null;
    let victimCount = 0;
    for (const member of members) {
      const count = member.residentCount();
      if (count > victimCount) {
        victim = member;
        victimCount = count;
      }
    }
    if (victim === null || victim.evictFurthest() === 0) return;
  }
}

/** Dev debug readout only. */
export function budgetSnapshot(): {
  budgetBytes: number;
  totalResidentBytes: number;
  activeMembers: number;
  members: number;
} {
  return {
    budgetBytes: getBudgetBytes(),
    totalResidentBytes: totalResidentBytes(),
    activeMembers: activeMemberCount(),
    members: members.size,
  };
}
