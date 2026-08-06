/**
 * Frame fetch + decode.  (Spec §3, §8)
 *
 * `createImageBitmap` decodes OFF the main thread. `new Image()` + `onload`
 * decodes ON it and will visibly jank the scrub — same amount of code,
 * completely different feel. That is the whole reason this file exists.
 */

import type { Drawable } from "./bitmapBudget";

/**
 * §8 capability fallback. `createImageBitmap` is fully supported in Safari
 * 18.5+ and iOS Safari 17.6+, partial in 15.5–18.1, absent before that, so the
 * `HTMLImageElement` path below is a real path for older iOS, not dead code.
 *
 * Checked lazily: this module is imported during SSR, where neither global
 * exists.
 */
export function supportsImageBitmap(): boolean {
  return typeof createImageBitmap === "function";
}

export class FrameAbortError extends Error {
  constructor(url: string) {
    super(`Frame load aborted: ${url}`);
    this.name = "FrameAbortError";
  }
}

function isAbort(error: unknown): boolean {
  return (
    error instanceof FrameAbortError ||
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

/**
 * Fallback decode for browsers without `createImageBitmap`.
 *
 * `img.decode()` still resolves off the main thread in every browser that has
 * it, so this is much closer to the bitmap path than `onload` would be. The
 * returned element has no `.close()` — see `releaseDrawable`.
 */
function decodeViaImageElement(blob: Blob, signal: AbortSignal): Promise<Drawable> {
  return new Promise<Drawable>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = "async";

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      // Safe once decode() has settled: the decoded pixels are retained by the
      // element and no longer reference the object URL.
      URL.revokeObjectURL(objectUrl);
    };

    const onAbort = () => {
      image.src = "";
      cleanup();
      reject(new FrameAbortError("(object url)"));
    };

    if (signal.aborted) {
      cleanup();
      reject(new FrameAbortError("(object url)"));
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });

    image.src = objectUrl;
    image
      .decode()
      .then(() => {
        cleanup();
        resolve(image);
      })
      .catch((error: unknown) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

export async function loadFrame(url: string, signal: AbortSignal): Promise<Drawable> {
  const res = await fetch(url, { signal, cache: "force-cache" });
  if (!res.ok) throw new Error(`Frame fetch failed: ${url} (${res.status})`);
  const blob = await res.blob();
  if (supportsImageBitmap()) return createImageBitmap(blob);
  return decodeViaImageElement(blob, signal);
}

const RETRY_ATTEMPTS = 2;
const RETRY_BACKOFF_MS = 400;

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new FrameAbortError("(backoff)"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * §8: retry twice with 400 ms backoff, then give up on this index permanently.
 * The caller records the failure and `nearestLoaded()` covers the gap
 * invisibly. This never throws for a missing frame — only for an abort, which
 * the caller distinguishes with `isAbort` so a torn-down sequence is not
 * mistaken for a 404.
 */
export async function loadFrameWithRetry(url: string, signal: AbortSignal): Promise<Drawable> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    if (signal.aborted) throw new FrameAbortError(url);
    try {
      return await loadFrame(url, signal);
    } catch (error) {
      if (isAbort(error)) throw error;
      lastError = error;
      if (attempt < RETRY_ATTEMPTS) await delay(RETRY_BACKOFF_MS, signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Frame load failed: ${url}`);
}

export { isAbort };
