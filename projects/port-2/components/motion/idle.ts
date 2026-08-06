/**
 * Pass C gate.  (Spec §3)
 *
 * Non-hero sequences do not begin loading until EITHER `requestIdleCallback`
 * fires after the hero's Pass A completes, OR the sequence enters its 200%
 * root-margin IntersectionObserver — whichever is first. The observer half
 * lives in the component; this module is the idle half.
 *
 * `requestIdleCallback` is unsupported in Safari, so it is feature-detected
 * with a `setTimeout` shim rather than assumed.
 */

const IDLE_TIMEOUT_MS = 2000;
const IDLE_SHIM_MS = 1200;

/**
 * Backstop for a page with no hero at all, or a hero whose Pass A never
 * resolves because the connection died. Without it the case sequences would
 * depend entirely on the observer, and a case that is already in view at load
 * on a short page would still be waiting.
 */
const NO_HERO_FALLBACK_MS = 6000;

let released = false;
let scheduled = false;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
const waiters = new Set<() => void>();

function release(): void {
  if (released) return;
  released = true;
  if (fallbackTimer !== null) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
  for (const waiter of waiters) waiter();
  waiters.clear();
}

function scheduleIdle(): void {
  if (scheduled || released || typeof window === "undefined") return;
  scheduled = true;
  const request = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback;
  if (typeof request === "function") {
    request.call(window, () => release(), { timeout: IDLE_TIMEOUT_MS });
  } else {
    window.setTimeout(release, IDLE_SHIM_MS);
  }
}

/** Called by the hero the moment its Pass A resolves. */
export function notifyHeroPassAComplete(): void {
  scheduleIdle();
}

/**
 * Resolves when non-hero sequences may start loading.
 * Returns an unsubscribe so an unmounting sequence leaves nothing behind.
 */
export function whenIdleAfterHero(callback: () => void): () => void {
  if (released) {
    callback();
    return () => {};
  }
  waiters.add(callback);
  if (fallbackTimer === null && typeof window !== "undefined") {
    fallbackTimer = setTimeout(release, NO_HERO_FALLBACK_MS);
  }
  return () => {
    waiters.delete(callback);
  };
}

/** Test/debug only. */
export function idleReleased(): boolean {
  return released;
}
