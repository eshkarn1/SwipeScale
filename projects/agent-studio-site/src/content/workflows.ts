/**
 * Example agent-team workflows.
 *
 * These are ILLUSTRATIVE — they show how a team is structured and how work
 * moves through it. That is product explanation, and legitimately ours to
 * design. It is a different thing from social proof: no claim is made here
 * that any particular customer runs this, and no metrics are attached.
 *
 * Replace with a real deployed workflow the moment one is available. A real
 * one will be better, because the awkward edges of a genuine process are what
 * make a diagram convincing.
 */

export type NodeRole = 'intake' | 'lead' | 'specialist' | 'reviewer' | 'output';

export interface WorkflowNode {
  id: string;
  name: string;
  role: NodeRole;
  /** What this agent does, in one line. Shown on hover and focus. */
  does: string;
  /** Position in the 3D graph. x spreads left→right along the flow. */
  pos: [number, number, number];
}

export interface WorkflowEdge {
  from: string;
  to: string;
  /** 'hands' = passes work on. 'returns' = sends back for rework. */
  kind: 'hands' | 'returns';
  label: string;
}

export interface Workflow {
  slug: string;
  name: string;
  summary: string;
  /** The business outcome, stated plainly. */
  outcome: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const WORKFLOWS: Workflow[] = [
  {
    slug: 'support-triage',
    name: 'Support triage team',
    summary:
      'Five agents that take a shared inbox from raw tickets to sent replies, with a review gate before anything reaches a customer.',
    outcome:
      'Your team opens a queue that is already sorted, prioritised, and drafted — and reviews rather than writes.',
    nodes: [
      {
        id: 'intake',
        name: 'Intake',
        role: 'intake',
        does: 'Watches the shared inbox and normalises every incoming ticket into the same shape, whatever channel it arrived on.',
        pos: [-4.2, 0.4, 0],
      },
      {
        id: 'coordinator',
        name: 'Coordinator',
        role: 'lead',
        does: 'Reads the ticket in context — customer history, account tier, urgency — and decides which specialist handles it. Holds no ability to write replies itself.',
        pos: [-1.6, 0.1, -0.6],
      },
      {
        id: 'classifier',
        name: 'Classifier',
        role: 'specialist',
        does: 'Assigns category and priority, and flags anything at risk of breaching an SLA before it ages.',
        pos: [0.6, 1.7, -1.4],
      },
      {
        id: 'drafter',
        name: 'Drafter',
        role: 'specialist',
        does: 'Writes the reply using your help centre and previous resolutions, in your team’s voice.',
        pos: [0.9, -1.5, -1.1],
      },
      {
        id: 'reviewer',
        name: 'Reviewer',
        role: 'reviewer',
        does: 'Checks the draft against the ticket and your policy. Can reject it back to the drafter. Nothing reaches a customer without passing here.',
        pos: [3.2, 0.2, -0.4],
      },
      {
        id: 'queue',
        name: 'Your team',
        role: 'output',
        does: 'Receives a sorted, prioritised queue with a draft attached to each item. Sends, edits, or overrides.',
        pos: [5.4, 0.5, 0.3],
      },
    ],
    edges: [
      { from: 'intake', to: 'coordinator', kind: 'hands', label: 'normalised ticket' },
      { from: 'coordinator', to: 'classifier', kind: 'hands', label: 'to categorise' },
      { from: 'coordinator', to: 'drafter', kind: 'hands', label: 'to draft' },
      { from: 'classifier', to: 'reviewer', kind: 'hands', label: 'category + priority' },
      { from: 'drafter', to: 'reviewer', kind: 'hands', label: 'draft reply' },
      { from: 'reviewer', to: 'drafter', kind: 'returns', label: 'rejected — rework' },
      { from: 'reviewer', to: 'queue', kind: 'hands', label: 'approved' },
    ],
  },
];

export function getWorkflow(slug: string): Workflow | undefined {
  return WORKFLOWS.find((w) => w.slug === slug);
}

/** Accent per role, so the graph encodes structure in colour as well as position. */
export const ROLE_COLORS: Record<NodeRole, string> = {
  intake: '#8C9BA8',
  lead: '#CBFF4D',
  specialist: '#7FBFC4',
  reviewer: '#D9BE96',
  output: '#E8E6DF',
};

export const ROLE_LABELS: Record<NodeRole, string> = {
  intake: 'Intake',
  lead: 'Lead',
  specialist: 'Specialist',
  reviewer: 'Review gate',
  output: 'Hand-off',
};
