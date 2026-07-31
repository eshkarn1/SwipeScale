'use client';

import Link from 'next/link';
import { Reveal, RevealLines } from '@/components/motion/Reveal';

/**
 * Close — storyboard beat 8 (90–100%, pinned).
 *
 * One CTA, no competing secondary. This is the primary conversion and it gets
 * the frame to itself; the storyboard has the three forms merging back into the
 * single opening object behind it, closing the loop.
 */
export function ClosingCTA() {
  return (
    <section
      data-beat="close"
      className="relative z-10 border-t border-hairline"
      aria-labelledby="close-heading"
    >
      <div className="mx-auto flex max-w-[var(--container-page)] flex-col items-start px-6 py-32 md:px-12 md:py-48">
        <RevealLines
          as="h2"
          id="close-heading"
          className="max-w-[18ch] text-5xl"
          lines={['Find the task', 'worth automating', 'first.']}
        />

        <Reveal delay={0.2}>
          <p className="mt-8 max-w-[52ch] text-lg text-text-muted">
            A short call, no deck. We look at where your team actually loses
            hours and tell you honestly whether an agent is the right answer —
            including when it isn’t.
          </p>
        </Reveal>

        <Reveal delay={0.32}>
          <Link
            href="/contact"
            className="mt-12 inline-block rounded-[var(--radius-full)] bg-accent px-9 py-4 text-base font-semibold text-accent-ink transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5"
          >
            Book a call
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
