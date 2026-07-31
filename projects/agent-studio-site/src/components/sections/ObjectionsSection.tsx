'use client';

import { Reveal, RevealLines } from '@/components/motion/Reveal';
import { STAGGER } from '@/lib/motion-tokens';

/**
 * Objections.
 *
 * This sits where a testimonial wall normally would. Client logos and quotes
 * are not available yet and inventing them is not an option, but the gap is
 * worth filling properly rather than leaving a hole: for a cautious B2B buyer,
 * a straight answer to the four things they are actually worried about builds
 * more trust than a row of logos they cannot verify anyway.
 *
 * Every answer here concedes something real. An objection section where the
 * product wins every exchange reads as marketing and gets skipped.
 */
const OBJECTIONS = [
  {
    q: 'What happens when it gets something wrong?',
    a: 'It will. Every agent we ship has a defined boundary: what it decides on its own, and what it hands to a person. Anything with a consequence for a customer or your books goes to a human. You see the reasoning behind each decision, and you can override any of them.',
  },
  {
    q: 'Is this going to replace my team?',
    a: 'Not the way it is usually sold. These agents take tasks, not roles — the copying, the chasing, the triage. If your honest goal is headcount reduction, say so on the call and we will tell you whether this actually gets you there. Often it does not.',
  },
  {
    q: 'What happens to our data?',
    a: 'You stay the controller; we process on your instructions under a DPA. Where a model provider offers a no-training, zero-retention configuration, that is what we use. The full subprocessor list is public, and we give notice before it changes.',
  },
  {
    q: 'What if we want out?',
    a: 'Subscriptions cancel with notice at the end of a billing period. On termination we return or delete your data at your choice. Custom builds are documented well enough that another team could pick them up — that is part of the handover, not an upsell.',
  },
];

export function ObjectionsSection() {
  return (
    <section
      data-beat="evidence"
      className="relative z-10 border-t border-hairline bg-void"
      aria-labelledby="objections-heading"
    >
      <div className="mx-auto max-w-[var(--container-page)] px-6 py-32 md:px-12 md:py-40">
        <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-[38ch] lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">
                Straight answers
              </p>
            </Reveal>
            <RevealLines
              as="h2"
              id="objections-heading"
              className="mt-6 text-4xl"
              lines={['The questions', 'worth asking', 'before you buy.']}
            />
            <Reveal delay={0.3}>
              <p className="mt-8 text-text-muted">
                If any of these answers do not match what you need, that is
                useful to find out now rather than three weeks into a build.
              </p>
            </Reveal>
          </div>

          <dl className="flex flex-col divide-y divide-hairline border-y border-hairline">
            {OBJECTIONS.map((item, i) => (
              <Reveal key={item.q} delay={i * STAGGER.item} className="py-8">
                <dt className="text-xl">{item.q}</dt>
                <dd className="mt-4 text-text-muted">{item.a}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
