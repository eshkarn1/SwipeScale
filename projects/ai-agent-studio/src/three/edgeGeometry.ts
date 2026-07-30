import { BufferGeometry, Float32BufferAttribute, QuadraticBezierCurve3, Vector3 } from 'three';
import type { AgentId, TeamEdge } from '@/data';

const DELEGATE_COLOR = [0.64, 0.64, 0.68]; // matches --text-muted, linear-ish approximation
const APPROVE_COLOR = [0.96, 0.58, 0.29]; // matches --agent-orange-accent

const APPROVE_SEGMENTS = 20;

/**
 * Builds a single non-indexed LineSegments geometry for the whole graph —
 * every edge, both kinds — so the team graph's connective lines cost one
 * draw call regardless of edge count. `delegates` edges are a straight
 * segment; `approves` edges are subdivided along a quadratic bezier so the
 * critic's review loop reads as a visually distinct arc rather than a
 * straight reporting line, per the brief's call to make the two edge kinds
 * "visually distinct."
 */
export function buildEdgeGeometry(
  edges: TeamEdge[],
  positions: Record<AgentId, [number, number, number]>,
): BufferGeometry {
  const points: number[] = [];
  const colors: number[] = [];

  const pushSegment = (a: Vector3, b: Vector3, color: number[]) => {
    points.push(a.x, a.y, a.z, b.x, b.y, b.z);
    colors.push(...color, ...color);
  };

  for (const edge of edges) {
    const from = new Vector3(...positions[edge.from]);
    const to = new Vector3(...positions[edge.to]);

    if (edge.kind === 'approves') {
      const mid = from.clone().add(to).multiplyScalar(0.5);
      mid.y += 1.6; // bulge the arc upward so it reads distinct from a direct line
      const curve = new QuadraticBezierCurve3(from, mid, to);
      const samples = curve.getPoints(APPROVE_SEGMENTS);
      for (let i = 0; i < samples.length - 1; i++) {
        pushSegment(samples[i], samples[i + 1], APPROVE_COLOR);
      }
    } else {
      pushSegment(from, to, DELEGATE_COLOR);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}
