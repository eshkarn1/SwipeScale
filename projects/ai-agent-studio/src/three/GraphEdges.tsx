import { useEffect, useMemo } from 'react';
import type { AgentId, TeamEdge } from '@/data';
import { buildEdgeGeometry } from './edgeGeometry';

interface GraphEdgesProps {
  edges: TeamEdge[];
  positions: Record<AgentId, [number, number, number]>;
}

/** Renders every graph edge as one LineSegments draw call (see edgeGeometry.ts). */
export function GraphEdges({ edges, positions }: GraphEdgesProps) {
  const geometry = useMemo(() => buildEdgeGeometry(edges, positions), [edges, positions]);

  // Geometry is created here (not loaded from a shared cache), so it is
  // ours to dispose on unmount / whenever it's rebuilt.
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors toneMapped={false} />
    </lineSegments>
  );
}
