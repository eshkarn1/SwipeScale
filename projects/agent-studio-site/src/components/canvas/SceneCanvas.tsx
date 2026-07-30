'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import {
  detectDeviceTier,
  prefersReducedMotion,
  TIER_PROFILES,
  type TierProfile,
} from '@/lib/device-tier';

/**
 * Joins R3F to the GSAP ticker established in SmoothScrollProvider.
 *
 * The Canvas below runs with `frameloop="never"`, which means R3F renders
 * nothing until something calls `advance()`. That call happens here, on the
 * same ticker that drives Lenis and ScrollTrigger — so scroll position, DOM
 * timelines, and the rendered frame all resolve from one clock, in order,
 * within a single frame. See the long note in SmoothScrollProvider.
 */
function CanvasTicker() {
  const advance = useThree((state) => state.advance);

  useEffect(() => {
    // GSAP reports elapsed seconds; R3F's advance expects a ms timestamp.
    const tick = (time: number) => advance(time * 1000);
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [advance]);

  return null;
}

interface SceneCanvasProps {
  children: ReactNode;
  /** Rendered instead of the canvas when WebGL is unavailable. */
  fallback?: ReactNode;
  className?: string;
  /** Describes the scene for assistive tech. The canvas is decorative without it. */
  ariaLabel: string;
}

/**
 * The persistent canvas. Mounted once in the root layout and never unmounted
 * across route changes — the brief requires one continuous scene, so tearing
 * down the WebGL context between pages is not an option. Route transitions
 * animate scene *state*; they do not remount this.
 */
export function SceneCanvas({ children, fallback, className, ariaLabel }: SceneCanvasProps) {
  // Tier detection touches window, so it must happen after mount. Until then
  // we render the fallback — which is also what SSR emits, keeping the server
  // and first client render identical and avoiding a hydration mismatch.
  const [profile, setProfile] = useState<TierProfile | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setProfile(TIER_PROFILES[detectDeviceTier()]);
    setReduced(prefersReducedMotion());

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  if (!profile || profile.tier === 'none') {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className} aria-hidden="true" data-tier={profile.tier} data-reduced={reduced}>
      <Canvas
        // Never R3F's own loop — see CanvasTicker.
        frameloop="never"
        dpr={profile.dpr}
        shadows={profile.shadows}
        gl={{
          antialias: profile.tier === 'high',
          powerPreference: 'high-performance',
          alpha: true,
        }}
        camera={{ fov: 35, near: 0.1, far: 100, position: [0, 0, 8] }}
      >
        <CanvasTicker />
        {children}
      </Canvas>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}
