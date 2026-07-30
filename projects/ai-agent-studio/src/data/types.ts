/**
 * Hand-written type contract for the AI Agent Studio content data layer.
 *
 * These types describe the shape produced by
 * `scripts/build-agent-data.mjs` from the eight real agent definition files
 * at `.claude/agents/*.md`. Nothing here is fabricated: every field on
 * `Agent` is either verbatim from a source file or a pure derivation from
 * fields that are (see the comment on each derived field for what it is
 * derived from).
 */

export type AgentId =
  | 'team-lead'
  | 'critic'
  | 'frontend-dev'
  | 'ui-builder'
  | 'motion-designer'
  | 'backend-dev'
  | 'graphics-designer'
  | 'threed-artist';

/** Coarse grouping of a tool, for filtering and for the capability chips. */
export type ToolKind =
  | 'read'
  | 'write'
  | 'exec'
  | 'delegate'
  | 'web'
  | 'skill'
  | 'mcp'
  | 'plan';

export interface AgentTool {
  /** The exact substring from the frontmatter, e.g. "Agent(critic, frontend-dev)". */
  raw: string;
  /** The bare tool name, e.g. "Agent", "Read", "WebSearch". */
  name: string;
  kind: ToolKind;
  /** Present only for Agent(...) entries: the agents this one may dispatch. */
  targets?: AgentId[];
}

export interface AgentSection {
  /** Heading text without leading '#' characters. */
  heading: string;
  /** Markdown body of that section, verbatim, trimmed. */
  body: string;
}

export interface Agent {
  id: AgentId;
  /** frontmatter `name`, verbatim. */
  name: string;
  /** Short human-readable role label, derived. See mapping below. */
  title: string;
  /** frontmatter `description`, verbatim. */
  description: string;
  /** frontmatter `model`, verbatim, e.g. "opus" | "sonnet". */
  model: string;
  /** frontmatter `color`, verbatim colour NAME (e.g. "purple") — not a hex. */
  color: string;
  effort: string | null;
  permissionMode: string | null;
  memory: string | null;
  skills: string[];
  mcpServers: string[];
  tools: AgentTool[];
  /** Derived: true iff tools include Write or Edit. team-lead and Explore-like agents are false. */
  canEditFiles: boolean;
  /** Derived: flattened union of every Agent(...) target. [] for agents that cannot delegate. */
  delegatesTo: AgentId[];
  /** The first paragraph of the markdown body, verbatim. The one-line pitch. */
  summary: string;
  /** Distinct ToolKind values present in `tools`, for directory filtering. */
  capabilities: ToolKind[];
  /** Every '## ' section of the markdown body, in document order. */
  sections: AgentSection[];
  /** Repo-relative source path, e.g. ".claude/agents/team-lead.md". */
  sourceFile: string;
}

export type TeamEdgeKind = 'delegates' | 'approves';

export interface TeamEdge {
  from: AgentId;
  to: AgentId;
  kind: TeamEdgeKind;
  /** Short human label for the relationship, e.g. "review + README gate". */
  label: string;
}

export interface Team {
  id: string;
  name: string;
  lead: AgentId;
  /** All members including the lead. */
  members: AgentId[];
  edges: TeamEdge[];
  description: string;
}
