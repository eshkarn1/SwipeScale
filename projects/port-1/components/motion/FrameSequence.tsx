// PLACEHOLDER — owned by Script 2 (motion engine). Public API is contractual; implementation is not.
"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearFrameState,
  getSequence,
  isDominant,
  pickWidth,
  publishFrameState,
  registerDominance,
  sequenceOrder,
  subscribeDominance,
} from "@/lib/sequences";
import { coverFit } from "./useCoverFit";
import { useFrameLoader } from "./useFrameLoader";
import type { CoverFitRect, FrameSequenceProps } from "./types";

const LOOP_FPS = 24;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/* ------------------------------------------------------------------ *
 * First-paint gate for the frame loader.
 *
 * The hero is in view at load, so its IntersectionObserver resolves
 * immediately and 180 WebP requests (~970 KB) used to start while the document
 * was still being painted and hydrated. Lighthouse attributed nearly all of a
 * 2.9s LCP render delay to that contention.
 *
 * Nothing is missing on screen in the meantime: the poster is already in the
 * SSR HTML with fetchPriority="high" and the canvas draws over it once frames
 * decode. This gate is one-shot and module-wide — once the page has painted
 * and gone idle, every later sequence loads the moment its own observer fires,
 * so the off-screen case sequences keep their existing in-view gating.
 * ------------------------------------------------------------------ */

const IDLE_TIMEOUT_MS = 2000;
const IDLE_FALLBACK_MS = 1200;

let idleReached = false;
let idleScheduled = false;
const idleWaiters = new Set<() => void>();

function releaseIdle(): void {
  if (idleReached) return;
  idleReached = true;
  for (const waiter of idleWaiters) waiter();
  idleWaiters.clear();
}

function scheduleIdleRelease(): void {
  if (idleScheduled || typeof window === "undefined") return;
  idleScheduled = true;
  // Two frames put us safely past first paint; requestIdleCallback then waits
  // for the main thread to actually be free, with its own timeout as a floor.
  // setTimeout is the fallback for browsers without requestIdleCallback.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(releaseIdle, { timeout: IDLE_TIMEOUT_MS });
      } else {
        window.setTimeout(releaseIdle, IDLE_FALLBACK_MS);
      }
    });
  });
}

function onFirstIdle(callback: () => void): () => void {
  if (idleReached) {
    callback();
    return () => {};
  }
  idleWaiters.add(callback);
  scheduleIdleRelease();
  return () => {
    idleWaiters.delete(callback);
  };
}

export default function FrameSequence({
  id,
  mode,
  className,
  scrubTargetId,
  priority = false,
}: FrameSequenceProps) {
  const manifest = getSequence(id);
  const activeMode = mode ?? manifest.mode;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [inView, setInView] = useState(priority);
  const [reduced, setReduced] = useState(false);
  const [painted, setPainted] = useState(false);
  const [renditionWidth, setRenditionWidth] = useState(() => manifest.widths[0] ?? 1440);

  const { framesRef, ready } = useFrameLoader(
    manifest,
    renditionWidth,
    painted && inView && !reduced,
  );

  /** true while the rAF loop below owns the readout for this sequence */
  const drawing = !reduced && inView && ready;

  // ---- hold the frame load until the document has painted --------------
  useEffect(() => onFirstIdle(() => setPainted(true)), []);

  // ---- reduced motion ------------------------------------------------
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // ---- in-view gate: nothing renders or loads off screen --------------
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { rootMargin: "20% 0px" },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // ---- rendition selection -------------------------------------------
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const measure = () => {
      const next = pickWidth(manifest, wrapper.clientWidth, window.devicePixelRatio);
      setRenditionWidth((previous) => (previous === next ? previous : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [manifest]);

  // ---- dominance: exactly one sequence owns the readout ----------------
  // Registered for the whole mounted lifetime, not just while in view — the
  // arbiter decides what "in view" means for the readout, and `measure`
  // returning null is how a sequence declines to compete.
  useEffect(() => {
    return registerDominance(manifest.id, {
      order: sequenceOrder(manifest.id),
      measure: () => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return null;
        const rect = wrapper.getBoundingClientRect();
        const viewport = window.innerHeight;
        if (rect.height <= 0 || rect.bottom <= 0 || rect.top >= viewport) return null;
        return Math.abs((rect.top + rect.bottom) / 2 - viewport / 2);
      },
    });
  }, [manifest]);

  // ---- whenever the draw loop is not running, the poster frame stands in.
  // Covers reduced motion (which draws nothing at all) and the window between
  // the document painting and the first frames decoding.
  useEffect(() => {
    if (drawing) return;
    const sync = () => {
      if (!isDominant(manifest.id)) return;
      publishFrameState({
        id: manifest.id,
        label: manifest.label,
        frame: manifest.posterFrame,
        total: manifest.frameCount,
      });
    };
    sync();
    return subscribeDominance(sync);
  }, [drawing, manifest]);

  // ---- never leave a stale readout behind ------------------------------
  useEffect(() => {
    return () => clearFrameState(manifest.id);
  }, [manifest]);

  // ---- draw loop -------------------------------------------------------
  useEffect(() => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const fit: CoverFitRect = { dx: 0, dy: 0, dw: 0, dh: 0 };
    const total = manifest.frameCount;
    const scrubTarget = scrubTargetId ? document.getElementById(scrubTargetId) : wrapper;

    let raf = 0;
    let lastDrawn = -1;
    let loopFrame = 0;
    let loopAccumulator = 0;
    let lastTime = 0;
    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = wrapper.clientWidth;
      cssHeight = wrapper.clientHeight;
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawn = -1;
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);

    const paint = (index: number) => {
      const image = framesRef.current[index];
      if (!image) return;
      if (index === lastDrawn) return;
      lastDrawn = index;
      coverFit(cssWidth, cssHeight, manifest.aspect, fit);
      context.clearRect(0, 0, cssWidth, cssHeight);
      context.drawImage(image, fit.dx, fit.dy, fit.dw, fit.dh);
    };

    const nearest = (index: number) => {
      // Fall back to the closest already-decoded frame while loading catches up.
      for (let offset = 0; offset < total; offset += 1) {
        const back = index - offset;
        if (back >= 0 && framesRef.current[back]) return back;
        const forward = index + offset;
        if (forward < total && framesRef.current[forward]) return forward;
      }
      return -1;
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      let index: number;

      if (activeMode === "scrub" && scrubTarget) {
        const rect = scrubTarget.getBoundingClientRect();
        const travel = rect.height - window.innerHeight;
        const progress = travel > 0 ? clamp01(-rect.top / travel) : 0;
        index = Math.min(total - 1, Math.round(progress * (total - 1)));
      } else {
        // Accumulate our own delta and clamp it — a tab restore hands back a
        // huge dt, and a raw elapsed-time counter loses precision over time.
        const delta = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        loopAccumulator += delta * LOOP_FPS;
        if (loopAccumulator >= 1) {
          loopFrame = (loopFrame + Math.floor(loopAccumulator)) % total;
          loopAccumulator %= 1;
        }
        index = loopFrame;
      }

      const resolved = framesRef.current[index] ? index : nearest(index);
      if (resolved < 0) return;
      paint(resolved);
      // Publishing sits outside `paint` deliberately: `paint` short-circuits
      // when the index has not moved, and a sequence that has just won
      // dominance at a static scroll position must still be able to claim the
      // readout. `publishFrameState` dedupes by value, so this is cheap.
      if (isDominant(manifest.id)) {
        publishFrameState({
          id: manifest.id,
          label: manifest.label,
          frame: resolved + 1,
          total,
        });
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      context.clearRect(0, 0, cssWidth, cssHeight);
      canvas.width = 0;
      canvas.height = 0;
      clearFrameState(manifest.id);
    };
  }, [activeMode, drawing, framesRef, manifest, scrubTargetId]);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden bg-graphite ${className ?? ""}`}
      style={{ aspectRatio: String(manifest.aspect) }}
    >
      {/* Static poster: paints from the SSR HTML with no JS, and is the LCP
          candidate for the hero. The canvas draws over it once frames decode.

          `loading` matters as much as `fetchPriority` here. With it unset, all
          four posters were fetched at ~188ms on a throttled phone — including
          the three case posters, which sit thousands of pixels below the fold.
          Measured: 25 + 30 + 32 + 29 KB, ~91 KB of it off-screen, in flight
          alongside the two woff2 files that did not finish until 1349ms.
          `fetchPriority="auto"` lowers their rank in the queue; it does not
          stop them being requested. Only the hero's is eager. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={manifest.posterSrc}
        alt=""
        aria-hidden="true"
        fetchPriority={priority ? "high" : "auto"}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={manifest.alt}
        className="absolute inset-0 h-full w-full"
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={manifest.posterSrc}
          alt={manifest.alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </noscript>
    </div>
  );
}
