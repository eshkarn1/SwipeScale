import type { Metadata } from 'next';
import { ContactForm } from '@/components/sections/ContactForm';

export const metadata: Metadata = {
  title: 'Book a call',
  description:
    'A short call to find the task worth automating first — and an honest answer on whether an agent is the right tool for it.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-[var(--container-page)] gap-16 px-6 pb-32 pt-36 md:px-12 md:pt-44 lg:grid-cols-[1fr_1.1fr]">
      <header className="max-w-[46ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">Contact</p>
        <h1 className="mt-6 text-5xl">Book a call.</h1>
        <p className="mt-6 text-lg text-text-muted">
          Thirty minutes, no deck. We look at where your team actually loses
          hours and tell you whether an agent is the right answer — including
          when it isn’t.
        </p>

        <dl className="mt-12 flex flex-col gap-6 border-t border-hairline pt-8 text-sm">
          <div>
            <dt className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">
              What we&apos;ll ask
            </dt>
            <dd className="mt-2 text-text-muted">
              What the task is, who does it now, and how long it takes them.
            </dd>
          </div>
          <div>
            <dt className="font-mono text-2xs uppercase tracking-[0.16em] text-text-faint">
              What you&apos;ll leave with
            </dt>
            <dd className="mt-2 text-text-muted">
              A straight answer on feasibility, a rough range, and a timeline.
            </dd>
          </div>
        </dl>
      </header>

      <ContactForm />
    </div>
  );
}
