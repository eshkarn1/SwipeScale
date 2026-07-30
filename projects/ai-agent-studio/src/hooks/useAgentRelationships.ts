import { useMemo } from 'react';
import { teams, type AgentId, type TeamEdge } from '@/data';

const team = teams[0];

export interface AgentRelationships {
  outgoing: TeamEdge[];
  incoming: TeamEdge[];
}

/** Shared lookup of an agent's edges in the one real team graph — used by
 * both the agent detail page and the interactive team graph's live region,
 * so the two never describe a relationship differently. */
export function useAgentRelationships(agentId: AgentId | null): AgentRelationships {
  return useMemo(() => {
    if (!agentId) return { outgoing: [], incoming: [] };
    return {
      outgoing: team.edges.filter((e) => e.from === agentId),
      incoming: team.edges.filter((e) => e.to === agentId),
    };
  }, [agentId]);
}
