'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DURATION, EASE } from '@/lib/motion-tokens';
import { resetSceneState } from '@/lib/scene-state';

/**
 * Route transition.
 *
 * The brief asks that route changes never hard-reload — the 3D scene animates
 * between states while DOM content cross-fades over it. That is why the canvas
 * lives in the root layout and is never unmounted here: this component fades
 * the *content*, and the WebGL context, loaded geometry, and compiled shaders
 * all survive the navigation.
 *
 * A short opacity-and-lift cross-fade, deliberately: anything longer sits
 * between the visitor and the page they asked for, and a heavy transition on
 * every click is the fastest way to make a fast site feel slow.
 *
 * Two things that have to happen on every navigation and are easy to forget:
 *
 *  - `ScrollTrigger.refresh()`. Triggers were measured against the previous
 *    page's height. Without this, choreography on the new page fires at the
 *    wrong scroll positions — and it looks like a scroll bug, not a routing
 *    one.
 *  - `resetSceneState()`. Otherwise a new page inherits the last page's
 *    separation and beat, and the scene opens mid-pose.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    resetSceneState();

    // Wait a frame so the incoming content has laid out and the document has
    // its real height before ScrollTrigger measures it.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.outExpo }}
    >
      {children}
    </motion.div>
  );
}
