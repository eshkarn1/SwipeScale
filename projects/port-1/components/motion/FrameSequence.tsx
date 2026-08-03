// PLACEHOLDER — owned by Script 2 (motion engine). Public API is contractual; implementation is not.
"use client";

import { useEffect, useRef, useState } from "react";
import { clearFrameState, getSequence, pickWidth, publishFrameState } from "@/lib/sequences";
import { coverFit } from "./useCoverFit";
import { useFrameLoader } from "./useFrameLoader";
import type { CoverFitRect, FrameSequenceProps } from "./types";

const LOOP_FPS = 24;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
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
  const [renditionWidth, setRenditionWidth] = useState(() => manifest.widths[0] ?? 1440);

  const { framesRef, ready } = useFrameLoader(manifest, renditionWidth, inView && !reduced);

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

  // ---- reduced motion: publish the poster frame, draw nothing ---------
  useEffect(() => {
    if (!reduced || !inView) return;
    publishFrameState({
      id: manifest.id,
      label: manifest.label,
      frame: manifest.posterFrame,
      total: manifest.frameCount,
    });
    return () => clearFrameState(manifest.id);
  }, [reduced, inView, manifest]);

  // ---- draw loop -------------------------------------------------------
  useEffect(() => {
    if (reduced || !inView || !ready) return;
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
      publishFrameState({
        id: manifest.id,
        label: manifest.label,
        frame: index + 1,
        total,
      });
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
      if (resolved >= 0) paint(resolved);
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
  }, [activeMode, framesRef, inView, manifest, ready, reduced, scrubTargetId]);

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden bg-graphite ${className ?? ""}`}
      style={{ aspectRatio: String(manifest.aspect) }}
    >
      {/* Static poster: paints from the SSR HTML with no JS, and is the LCP
          candidate for the hero. The canvas draws over it once frames decode. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={manifest.posterSrc}
        alt=""
        aria-hidden="true"
        fetchPriority={priority ? "high" : "auto"}
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
