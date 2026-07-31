/**
 * The three revenue lines.
 *
 * Local and typed for now, shaped to match the Sanity schema so swapping the
 * source later is a data-layer change and not a component rewrite.
 *
 * Copy leads with the outcome, not the mechanism — the audience is ops leads
 * and founders who buy on "this saves my team twelve hours a week", not on
 * model specs.
 */

export interface Offering {
  id: 'prebuilt' | 'custom' | 'teams';
  /** Index into the three separated 3D forms in the offerings beat. */
  formIndex: 0 | 1 | 2;
  eyebrow: string;
  title: string;
  description: string;
  bestFor: string;
  href: string;
  cta: string;
}

export const OFFERINGS: Offering[] = [
  {
    id: 'prebuilt',
    formIndex: 0,
    eyebrow: 'Off the shelf',
    title: 'Pre-built agents',
    description:
      'Agents that already do a defined job — qualifying inbound leads, triaging support tickets, reconciling invoices. Pick one, connect your tools, and it starts working.',
    bestFor: 'A known, repeatable task you can describe in a sentence.',
    href: '/agents',
    cta: 'Browse the catalog',
  },
  {
    id: 'custom',
    formIndex: 1,
    eyebrow: 'Built to spec',
    title: 'Custom agents',
    description:
      'When the work is specific to how your business runs, we scope it with you, build it against your real data and tools, and stay on after it ships.',
    bestFor: 'A process that lives in your team’s heads, not in a playbook.',
    href: '/custom',
    cta: 'Start a scoping call',
  },
  {
    id: 'teams',
    formIndex: 2,
    eyebrow: 'Multi-agent',
    title: 'Agent teams',
    description:
      'A group of agents that hand work between each other — one plans, others execute in parallel, another checks the result before anything reaches a customer.',
    bestFor: 'A whole workflow, not a single step.',
    href: '/teams',
    cta: 'See how teams work',
  },
];

export interface ProcessStep {
  n: number;
  title: string;
  body: string;
  /** Camera waypoint index in the process beat. */
  waypoint: 0 | 1 | 2 | 3;
}

/**
 * Numbered deliberately: this is a real sequence and the order is information
 * the reader needs. Numbering that decorates rather than informs is noise.
 */
export const PROCESS: ProcessStep[] = [
  {
    n: 1,
    waypoint: 0,
    title: 'Scope the work',
    body: 'A call to find the task worth automating first — usually the one your team complains about, not the one that sounds most impressive.',
  },
  {
    n: 2,
    waypoint: 1,
    title: 'Connect your tools',
    body: 'The agent reads and writes where your work already lives. No migration, no new system for your team to learn.',
  },
  {
    n: 3,
    waypoint: 2,
    title: 'Run it alongside you',
    body: 'It works in parallel with your team first, so you can compare its output against theirs before anything is handed over.',
  },
  {
    n: 4,
    waypoint: 3,
    title: 'Hand over and watch',
    body: 'It takes the task. You keep visibility into every decision it makes, and a person can override any of them.',
  },
];
