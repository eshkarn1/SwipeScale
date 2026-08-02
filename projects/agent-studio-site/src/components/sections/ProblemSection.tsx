'use client';

import { Reveal, RevealLines } from '@/components/motion/Reveal';
import { AmbientBackdrop } from '@/components/sections/AmbientBackdrop';
import { STAGGER } from '@/lib/motion-tokens';

/**
 * The problem — the missing beat.
 *
 * The page previously went hero → offerings, which asks a visitor to care
 * about what we sell before we have shown we understand what is wrong. For an
 * ops lead or founder, this section is where they decide whether we are worth
 * reading; everything after it is only interesting once they have recognised
 * themselves here.
 *
 * Written as observations rather than claims. No statistics — a fabricated
 * "teams lose 12 hours a week" is worth less than a specific, recognisable
 * description of a Tuesday.
 */
const SYMPTOMS = [
  {
    title: 'The work nobody owns',
    body: 'Copying between two systems. Chasing the same three people every week. It never appears on a roadmap because it is not a project — it is just Tuesday.',
  },
  {
    title: 'Your best people, on your dullest work',
    body: 'The person who understands the process is the one doing it manually, which means they are not doing the thing you actually hired them for.',
  },
  {
    title: 'Tools that need a team you don’t have',
    body: 'Most automation assumes an in-house AI engineer to configure it and keep it running. If you had one, you would not be reading this.',
  },
];

export function ProblemSection() {
  return (
    <section
      data-beat="problem"
      className="relative z-10 overflow-hidden border-t border-hairline bg-void"
      aria-labelledby="problem-heading"
    >
      {/* Ambient field, biased so the left stays black under the heading. */}
      <AmbientBackdrop clearSide="left" intensity={1.15} />

      <div className="relative mx-auto max-w-[var(--container-page)] px-6 py-32 md:px-12 md:py-40">
        <div className="max-w-[46ch]">
          <Reveal>
            <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">
              The problem
            </p>
          </Reveal>
          <RevealLines
            as="h2"
            id="problem-heading"
            className="mt-6 text-4xl"
            lines={['You already know', 'which hours are', 'being wasted.']}
          />
          <Reveal delay={0.3}>
            <p className="mt-8 text-lg text-text-muted">
              Every team has work that is important, repetitive, and beneath the
              people doing it. It rarely gets fixed, because fixing it has never
              been anyone&apos;s job.
            </p>
          </Reveal>
        </div>

        <ul className="mt-20 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-hairline md:grid-cols-3">
          {SYMPTOMS.map((s, i) => (
            <li key={s.title} className="bg-surface">
              <Reveal delay={i * STAGGER.item} className="flex h-full flex-col gap-4 p-8">
                <h3 className="text-lg">{s.title}</h3>
                <p className="text-sm text-text-muted">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
