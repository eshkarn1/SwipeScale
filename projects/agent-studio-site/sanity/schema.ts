/**
 * Sanity content model.
 *
 * Mirrors the TypeScript interfaces in src/content/ exactly, so the local
 * placeholder data and the CMS data are the same shape and swapping the source
 * is a data-layer change rather than a component rewrite.
 *
 * The point of this model is that a non-developer can add an agent without a
 * deploy — so every field a page renders is here, and nothing a page needs is
 * hardcoded in a component.
 */

export const agentCategories = [
  { title: 'Sales', value: 'sales' },
  { title: 'Support', value: 'support' },
  { title: 'Research', value: 'research' },
  { title: 'Operations', value: 'ops' },
  { title: 'Content', value: 'content' },
  { title: 'Finance', value: 'finance' },
] as const;

/** Selects which 3D form the detail page renders. Adding one is a code change. */
export const variantKeys = [
  { title: 'Prism', value: 'prism' },
  { title: 'Lattice', value: 'lattice' },
  { title: 'Orbit', value: 'orbit' },
  { title: 'Shard', value: 'shard' },
] as const;

export const agentSchema = {
  name: 'agent',
  title: 'Agent',
  type: 'document',
  fields: [
    { name: 'name', title: 'Name', type: 'string', validation: (r: Rule) => r.required() },
    {
      name: 'slug',
      title: 'URL slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (r: Rule) => r.required(),
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: [...agentCategories] },
      validation: (r: Rule) => r.required(),
    },
    {
      name: 'tagline',
      title: 'Tagline',
      description: 'One line, in the buyer’s words. What it does — not how.',
      type: 'string',
      validation: (r: Rule) => r.required().max(140),
    },
    {
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      validation: (r: Rule) => r.required(),
    },
    {
      name: 'useCases',
      title: 'Use cases',
      description: 'Concrete jobs, not capabilities.',
      type: 'array',
      of: [{ type: 'string' }],
      validation: (r: Rule) => r.min(1),
    },
    { name: 'inputs', title: 'Takes in', type: 'array', of: [{ type: 'string' }] },
    { name: 'outputs', title: 'Produces', type: 'array', of: [{ type: 'string' }] },
    { name: 'integrations', title: 'Works with', type: 'array', of: [{ type: 'string' }] },
    {
      name: 'setupTime',
      title: 'Setup time',
      description: 'An honest range, e.g. “3–5 days”. Never a single optimistic number.',
      type: 'string',
    },
    {
      name: 'pricing',
      title: 'Pricing',
      type: 'object',
      fields: [
        {
          name: 'model',
          title: 'Model',
          type: 'string',
          options: {
            list: [
              { title: 'One-time', value: 'one-time' },
              { title: 'Subscription', value: 'subscription' },
              { title: 'Quote per project', value: 'quote' },
            ],
          },
        },
        { name: 'from', title: 'From (minor unit excluded, e.g. 400)', type: 'number' },
        { name: 'unit', title: 'Per (e.g. “month”)', type: 'string' },
        {
          name: 'stripePriceId',
          title: 'Stripe price ID',
          description: 'Leave empty for quote-only agents. Checkout is disabled without it.',
          type: 'string',
        },
      ],
    },
    {
      name: 'variantKey',
      title: '3D variant',
      type: 'string',
      options: { list: [...variantKeys] },
    },
    {
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'q', title: 'Question', type: 'string' },
            { name: 'a', title: 'Answer', type: 'text', rows: 3 },
          ],
        },
      ],
    },
    {
      name: 'featured',
      title: 'Feature on the home page',
      type: 'boolean',
      initialValue: false,
    },
  ],
  preview: {
    select: { title: 'name', subtitle: 'tagline' },
  },
};

/** Minimal shape of Sanity's validation builder — avoids depending on the studio package here. */
interface Rule {
  required(): Rule;
  min(n: number): Rule;
  max(n: number): Rule;
}

export const schemaTypes = [agentSchema];
