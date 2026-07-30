import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { Group } from 'three';
import { agents, teams } from '@/data';
import type { AgentId } from '@/data';
import { teamLayoutPositions } from './teamLayout';
import { AgentCoreInstances, type InstanceNodeDatum } from './AgentCoreInstances';
import { LeadNode } from './LeadNode';
import { GraphEdges } from './GraphEdges';
import { SelectionRing } from './SelectionRing';
import { RendererStatsProbe } from './RendererStatsProbe';

const team = teams[0];
const leadId = team.lead;
const nonLeadAgents = agents.filter((a) => a.id !== leadId);

const instanceNodes: InstanceNodeDatum[] = nonLeadAgents.map((agent) => ({
  id: agent.id,
  color: agent.color,
  position: teamLayoutPositions[agent.id],
}));

const leadAgent = agents.find((a) => a.id === leadId)!;
const leadPosition = teamLayoutPositions[leadId];

export interface TeamGraphSceneProps {
  interactive: boolean;
  autoRotate: boolean;
  focusedId: AgentId | null;
  hoveredId: AgentId | null;
  onSelect?: (id: AgentId) => void;
  onHoverChange?: (id: AgentId | null) => void;
}

/**
 * The team-structure graph: shared between the decorative hero (`/`,
 * interactive=false, autoRotate driven by reduced-motion at the call site)
 * and the fully interactive explorable graph (`/teams/studio-core`).
 *
 * Draw calls for the whole graph: 1 instanced mesh (7 agent nodes) + 1
 * single mesh (lead node) + 1 merged LineSegments (all 9 edges) + at most 1
 * selection ring = 4, regardless of hover/focus state.
 */
export function TeamGraphScene({
  interactive,
  autoRotate,
  focusedId,
  hoveredId,
  onSelect,
  onHoverChange,
}: TeamGraphSceneProps) {
  const rigRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    if (!autoRotate || !rigRef.current) return;
    rigRef.current.rotation.y += delta * 0.12;
  });

  const combinedFocus = hoveredId ?? focusedId;
  const focusedAgent = useMemo(
    () => agents.find((a) => a.id === combinedFocus) ?? null,
    [combinedFocus],
  );
  const focusedPosition = combinedFocus ? teamLayoutPositions[combinedFocus] : null;

  return (
    <>
      <RendererStatsProbe />
      <PerspectiveCamera makeDefault position={[0, 1.2, 13]} fov={42} />
      {interactive ? (
        <OrbitControls
          enablePan={false}
          minDistance={7}
          maxDistance={20}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 1.6}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          enableDamping
        />
      ) : null}

      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 8, 6]} intensity={1.4} />
      <directionalLight position={[-6, -2, -4]} intensity={0.35} />

      <group ref={rigRef}>
        <GraphEdges edges={team.edges} positions={teamLayoutPositions} />

        <LeadNode
          position={leadPosition}
          colorName={leadAgent.color}
          focused={combinedFocus === leadId}
          interactive={interactive}
          onSelect={() => onSelect?.(leadId)}
          onHoverChange={(hovered) => onHoverChange?.(hovered ? leadId : null)}
        />

        <AgentCoreInstances
          nodes={instanceNodes}
          focusedId={combinedFocus}
          interactive={interactive}
          onSelect={onSelect}
          onHoverChange={onHoverChange}
        />

        {focusedAgent && focusedPosition ? (
          <SelectionRing
            position={focusedPosition}
            colorName={focusedAgent.color}
            pulse={interactive}
          />
        ) : null}
      </group>
    </>
  );
}
