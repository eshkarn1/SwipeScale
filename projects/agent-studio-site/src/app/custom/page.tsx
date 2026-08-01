import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import plate from '../../../public/img/agent-plate.jpg';

export const metadata: Metadata = {
  title: 'Custom agents',
  description:
    'Agents built against your process, your data, and your tools. Discovery, scoping, build, deploy, support — with honest timelines.',
};

/**
 * Custom agents.
 *
 * The five stages are numbered because the order is real and load-bearing: you
 * cannot deploy before running in parallel, and you cannot scope before
 * discovery. Timeline ranges are honest ranges rather than a single optimistic
 * number — a buyer who is told "two weeks" and gets six weeks does not buy again.
 */
const STAGES = [
  {
    n: 1,
    title: 'Discovery',
    duration: '1 week',
    body: 'We sit with the people who do the work today and watch how it actually happens — which is rarely how the process document says it happens.',
  },
  {
    n: 2,
    title: 'Scoping',
    duration: '1–2 weeks',
    body: 'A written spec: what the agent will do, what it will refuse to do, what it hands to a person, and how you will know it is working. You approve it before we build.',
  },
  {
    n: 3,
    title: 'Build',
    duration: '3–8 weeks',
    body: 'Built against your real data and connected to your real tools. You see working software at the end of every week, not at the end of the project.',
  },
  {
    n: 4,
    title: 'Parallel run',
    duration: '2–4 weeks',
    body: 'It works alongside your team, doing the same tasks, so you can compare its output against theirs before anything is handed over. This stage is where trust is earned or the scope is corrected.',
  },
  {
    n: 5,
    title: 'Handover and support',
    duration: 'Ongoing',
    body: 'Documentation, training, and a named contact. You keep visibility into every decision it makes, and a person can override any of them.',
  },
];

export default function CustomPage() {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <header className="max-w-[52ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">Custom builds</p>
        <h1 className="mt-6 text-5xl">When the work is yours alone.</h1>
        <p className="mt-6 text-lg text-text-muted">
          Some processes live in your team&apos;s heads rather than in a
          playbook. Those need an agent built for them — scoped with the people
          who do the work, tested on your real data, handed over properly.
        </p>
      </header>

      <ol className="mt-20 flex flex-col">
        {STAGES.map((stage) => (
          <li
            key={stage.n}
            className="grid gap-4 border-t border-hairline py-10 md:grid-cols-[auto_1fr_2fr] md:gap-10"
          >
            <span
              aria-hidden="true"
              className="font-mono text-sm tabular-nums text-accent"
            >
              {String(stage.n).padStart(2, '0')}
            </span>
            <div>
              <h2 className="text-xl">{stage.title}</h2>
              <p className="mt-1 font-mono text-2xs uppercase tracking-[0.14em] text-text-faint">
                {stage.duration}
              </p>
            </div>
            <p className="text-text-muted">{stage.body}</p>
          </li>
        ))}
      </ol>

      {/* Same closing treatment as the home page, so the two read as one
          system. Reuses the existing plate rather than a second asset —
          object-position shifts the crop so it does not look like a repeat,
          and the scrim keeps the copy legible. */}
      <div className="relative mt-16 overflow-hidden rounded-[var(--radius-lg)] border border-edge bg-black">
        <Image
          src={plate}
          alt=""
          aria-hidden="true"
          placeholder="blur"
          sizes="(max-width: 768px) 100vw, 1200px"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.8)_55%,rgba(0,0,0,0.55)_100%)] sm:bg-[linear-gradient(95deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.82)_45%,rgba(0,0,0,0.35)_80%,transparent_100%)]"
        />

        <div className="relative flex flex-col gap-5 p-10 sm:flex-row sm:items-center sm:justify-between md:p-14">
          <div className="max-w-[46ch]">
            <h2 className="text-2xl">Start with a scoping call</h2>
            <p className="mt-3 text-sm text-text-muted">
              Before any of the above, a conversation about whether this is
              worth building at all. Sometimes the honest answer is a pre-built
              agent, or nothing.
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
    </div>
  );
}
