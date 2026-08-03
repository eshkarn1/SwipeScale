'use client';

import Link from 'next/link';
import { OFFERINGS } from '@/content/offerings';
import { Reveal, RevealLines } from '@/components/motion/Reveal';
import { AmbientBackdrop } from '@/components/sections/AmbientBackdrop';
import { STAGGER } from '@/lib/motion-tokens';

/**
 * Offerings — storyboard beat 3 (15–32%, pinned).
 *
 * In the full choreography the hero object separates into three forms here and
 * each card locks to its form's screen position. The DOM side is built to that
 * contract already: `data-form-index` is what the scene reads to know which
 * card belongs to which form.
 */
export function Offerings() {
  return (
    <section
      id="offerings"
      data-beat="offerings"
      className="relative z-10 overflow-hidden"
      aria-labelledby="offerings-heading"
    >
      {/* Clear-side right: this section's heading sits left, so the field is
          pushed the other way from the problem section above it. */}
      <AmbientBackdrop clearSide="left" intensity={0.85} seed={2.8} density={2.1} />

      <div className="relative mx-auto max-w-[var(--container-page)] px-6 py-32 md:px-12 md:py-40">
      <div className="max-w-[46ch]">
        <Reveal>
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">
            Three ways to buy
          </p>
        </Reveal>
        <RevealLines
          as="h2"
          id="offerings-heading"
          className="mt-6 text-4xl"
          lines={['Start with one task,', 'or hand over the whole', 'workflow.']}
        />
      </div>

      <ul className="mt-16 grid gap-4 md:grid-cols-3">
        {OFFERINGS.map((offering, i) => (
          <li key={offering.id} data-form-index={offering.formIndex}>
            <Reveal delay={i * STAGGER.item} className="h-full">
              <Link
                href={offering.href}
                className="group flex h-full flex-col gap-4 rounded-[var(--radius-lg)] border border-hairline bg-surface p-8 transition-colors duration-[var(--duration-base)] hover:border-edge"
              >
                <p className="font-mono text-2xs uppercase tracking-[0.16em] text-accent">
                  {offering.eyebrow}
                </p>
                <h3 className="text-2xl">{offering.title}</h3>
                <p className="text-sm text-text-muted">{offering.description}</p>

                <p className="mt-auto border-t border-hairline pt-4 text-sm text-text-faint">
                  <span className="text-text-muted">Best for </span>
                  {offering.bestFor}
                </p>
                <span className="text-sm font-semibold text-accent">
                  {offering.cta}
                  <span
                    aria-hidden="true"
                    className="ml-1.5 inline-block transition-transform duration-[var(--duration-fast)] group-hover:translate-x-1"
                  >
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          </li>
        ))}
        </ul>
      </div>
    </section>
  );
}
