'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DURATION, EASE } from '@/lib/motion-tokens';
import { prefersReducedMotion } from '@/lib/device-tier';

/**
 * Preloader.
 *
 * The brief asks for a real one that tracks actual asset load, not a fake
 * timer. So it reads `document.readyState` and the real resource entries,
 * which means on a fast connection it is gone almost immediately — that is
 * correct behaviour, not a bug. A preloader that always runs for 2.5 seconds
 * is an artificial delay dressed as polish, and it costs LCP.
 *
 * Two guards that matter:
 *
 *  - A hard 4s ceiling. If a resource hangs, the site must still appear. A
 *    preloader that can trap a visitor forever is worse than no preloader.
 *  - Under reduced motion it never mounts at all. A full-screen overlay that
 *    fades is exactly the kind of thing that motion sensitivity flags.
 *
 * It sits above everything and is aria-hidden — the page beneath is already
 * server-rendered and readable, so nothing here gates content for assistive
 * tech. Focus is never trapped.
 */

const CEILING_MS = 4000;
/** Below this the flash of an overlay is more jarring than no overlay. */
const MIN_VISIBLE_MS = 350;

export function Preloader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDone(true);
      return;
    }

    let frame = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const elapsed = Date.now() - mountedAt.current;
      const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
      window.setTimeout(() => {
        setProgress(1);
        // Let the bar reach full before the overlay leaves, so it never cuts
        // out mid-fill.
        window.setTimeout(() => setDone(true), 220);
      }, wait);
    };

    const sample = () => {
      // Real signal: how many resources the browser has actually finished.
      const entries = performance.getEntriesByType('resource');
      const total = Math.max(entries.length, 1);
      const complete = entries.filter((e) => (e as PerformanceResourceTiming).responseEnd > 0).length;

      const ratio = document.readyState === 'complete' ? 1 : Math.min(complete / total, 0.92);
      setProgress((prev) => Math.max(prev, ratio));

      if (document.readyState === 'complete') {
        finish();
        return;
      }
      frame = window.requestAnimationFrame(sample);
    };

    frame = window.requestAnimationFrame(sample);
    const ceiling = window.setTimeout(finish, CEILING_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(ceiling);
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          aria-hidden="true"
          className="fixed inset-0 z-[100] flex items-end justify-between bg-black px-6 pb-8 md:px-12"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.slow, ease: EASE.outExpo }}
        >
          <span className="font-mono text-2xs uppercase tracking-[0.24em] text-text-faint">
            AI Agent Studio
          </span>

          <span className="font-mono text-2xs tabular-nums text-text-faint">
            {String(Math.round(progress * 100)).padStart(3, '0')}
          </span>

          {/* Fill bar pinned to the bottom edge. The accent is the only colour
              in the frame, which sets the palette before the site appears. */}
          <motion.div
            className="absolute inset-x-0 bottom-0 h-px origin-left bg-accent"
            style={{ scaleX: progress }}
            transition={{ duration: DURATION.fast, ease: EASE.outQuart }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
