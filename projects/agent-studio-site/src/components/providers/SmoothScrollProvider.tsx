'use client';

import { useEffect, useRef, createContext, useContext, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '@/lib/device-tier';

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);

/** The shared Lenis instance, or null before mount / under reduced motion. */
export function useLenis(): Lenis | null {
  return useContext(LenisContext);
}

/**
 * THE SINGLE RAF LOOP.
 *
 * The brief calls for one RAF driving everything, and this is the file that
 * guarantees it. Three systems each want their own animation frame:
 *
 *   Lenis         — interpolates scroll position
 *   ScrollTrigger — reads scroll and drives timelines
 *   R3F           — renders the WebGL scene
 *
 * Left alone, that is three independent loops reading and writing scroll state
 * at different points in the frame. The symptom is not an obvious crash; it is
 * a persistent one-frame lag between the DOM and the 3D scene that looks like
 * "the canvas feels slightly detached" and is miserable to diagnose later.
 *
 * The fix, in order:
 *   1. Disable Lenis's own RAF (`autoRaf: false`).
 *   2. Make GSAP's ticker the one true clock, and drive Lenis from it.
 *   3. Have Lenis notify ScrollTrigger on every scroll, so ScrollTrigger never
 *      polls the real scroll position — which Lenis has virtualised anyway.
 *   4. `lagSmoothing(0)` so GSAP never silently skips time after a stall; with
 *      scrubbed camera work, a skipped frame becomes a visible camera jump.
 *
 * R3F joins the same ticker in CanvasTicker (see SceneCanvas.tsx) rather than
 * running its own loop. Nothing in this app should ever call
 * requestAnimationFrame directly — if you need a frame, use gsap.ticker.
 */
export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // A calm, designed experience — not a broken one. Under reduced motion we
    // skip Lenis entirely and let the browser scroll natively, but ScrollTrigger
    // still runs so section states resolve; they just snap instead of scrub.
    if (prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      // Matches --ease-out-expo. Lenis wants a function, not control points.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      autoRaf: false, // (1) Lenis must not own a RAF.
    });

    lenisRef.current = lenis;

    // (3) ScrollTrigger reads from Lenis, never from the raw scroll position.
    lenis.on('scroll', ScrollTrigger.update);

    // (2) GSAP's ticker is the clock. GSAP reports seconds; Lenis wants ms.
    const drive = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(drive);

    // (4) Never fabricate skipped time.
    gsap.ticker.lagSmoothing(0);

    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(drive);
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <LenisContext.Provider value={lenisRef.current}>{children}</LenisContext.Provider>;
}
