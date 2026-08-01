'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { prefersReducedMotion } from '@/lib/device-tier';

/**
 * Magnetic hover.
 *
 * The element leans toward the cursor while it is nearby. Applied to primary
 * CTAs only — used on everything it becomes noise, and the effect works
 * precisely because most of the page does not do it.
 *
 * Constraints that keep it from being annoying:
 *  - Displacement is capped and small. A button that runs away from the
 *    pointer is a usability bug, not a delight.
 *  - The wrapper never moves, only the visual child, so layout cannot shift
 *    and neighbouring elements never reflow.
 *  - Disabled entirely for coarse pointers and reduced motion.
 */

const STRENGTH = 0.28;
const MAX_OFFSET = 10;

export function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Spring rather than a tween: the return-to-rest is what sells the weight.
  const springX = useSpring(x, { stiffness: 220, damping: 22, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 220, damping: 22, mass: 0.6 });

  const enabled =
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: fine)').matches &&
    !prefersReducedMotion();

  function onMove(event: React.MouseEvent<HTMLSpanElement>) {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    x.set(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx * STRENGTH)));
    y.set(Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dy * STRENGTH)));
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      className={className}
      style={{ display: 'inline-block' }}
    >
      <motion.span style={{ x: springX, y: springY, display: 'inline-block' }}>
        {children}
      </motion.span>
    </span>
  );
}
