/**
 * Barrel for the content data layer. The frontend imports everything it
 * needs from here:
 *
 *   import { agents, teams, agentsById } from '@/data';
 *   import type { Agent, Team, AgentId } from '@/data';
 */

export * from './types';
export * from './agents.generated';
