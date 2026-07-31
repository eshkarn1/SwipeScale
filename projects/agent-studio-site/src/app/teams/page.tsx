import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Agent teams',
  description:
    'Multi-agent systems that run an entire workflow — a lead that plans and delegates, specialists that execute, and a review gate before anything ships.',
};

/**
 * Agent teams.
 *
 * The 3D node-graph experience — the centerpiece of the brief's 3D work — is
 * deliberately NOT built here yet. It needs one genuine multi-agent workflow
 * with real hand-offs to model, and an invented one will look invented. This
 * page carries the real argument in DOM so the route is complete, crawlable,
 * and converting while that content is gathered.
 */
const PRINCIPLES = [
  {
    title: 'One agent plans, it does not build',
    body: 'The lead holds no ability to change files. It decides what happens and delegates — so the agent deciding the work is never the agent quietly doing it differently.',
  },
  {
    title: 'Specialists work in parallel',
    body: 'Independent parts of a workflow run at the same time rather than queueing behind each other, which is most of where the speed comes from.',
  },
  {
    title: 'Nothing ships past the gate',
    body: 'A reviewing agent checks the output before it reaches a customer or your systems, and can reject it back for rework. The gate sits inside the team, not at the end.',
  },
  {
    title: 'Every decision is traceable',
    body: 'You can see which agent did what, why, and what it handed on. When something goes wrong you get a chain, not a black box.',
  },
];

export default function TeamsPage() {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <header className="max-w-[54ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">Agent teams</p>
        <h1 className="mt-6 text-5xl">A workflow, not a step.</h1>
        <p className="mt-6 text-lg text-text-muted">
          One agent handles a task. A team handles the whole process — planning
          it, splitting it, doing it in parallel, and checking the result before
          anyone outside sees it.
        </p>
      </header>

      <ul className="mt-20 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-hairline sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <li key={p.title} className="flex flex-col gap-3 bg-surface p-8">
            <h2 className="text-lg">{p.title}</h2>
            <p className="text-sm text-text-muted">{p.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-16 flex flex-col gap-5 rounded-[var(--radius-lg)] border border-edge bg-surface p-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-[46ch]">
          <h2 className="text-2xl">Which workflow is costing you most?</h2>
          <p className="mt-3 text-sm text-text-muted">
            Teams are designed around a specific process. We start by finding
            which one is worth the build.
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
