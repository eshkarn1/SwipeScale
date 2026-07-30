import type { AgentId } from '@/data';

/**
 * Hand-authored hierarchical layout for the 8-node, single-team graph —
 * deliberately not force-directed. With only 8 nodes and 9 fixed edges, a
 * legible org-chart-like layout communicates hierarchy (who reports to
 * whom) better than a physics simulation would, and it is deterministic
 * (same read every load, same tab order every time).
 *
 * Layer 0 (top): the lead.
 * Layer 1: the five direct reports.
 * Layer 2: the two specialists under frontend-dev.
 *
 * `critic` sits at the far edge of layer 1 because it also receives the two
 * `approves` edges from graphics-designer and threed-artist — keeping it
 * visually reachable from both the lead (above) and the asset agents
 * (across) rather than tucked in a corner.
 */
export const teamLayoutPositions: Record<AgentId, [number, number, number]> = {
  'team-lead': [0, 2.6, 0],
  critic: [-6, 0, 1.2],
  'frontend-dev': [-2.2, 0, 0],
  'backend-dev': [2.2, 0, 0],
  'graphics-designer': [4.6, 0, -1.2],
  'threed-artist': [6.6, 0, 0.4],
  'ui-builder': [-3.6, -2.4, 1],
  'motion-designer': [-0.9, -2.4, 1],
};
