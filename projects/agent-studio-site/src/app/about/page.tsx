import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'How we work, what we will tell you no about, and the principles behind every agent we ship.',
};

/**
 * About.
 *
 * No team photos, no founding story, no headcount — none of it is available
 * and inventing it would be the easiest thing on this site to catch out.
 * What IS ours to state is how we work, so the page is built entirely from
 * operating principles. For this audience that is more useful anyway: they
 * are deciding whether to trust a supplier, not making a friend.
 */
const PRINCIPLES = [
  {
    title: 'We will tell you when the answer is no',
    body: 'Plenty of processes should not be automated — too rare, too variable, or too consequential to hand over. Saying so on the first call costs us a sale and saves you a quarter. It happens often enough that we lead with it.',
  },
  {
    title: 'A human keeps the last decision',
    body: 'Every agent has a written boundary between what it decides alone and what it escalates. Anything with a consequence for a customer, an employee, or your books sits on the human side of that line by default.',
  },
  {
    title: 'Boring beats clever',
    body: 'An agent that does one narrow thing reliably is worth more than one that attempts everything and needs supervising. We would rather ship something unglamorous that you stop thinking about.',
  },
  {
    title: 'You should be able to leave',
    body: 'Documentation good enough for another team to pick up the work is part of every handover, not an upsell. Lock-in built on switching cost rather than on doing good work is not a business we want.',
  },
  {
    title: 'We show the real cost',
    body: 'Model usage is billed at cost plus a stated margin rather than marked up invisibly. You can see what the underlying providers charge and what we add.',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <header className="max-w-[52ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">About</p>
        <h1 className="mt-6 text-5xl">How we work.</h1>
        <p className="mt-6 text-lg text-text-muted">
          We build AI agents for teams that want the work done, not a platform
          to administer. These are the rules we hold ourselves to — they are the
          useful thing to know about a supplier.
        </p>
      </header>

      <ol className="mt-20 flex flex-col">
        {PRINCIPLES.map((p, i) => (
          <li
            key={p.title}
            className="grid gap-4 border-t border-hairline py-10 md:grid-cols-[auto_1fr_1.6fr] md:gap-10"
          >
            <span aria-hidden="true" className="font-mono text-sm tabular-nums text-accent">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h2 className="text-xl">{p.title}</h2>
            <p className="text-text-muted">{p.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-16 flex flex-col gap-5 rounded-[var(--radius-lg)] border border-edge bg-surface p-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[46ch]">
          <h2 className="text-2xl">Test us on the first call</h2>
          <p className="mt-3 text-sm text-text-muted">
            Bring the process you think is worst. If automating it is a bad
            idea, we will say so and tell you why.
          </p>
        </div>
        <Link
          href="/contact"
          className="shrink-0 rounded-[var(--radius-full)] bg-accent px-8 py-4 text-sm font-semibold text-accent-ink transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5"
        >
          Book a call
        </Link>
      </div>
    </div>
  );
}
