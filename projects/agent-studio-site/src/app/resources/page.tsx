import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Resources',
  description:
    'Practical writing on choosing what to automate, keeping humans in the loop, and running agents in production.',
};

/**
 * Resources index.
 *
 * No posts exist yet. This renders a real, designed empty state rather than
 * placeholder articles — a blog index padded with lorem or invented titles is
 * immediately obvious and costs more credibility than an empty shelf. The
 * planned topics are honest signposting, not fake content: they are labelled
 * as upcoming and none is linked.
 *
 * Wire to Sanity's `post` type when the first article is written; the grid
 * below is already shaped for it.
 */
const PLANNED = [
  {
    title: 'How to pick the first process to automate',
    note: 'The one your team complains about, not the one that sounds impressive.',
  },
  {
    title: 'Where humans should stay in the loop',
    note: 'Drawing the line between what an agent decides and what it escalates.',
  },
  {
    title: 'What agent pricing actually costs you',
    note: 'Reading model usage bills, and what a fair margin on them looks like.',
  },
];

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <header className="max-w-[52ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">Resources</p>
        <h1 className="mt-6 text-5xl">Writing, shortly.</h1>
        <p className="mt-6 text-lg text-text-muted">
          We would rather publish nothing than publish filler. The first pieces
          are being written now — here is what they cover.
        </p>
      </header>

      <ul className="mt-16 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-hairline md:grid-cols-3">
        {PLANNED.map((item) => (
          <li key={item.title} className="flex flex-col gap-3 bg-surface p-8">
            <p className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">
              Upcoming
            </p>
            <h2 className="text-lg text-text-muted">{item.title}</h2>
            <p className="text-sm text-text-faint">{item.note}</p>
          </li>
        ))}
      </ul>

      <div className="mt-16 max-w-[52ch]">
        <h2 className="text-2xl">In the meantime</h2>
        <p className="mt-4 text-text-muted">
          The most useful thing we publish is the conversation itself. Bring a
          process and we will tell you honestly whether an agent suits it.
        </p>
        <Link
          href="/contact"
          className="mt-8 inline-block rounded-[var(--radius-full)] border border-edge px-7 py-3.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)] hover:bg-raised"
        >
          Book a call
        </Link>
      </div>
    </div>
  );
}
