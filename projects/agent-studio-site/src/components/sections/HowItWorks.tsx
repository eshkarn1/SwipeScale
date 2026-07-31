'use client';

import { PROCESS } from '@/content/offerings';
import { Reveal, RevealLines } from '@/components/motion/Reveal';
import { STAGGER } from '@/lib/motion-tokens';

/**
 * How it works — storyboard beat 4 (32–48%, scrubbed).
 *
 * Each step carries `data-waypoint`, which the camera path reads to know where
 * to be when that step is in view. The steps are numbered because the sequence
 * is genuinely load-bearing: you cannot hand over before running in parallel.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      data-beat="process"
      className="relative z-10 border-t border-hairline"
      aria-labelledby="process-heading"
    >
      <div className="mx-auto max-w-[var(--container-page)] px-6 py-32 md:px-12 md:py-40">
        <div className="max-w-[46ch]">
          <Reveal>
            <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">
              How it works
            </p>
          </Reveal>
          <RevealLines
            as="h2"
            id="process-heading"
            className="mt-6 text-4xl"
            lines={['Four steps. No', 'migration, no rebuild.']}
          />
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-hairline md:grid-cols-4">
          {PROCESS.map((step, i) => (
            <li key={step.n} data-waypoint={step.waypoint} className="bg-surface">
              <Reveal delay={i * STAGGER.item} className="flex h-full flex-col gap-3 p-8">
                <span
                  className="font-mono text-sm text-accent tabular-nums"
                  aria-hidden="true"
                >
                  {String(step.n).padStart(2, '0')}
                </span>
                <h3 className="text-lg">{step.title}</h3>
                <p className="text-sm text-text-muted">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
