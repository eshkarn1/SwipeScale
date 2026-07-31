import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Hybrid pricing across pre-built agents, custom builds, and agent teams. Buy outright, subscribe, or scope a project.',
};

/**
 * Pricing — hybrid model, as decided at kickoff.
 *
 * Three columns matching the three revenue lines, because the lines genuinely
 * charge differently: a pre-built agent is a product, a custom build is a
 * project, a team is an ongoing system. Forcing them into one model would
 * misrepresent all three.
 */
const TIERS = [
  {
    id: 'prebuilt',
    name: 'Pre-built',
    price: 'From £250',
    unit: 'per agent, per month',
    summary: 'One agent doing one defined job. Cancel any time.',
    features: [
      'Any agent from the catalog',
      'Connected to your existing tools',
      'Setup and configuration included',
      'Usage dashboard and audit log',
      'Email support, next business day',
    ],
    cta: 'Browse the catalog',
    href: '/agents',
    featured: false,
  },
  {
    id: 'teams',
    name: 'Agent team',
    price: 'From £1,800',
    unit: 'per team, per month',
    summary: 'Several agents running a whole workflow, with hand-offs and review gates.',
    features: [
      'Multi-agent workflow, designed with you',
      'Review gate before anything reaches a customer',
      'Shared context across every agent in the team',
      'Workflow observability — every decision traceable',
      'Named contact, same-day response',
    ],
    cta: 'See how teams work',
    href: '/teams',
    featured: true,
  },
  {
    id: 'custom',
    name: 'Custom build',
    price: 'Scoped per project',
    unit: 'one-time build, optional retainer',
    summary: 'Built against your process, your data, and your tools.',
    features: [
      'Discovery and scoping workshop',
      'Built and tested on your real data',
      'Runs in parallel with your team first',
      'Handover documentation and training',
      'Optional ongoing support retainer',
    ],
    cta: 'Start a scoping call',
    href: '/contact',
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <header className="max-w-[52ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">Pricing</p>
        <h1 className="mt-6 text-5xl">Pay for the shape of the work.</h1>
        <p className="mt-6 text-lg text-text-muted">
          A single agent is a product. A custom build is a project. A team is a
          system you run. They are priced differently because they are
          different things.
        </p>
      </header>

      <ul className="mt-16 grid gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <li
            key={tier.id}
            className={[
              'flex flex-col gap-6 rounded-[var(--radius-lg)] border p-8',
              tier.featured ? 'border-accent bg-surface' : 'border-hairline bg-surface',
            ].join(' ')}
          >
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl">{tier.name}</h2>
                {tier.featured && (
                  <span className="rounded-[var(--radius-full)] bg-accent px-2.5 py-0.5 font-mono text-2xs uppercase tracking-[0.12em] text-accent-ink">
                    Most deployed
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-bold tracking-tight">{tier.price}</p>
              <p className="mt-1 text-sm text-text-faint">{tier.unit}</p>
              <p className="mt-4 text-sm text-text-muted">{tier.summary}</p>
            </div>

            <ul className="flex flex-col gap-3 border-t border-hairline pt-6 text-sm text-text-muted">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              className={[
                'mt-auto rounded-[var(--radius-full)] px-6 py-3.5 text-center text-sm font-semibold transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5',
                tier.featured
                  ? 'bg-accent text-accent-ink'
                  : 'border border-edge hover:bg-raised',
              ].join(' ')}
            >
              {tier.cta}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 max-w-[64ch] text-sm text-text-faint">
        Prices exclude VAT. Usage beyond the included volume is billed at cost
        plus a fixed margin — we show you the underlying model cost rather than
        marking it up invisibly.
      </p>
    </div>
  );
}
