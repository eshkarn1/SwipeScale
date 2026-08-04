// PLACEHOLDER — owned by Script 2 (motion engine). Public API is contractual; implementation is not.
"use client";

import { useEffect, useRef, useState } from "react";
import type { SequenceManifest } from "@/lib/sequences";

const CONCURRENCY = 6;

export interface FrameLoaderHandle {
  /** 1-based frame -> decoded image, or null while still in flight */
  framesRef: React.RefObject<(HTMLImageElement | null)[]>;
  /** 0 → 1 */
  progress: number;
  /** true once at least the poster frame has decoded */
  ready: boolean;
}

/**
 * Loads a frame sequence at one rendition with a small concurrency window.
 * Decoded images are released on unmount — a retained bitmap array is a leak.
 */
export function useFrameLoader(
  manifest: SequenceManifest,
  width: number,
  active: boolean,
): FrameLoaderHandle {
  const framesRef = useRef<(HTMLImageElement | null)[]>([]);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;

    const total = manifest.frameCount;
    const frames: (HTMLImageElement | null)[] = new Array(total).fill(null);
    framesRef.current = frames;

    let cancelled = false;
    let cursor = 0;
    let done = 0;
    let inFlight = 0;
    const pending = new Set<HTMLImageElement>();

    const settle = (index: number, image: HTMLImageElement | null) => {
      if (cancelled) return;
      if (image) frames[index] = image;
      done += 1;
      inFlight -= 1;
      setProgress(done / total);
      if (index === manifest.posterFrame - 1 || done === 1) setReady(true);
      if (done === total) setReady(true);
      pump();
    };

    const pump = () => {
      while (!cancelled && inFlight < CONCURRENCY && cursor < total) {
        const index = cursor;
        cursor += 1;
        inFlight += 1;
        const image = new Image();
        pending.add(image);
        image.decoding = "async";
        // Frames are never the LCP candidate — the poster is. Keep a 180-image
        // sequence from queueing ahead of fonts, CSS or the deferred GSAP chunk.
        image.setAttribute("fetchpriority", "low");
        image.onload = () => {
          pending.delete(image);
          settle(index, image);
        };
        image.onerror = () => {
          pending.delete(image);
          settle(index, null);
        };
        image.src = manifest.frameSrc(width, index + 1);
      }
    };

    pump();

    return () => {
      cancelled = true;
      for (const image of pending) {
        image.onload = null;
        image.onerror = null;
        image.src = "";
      }
      pending.clear();
      frames.fill(null);
      framesRef.current = [];
    };
  }, [manifest, width, active]);

  return { framesRef, progress, ready };
}
