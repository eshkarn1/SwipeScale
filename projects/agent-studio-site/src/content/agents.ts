/**
 * Agent catalog.
 *
 * PLACEHOLDER PRODUCT DATA — these are structurally complete, plausible agent
 * definitions written to exercise the catalog, filtering, and detail templates.
 * They are the client's to replace: every field here maps 1:1 to the Sanity
 * schema, so populating the real catalog is content entry, not a rebuild.
 *
 * The distinction that matters: inventing product listings the client will
 * edit is normal scaffolding. Inventing social proof — testimonials, client
 * logos, "saves 12 hours a week" metrics — is not, and none appears anywhere
 * in this codebase.
 */

export type AgentCategory =
  | 'sales'
  | 'support'
  | 'research'
  | 'ops'
  | 'content'
  | 'finance';

export type PricingModel = 'one-time' | 'subscription' | 'quote';

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  sales: 'Sales',
  support: 'Support',
  research: 'Research',
  ops: 'Operations',
  content: 'Content',
  finance: 'Finance',
};

export interface Agent {
  slug: string;
  name: string;
  category: AgentCategory;
  /** One line. What it does, in the buyer's words. */
  tagline: string;
  description: string;
  /** Concrete jobs, not capabilities. */
  useCases: string[];
  inputs: string[];
  outputs: string[];
  integrations: string[];
  /** Honest range, not "instant". */
  setupTime: string;
  pricing: { model: PricingModel; from?: number; unit?: string };
  /** Selects the 3D form used on the detail page. */
  variantKey: 'prism' | 'lattice' | 'orbit' | 'shard';
  faq: { q: string; a: string }[];
}

export const AGENTS: Agent[] = [
  {
    slug: 'inbound-qualifier',
    name: 'Inbound Qualifier',
    category: 'sales',
    tagline: 'Reads every inbound lead and tells your team which ones to call first.',
    description:
      'Every form fill, reply, and demo request gets read, enriched against public data, and scored against the criteria that actually predict a deal for your business. Your reps open a ranked list instead of a queue.',
    useCases: [
      'Score and rank inbound form fills before a rep touches them',
      'Route enterprise-shaped leads to senior reps automatically',
      'Flag leads that look like an existing customer expanding',
    ],
    inputs: ['Form submissions', 'Inbound email', 'CRM records'],
    outputs: ['Lead score + reasoning', 'Suggested owner', 'Draft first reply'],
    integrations: ['HubSpot', 'Salesforce', 'Slack', 'Gmail'],
    setupTime: '3–5 days',
    pricing: { model: 'subscription', from: 400, unit: 'month' },
    variantKey: 'prism',
    faq: [
      {
        q: 'Does it contact leads directly?',
        a: 'Only if you turn that on. By default it drafts and a person sends.',
      },
      {
        q: 'What does it score against?',
        a: 'Criteria you define during setup, refined against your closed-won history.',
      },
    ],
  },
  {
    slug: 'ticket-triage',
    name: 'Ticket Triage',
    category: 'support',
    tagline: 'Categorises, prioritises, and drafts a reply for every incoming ticket.',
    description:
      'Reads each ticket in context — including the customer’s history and account tier — assigns a category and priority, and drafts a reply your team can send or edit. Escalations get flagged before they age.',
    useCases: [
      'Auto-categorise and prioritise a shared inbox',
      'Draft first replies for common issues',
      'Surface tickets at risk of breaching an SLA',
    ],
    inputs: ['Tickets', 'Customer history', 'Help centre articles'],
    outputs: ['Category + priority', 'Draft reply', 'Escalation flags'],
    integrations: ['Zendesk', 'Intercom', 'Front', 'Linear'],
    setupTime: '2–4 days',
    pricing: { model: 'subscription', from: 350, unit: 'month' },
    variantKey: 'lattice',
    faq: [
      {
        q: 'Will it reply to customers on its own?',
        a: 'Not unless you enable it per-category. Most teams start with drafts only.',
      },
      {
        q: 'How does it handle something it has not seen?',
        a: 'It escalates rather than guessing, and tells you why it was unsure.',
      },
    ],
  },
  {
    slug: 'market-brief',
    name: 'Market Brief',
    category: 'research',
    tagline: 'A standing brief on your competitors, refreshed on your schedule.',
    description:
      'Tracks the companies you name — pricing pages, changelogs, job postings, funding — and delivers a written brief on what changed and why it might matter. Sources cited on every claim.',
    useCases: [
      'Weekly competitor movement digest',
      'Pre-call briefing on a prospect or account',
      'Track hiring signals in a target market',
    ],
    inputs: ['Competitor list', 'Topics to watch', 'Cadence'],
    outputs: ['Written brief with sources', 'Change log', 'Slack digest'],
    integrations: ['Slack', 'Notion', 'Google Docs', 'Email'],
    setupTime: '1–2 days',
    pricing: { model: 'subscription', from: 250, unit: 'month' },
    variantKey: 'orbit',
    faq: [
      {
        q: 'Does it cite sources?',
        a: 'Every claim links to where it came from. Unsourced claims are omitted, not guessed.',
      },
    ],
  },
  {
    slug: 'invoice-reconciler',
    name: 'Invoice Reconciler',
    category: 'finance',
    tagline: 'Matches invoices to purchase orders and flags only the exceptions.',
    description:
      'Reads incoming invoices, matches line items against purchase orders and delivery records, and passes the clean ones straight through. Your finance team sees only what actually needs a human.',
    useCases: [
      'Three-way match across invoice, PO, and receipt',
      'Flag duplicate or out-of-terms invoices',
      'Route exceptions to the right approver',
    ],
    inputs: ['Invoices (PDF or email)', 'Purchase orders', 'Delivery records'],
    outputs: ['Match status', 'Exception report', 'Approval routing'],
    integrations: ['Xero', 'QuickBooks', 'NetSuite', 'Slack'],
    setupTime: '5–10 days',
    pricing: { model: 'subscription', from: 600, unit: 'month' },
    variantKey: 'shard',
    faq: [
      {
        q: 'Does it ever approve a payment itself?',
        a: 'No. It reconciles and routes; approval stays with a person by design.',
      },
    ],
  },
  {
    slug: 'onboarding-runner',
    name: 'Onboarding Runner',
    category: 'ops',
    tagline: 'Runs every new-hire and new-customer checklist to completion.',
    description:
      'Owns the checklist nobody wants to own. Creates the accounts, files the requests, chases the blockers, and tells you the moment something is genuinely stuck rather than silently waiting.',
    useCases: [
      'New employee provisioning across tools',
      'Customer onboarding milestone tracking',
      'Chase outstanding items without a human nagging',
    ],
    inputs: ['Checklist template', 'HR or CRM trigger', 'Tool access'],
    outputs: ['Completed tasks', 'Blocker report', 'Status updates'],
    integrations: ['Okta', 'Notion', 'Asana', 'Slack'],
    setupTime: '1–2 weeks',
    pricing: { model: 'subscription', from: 500, unit: 'month' },
    variantKey: 'lattice',
    faq: [
      {
        q: 'What happens when it gets stuck?',
        a: 'It reports the blocker with context and stops. It never marks something done that is not.',
      },
    ],
  },
  {
    slug: 'content-repurposer',
    name: 'Content Repurposer',
    category: 'content',
    tagline: 'Turns one piece of long-form into the formats each channel needs.',
    description:
      'Takes a webinar, post, or transcript and produces the derivative pieces — newsletter section, social posts, summary — in your voice, built from a style guide you approve up front.',
    useCases: [
      'Webinar recording into a newsletter and social set',
      'Long-form post into channel-native versions',
      'Transcript into a structured summary',
    ],
    inputs: ['Source content', 'Style guide', 'Channel list'],
    outputs: ['Drafts per channel', 'Suggested schedule'],
    integrations: ['Notion', 'Buffer', 'WordPress', 'Google Drive'],
    setupTime: '2–4 days',
    pricing: { model: 'one-time', from: 1200 },
    variantKey: 'prism',
    faq: [
      {
        q: 'Will it sound like us?',
        a: 'It works from a style guide built from your existing published work during setup.',
      },
    ],
  },
];

export function getAgent(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug);
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as AgentCategory[];
