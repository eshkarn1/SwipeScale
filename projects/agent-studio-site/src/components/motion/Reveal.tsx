'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { motion, useInView } from 'motion/react';
import { DURATION, EASE, STAGGER } from '@/lib/motion-tokens';

/**
 * Staged reveal primitives.
 *
 * The brief asks that nothing appear without motion. That is easy to do badly —
 * a page where every element fades independently reads as noisy rather than
 * crafted. So there are exactly two primitives here, both driven by the shared
 * motion tokens, and everything on the site uses one of them.
 *
 * Both respect prefers-reduced-motion through Motion's own reduced-motion
 * handling: the element still appears, it simply arrives without travel.
 */

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait after the element enters view. */
  delay?: number;
  className?: string;
  as?: ElementType;
}

/** Fade + short rise. The default for anything that is not a headline. */
export function Reveal({ children, delay = 0, className, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // once: the reveal is an entrance, not a scroll-linked effect. Re-firing it
  // on every pass turns a considered moment into a flicker.
  const inView = useInView(ref, { once: true, margin: '0px 0px -12% 0px' });
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: DURATION.slow, ease: EASE.outExpo, delay }}
    >
      {children}
    </MotionTag>
  );
}

interface RevealLinesProps {
  /** Each string is one visual line, revealed from its own mask. */
  lines: string[];
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  delay?: number;
  /** Lands on the heading itself so `aria-labelledby` can target it. */
  id?: string;
}

/**
 * Line-masked headline reveal.
 *
 * Each line sits in an overflow-hidden block and travels out from under it.
 * Lines are passed in explicitly rather than measured at runtime: automatic
 * line-splitting reflows on resize and fights font loading, and the result is
 * headlines that visibly re-wrap mid-animation.
 */
export function RevealLines({ lines, className, as = 'h2', delay = 0, id }: RevealLinesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const Tag = as;

  return (
    <div ref={ref}>
      <Tag className={className} id={id}>
        {lines.map((line, i) => (
          <span className="reveal-mask" key={line}>
            <motion.span
              style={{ display: 'block' }}
              initial={{ y: '110%' }}
              animate={inView ? { y: '0%' } : undefined}
              transition={{
                duration: DURATION.reveal,
                ease: EASE.outExpo,
                delay: delay + i * STAGGER.line,
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </Tag>
    </div>
  );
}
