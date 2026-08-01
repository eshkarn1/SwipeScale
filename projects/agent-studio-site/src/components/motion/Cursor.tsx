'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

/**
 * Custom cursor.
 *
 * Deliberately additive, not a replacement: the native cursor stays visible.
 * Hiding it is the common mistake — a custom cursor that lags by even a frame
 * feels broken when there is nothing accurate underneath it, and the moment
 * a canvas or an iframe swallows pointer events the visitor has no cursor at
 * all. This is a ring that trails the real one and widens over interactive
 * targets.
 *
 * Never mounts for coarse pointers or reduced motion. Purely decorative, so
 * it is aria-hidden and pointer-events-none — it can never intercept a click.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 400, damping: 30, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 400, damping: 30, mass: 0.4 });

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || calm) return;
    setEnabled(true);

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);

      // Widen over anything actually interactive. `closest` handles the common
      // case of the pointer being over a span inside a link.
      const el = e.target as Element | null;
      setActive(Boolean(el?.closest?.('a, button, input, textarea, select, [role="button"]')));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[90] rounded-full border border-accent mix-blend-difference"
      style={{
        x: springX,
        y: springY,
        translateX: '-50%',
        translateY: '-50%',
      }}
      animate={{
        width: active ? 44 : 22,
        height: active ? 44 : 22,
        opacity: active ? 0.9 : 0.45,
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
    />
  );
}
