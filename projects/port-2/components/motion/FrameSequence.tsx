"use client";

import { useEffect, useRef, useState } from "react";
// `gsap` core MUST be imported alongside the plugin subpath. gsap has no
// exports map, and the ambient `declare module "gsap/ScrollTrigger"` only loads
// via the /// <reference> chain inside types/index.d.ts, which TypeScript only
// pulls in when something resolves the bare "gsap" specifier. Without this line
// the next one fails with TS7016 and looks like missing types.
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  clampDpr,
  framePath,
  getSequence,
  resolveSource,
  timecode,
  type FrameSource,
} from "@/lib/sequences";
import { drawableHeight, drawableWidth } from "./bitmapBudget";
import { registerDebugStore } from "./debug";
import { FrameStore } from "./FrameStore";
import { notifyHeroPassAComplete, whenIdleAfterHero } from "./idle";
import type { FrameSequenceProps } from "./types";
import { coverRectInto, type CoverRect } from "./useCoverFit";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/** §8: never leave the page behind a loader, however slow the connection. */
const PASS_A_WATCHDOG_MS = 8000;

/** §4: resize is debounced before the expensive work. */
const RESIZE_SETTLE_MS = 150;

/** §3 Pass C boundary, reused as the release boundary. */
const LOAD_MARGIN = "200%";

export default function FrameSequence({
  id,
  mode,
  className,
  scrollLength = 3,
  fps,
  onReady,
  renderLoading,
}: FrameSequenceProps) {
  const manifest = getSequence(id);
  const reduced = usePrefersReducedMotion();

  const sectionRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  // Callbacks live in refs so that a parent re-rendering with a new inline
  // function does not tear down and rebuild the whole engine.
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  /* ---------------------------------------------------------------- *
   * Reduced motion (§8) — a genuinely separate path.
   * No FrameStore, no preload, no rAF, no ScrollTrigger, no pin.
   * One still, drawn once, redrawn only if the box changes size.
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (!reduced) return;
    const canvas = canvasRef.current;
    const box = pinRef.current;
    const poster = posterRef.current;
    if (!canvas || !box || !poster) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const rect: CoverRect = { x: 0, y: 0, w: 0, h: 0 };
    let settleTimer: number | null = null;

    // The poster IS `posterFrame` — it is the same image, already in the SSR
    // HTML and already fetched. Drawing the element rather than re-fetching
    // /seq/<id>/<tier>/frame_0001.webp loads exactly one frame, as §8 requires,
    // and costs zero extra bytes.
    const draw = () => {
      if (!poster.complete || poster.naturalWidth === 0) return;
      const dpr = clampDpr(window.devicePixelRatio || 1);
      const cssW = box.clientWidth;
      const cssH = box.clientHeight;
      if (cssW === 0 || cssH === 0) return;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      coverRectInto(cssW, cssH, poster.naturalWidth, poster.naturalHeight, rect);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(poster, rect.x, rect.y, rect.w, rect.h);
    };

    draw();
    poster.addEventListener("load", draw);

    const observer = new ResizeObserver(() => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(draw, RESIZE_SETTLE_MS);
    });
    observer.observe(box);

    setReady(true);
    onReadyRef.current?.();

    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      poster.removeEventListener("load", draw);
      observer.disconnect();
    };
  }, [reduced]);

  /* ---------------------------------------------------------------- *
   * Full engine
   * ---------------------------------------------------------------- */
  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const box = pinRef.current;
    const canvas = canvasRef.current;
    const poster = posterRef.current;
    if (!section || !box || !canvas || !poster) return;

    // alpha:true is deliberate. An opaque context paints black immediately and
    // would hide the poster underneath it before the first frame decodes,
    // taking the LCP element with it.
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const isHero = id === "hero";
    const frameDuration = 1000 / (fps ?? manifest.fps);

    let frameCount = manifest.frameCount;
    let cssW = 0;
    let cssH = 0;
    let targetFrame = 1;
    let drawnFrame = -1;
    let posterHidden = false;
    let readyFired = false;

    const rect: CoverRect = { x: 0, y: 0, w: 0, h: 0 };
    const scrubProxy = { p: 0 };

    const currentSource = (): FrameSource =>
      resolveSource(manifest, window.innerWidth, window.devicePixelRatio || 1);

    const fireReady = () => {
      if (readyFired) return;
      readyFired = true;
      setReady(true);
      onReadyRef.current?.();
    };

    const store = new FrameStore(manifest, currentSource(), {
      onPassAComplete: () => {
        if (isHero) notifyHeroPassAComplete();
        fireReady();
      },
      onPassAProgress: setProgress,
      onFrameAvailable: () => {
        // A newly arrived frame may be a better match than what is drawn.
        drawnFrame = -1;
      },
    });
    frameCount = store.getFrameCount();

    const unregisterDebug = registerDebugStore(store);

    // §8: Pass A may never complete on a bad connection. The poster is already
    // on screen; release the page anyway rather than sit behind a loader.
    const watchdog = window.setTimeout(fireReady, PASS_A_WATCHDOG_MS);

    /* ---- canvas sizing (§4) ---- */
    const resizeCanvas = () => {
      const dpr = clampDpr(window.devicePixelRatio || 1);
      cssW = box.clientWidth;
      cssH = box.clientHeight;
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      // Setting .width resets context state, so the transform goes after it.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawnFrame = -1;
    };

    /* ---- draw loop (§5) ---- */
    let rafId = 0;
    let running = false;
    let t0 = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);

      if (mode === "loop") {
        targetFrame = (Math.floor((now - t0) / frameDuration) % frameCount) + 1;
      } else {
        // Read the SMOOTHED scroll progress that GSAP's scrub tween is easing.
        // Nothing is ever drawn from a scroll handler or from ScrollTrigger's
        // own onUpdate — §10.
        targetFrame = Math.min(
          frameCount,
          Math.max(1, Math.round(scrubProxy.p * (frameCount - 1)) + 1),
        );
      }

      if (targetFrame === drawnFrame) return;
      const drawable = store.nearestLoaded(targetFrame);
      if (!drawable) return;

      coverRectInto(cssW, cssH, drawableWidth(drawable), drawableHeight(drawable), rect);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(drawable, rect.x, rect.y, rect.w, rect.h);
      drawnFrame = targetFrame;

      store.setPlayhead(targetFrame);
      // Published from inside the draw, immediately after drawImage, so the
      // readout can never lag the pixels.
      timecode.set(id, targetFrame, frameCount);

      if (!posterHidden) {
        posterHidden = true;
        // No transition: a cross-fade between two identical images is a flash.
        poster.style.visibility = "hidden";
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      if (mode === "loop") t0 = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    /* ---- visibility: an offscreen or backgrounded canvas costs zero ---- */
    let visible = false;

    const syncRunning = () => {
      if (visible && !document.hidden) start();
      else stop();
    };

    const playbackObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        visible = entry.isIntersecting;
        timecode.reportVisibility(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        syncRunning();
      },
      { threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] },
    );
    playbackObserver.observe(box);

    const onVisibilityChange = () => syncRunning();
    document.addEventListener("visibilitychange", onVisibilityChange);

    /* ---- Pass C gating (§3) ---- */
    let inMargin = false;
    let seen = false;
    let idleAllowed = isHero;

    const applyPhase = () => {
      if (inMargin) store.setPhase("full");
      else if (idleAllowed || seen) store.setPhase("passA");
      else store.setPhase("off");
    };

    const loadObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        inMargin = entry.isIntersecting;
        if (inMargin) seen = true;
        applyPhase();
      },
      { rootMargin: LOAD_MARGIN },
    );
    loadObserver.observe(box);

    const cancelIdleWait = isHero
      ? () => {}
      : whenIdleAfterHero(() => {
          idleAllowed = true;
          applyPhase();
        });

    applyPhase();

    /* ---- resize: cheap now, expensive on settle (§4) ---- */
    let settleTimer: number | null = null;

    const onSettled = () => {
      const next = currentSource();
      store.setSource(next);
      const nextCount = store.getFrameCount();
      if (nextCount !== frameCount) {
        frameCount = nextCount;
        drawnFrame = -1;
      }
      if (mode === "scrub") ScrollTrigger.refresh();
    };

    const resizeObserver = new ResizeObserver(() => {
      // Immediate, so the backing store never lags the box and stretches the
      // frame for 150 ms. Only the tier re-evaluation and the ScrollTrigger
      // refresh are debounced.
      resizeCanvas();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(onSettled, RESIZE_SETTLE_MS);
    });
    resizeObserver.observe(box);
    resizeCanvas();

    /* ---- scrub driver (§5) ---- */
    let scrubTween: gsap.core.Tween | null = null;

    if (mode === "scrub") {
      gsap.registerPlugin(ScrollTrigger);
      // iOS Safari collapses the address bar mid-scroll, which changes the
      // viewport height and makes the pin jump. Cannot be verified in a
      // simulator.
      ScrollTrigger.config({ ignoreMobileResize: true });

      // scrub:0.6 smooths the TWEEN's progress. A bare ScrollTrigger.create()
      // with no animation attached has nothing for scrub to ease, so the
      // smoothing that makes this feel weighted rather than jittery only
      // exists because there is a tween here.
      scrubTween = gsap.to(scrubProxy, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${scrollLength * 100}%`,
          pin: box,
          pinSpacing: true,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
    }

    syncRunning();

    /* ---- teardown: exhaustive (§7 heap-after-unmount budget) ---- */
    return () => {
      window.clearTimeout(watchdog);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      stop();
      cancelIdleWait();
      playbackObserver.disconnect();
      loadObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      scrubTween?.scrollTrigger?.kill();
      scrubTween?.kill();
      unregisterDebug();
      // Aborts every in-flight fetch and .close()s every resident bitmap.
      store.destroy();
      timecode.unregister(id);
      // Release the backing store too; a 1920x1080 canvas is another 8 MB.
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [reduced, id, mode, scrollLength, fps, manifest]);

  const showLoading = !reduced && !ready && renderLoading !== undefined;

  const isScrub = mode === "scrub";
  const boxClass = isScrub
    ? // 100svh, not 100vh: svh is the small viewport height and does not change
      // when the iOS address bar collapses, so the pin does not jump.
      "relative h-[100svh] w-full overflow-hidden bg-void"
    : "relative h-full w-full overflow-hidden bg-void";

  return (
    <div
      ref={sectionRef}
      className={`relative ${className ?? ""}`}
      // §8: reserve the box from the manifest before a single frame loads, so
      // CLS is decided by markup rather than by network timing. The scrub hero
      // reserves a full viewport instead — it is pinned, not aspect-driven.
      style={isScrub ? undefined : { aspectRatio: String(manifest.aspect) }}
    >
      <div ref={pinRef} className={boxClass}>
        {/* Static poster. In the SSR HTML, so it paints in the first frame with
            no JS and makes a fast, well-defined LCP element instead of an empty
            canvas. Hidden — not removed — once the canvas has drawn, because the
            reduced-motion path draws FROM this element. This is one still, not
            <img> swapping for the sequence, so §10 is intact. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={posterRef}
          src={manifest.posterPath}
          alt=""
          aria-hidden="true"
          fetchPriority={isScrub ? "high" : "auto"}
          loading={isScrub ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* role="img" + aria-label is the §8 text alternative. Note that the
            scroll track is NOT aria-hidden: it contains this canvas, and hiding
            it would suppress the very description §8 asks for. The track adds no
            headings, landmarks or copy of its own, so it announces nothing
            extra. */}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={manifest.alt}
          className="absolute inset-0 h-full w-full"
        />

        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={manifest.posterPath}
            alt={manifest.alt}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </noscript>

        {showLoading ? (
          // pointer-events-none: an overlay above a canvas otherwise swallows
          // every click and the interaction silently does nothing.
          <div className="pointer-events-none absolute bottom-[var(--gutter)] right-[var(--gutter)] z-10">
            {renderLoading(progress)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
