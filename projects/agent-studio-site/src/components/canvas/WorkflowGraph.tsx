'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, MathUtils, Object3D, Vector3, type Group, type Mesh } from 'three';
import { sceneState } from '@/lib/scene-state';
import { useTier } from '@/components/canvas/SceneCanvas';
import { ROLE_COLORS, type Workflow } from '@/content/workflows';

/**
 * The workflow graph — the centrepiece of the brief's 3D work.
 *
 * Agents are nodes, hand-offs are edges, and work is the thing travelling
 * along them. The reviewer's rejection edge runs backwards, which is the
 * detail that makes it read as a real process rather than a pipeline: work
 * can be sent back.
 *
 * Hover and focus are driven from the DOM, not from raycasting. The roster
 * list below the canvas is the accessible control surface — it is keyboard
 * operable, it is what a screen reader reads, and it sets `activeId`. The 3D
 * responds to that state. This is why the graph is usable with no pointer at
 * all, and why we are not paying for a raycaster every frame.
 */

const MAX_DELTA = 1 / 30;
/** Slow. Work moving between colleagues, not packets on a wire. */
const FLOW_SPEED = 0.11;
const PULSES_PER_EDGE = 2;

interface WorkflowGraphProps {
  workflow: Workflow;
  /** Node id currently hovered or focused in the DOM roster, if any. */
  activeId: string | null;
}

export function WorkflowGraph({ workflow, activeId }: WorkflowGraphProps) {
  const profile = useTier();
  const groupRef = useRef<Group>(null);
  const pulsesRef = useRef<InstancedMesh>(null);
  const nodeRefs = useRef<Record<string, Mesh | null>>({});

  const nodeIndex = useMemo(() => {
    const map: Record<string, Vector3> = {};
    workflow.nodes.forEach((n) => {
      map[n.id] = new Vector3(...n.pos);
    });
    return map;
  }, [workflow.nodes]);

  const edgePositions = useMemo(() => {
    const arr = new Float32Array(workflow.edges.length * 6);
    workflow.edges.forEach((e, i) => {
      const a = nodeIndex[e.from];
      const b = nodeIndex[e.to];
      if (!a || !b) return;
      arr.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
    });
    return arr;
  }, [workflow.edges, nodeIndex]);

  const pulseCount = workflow.edges.length * PULSES_PER_EDGE;

  const pulseParams = useMemo(
    () =>
      Array.from({ length: pulseCount }, (_, i) => ({
        edge: Math.floor(i / PULSES_PER_EDGE),
        offset: (i % PULSES_PER_EDGE) / PULSES_PER_EDGE + ((i * 0.29) % 1) * 0.3,
        speed: 0.9 + ((i * 0.17) % 1) * 0.25,
      })),
    [pulseCount],
  );

  // Hoisted — no allocation in the frame loop.
  const dummy = useRef(new Object3D()).current;
  const from = useRef(new Vector3()).current;
  const to = useRef(new Vector3()).current;
  const elapsed = useRef(0);
  const damped = useRef({ x: 0, y: 0 });
  /** Per-node emphasis, damped so highlighting fades in rather than snapping. */
  const emphasis = useRef<Record<string, number>>({});

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, MAX_DELTA);
    const reduced = sceneState.reducedMotion;

    if (!reduced) {
      elapsed.current += dt;
      damped.current.x = MathUtils.damp(damped.current.x, state.pointer.x, 1.6, dt);
      damped.current.y = MathUtils.damp(damped.current.y, state.pointer.y, 1.6, dt);
      // A shallow lean only. The graph is information; spinning it would make
      // the left-to-right reading order unreadable.
      group.rotation.y = damped.current.x * 0.18;
      group.rotation.x = -damped.current.y * 0.1;
    }

    // ---- per-node emphasis ------------------------------------------------
    for (const node of workflow.nodes) {
      const target = activeId === null ? 0.35 : activeId === node.id ? 1 : 0.08;
      const current = emphasis.current[node.id] ?? 0.35;
      const next = reduced ? target : MathUtils.damp(current, target, 6, dt);
      emphasis.current[node.id] = next;

      const mesh = nodeRefs.current[node.id];
      if (!mesh) continue;

      mesh.scale.setScalar(0.9 + next * 0.35);
      const mat = mesh.material as { emissiveIntensity?: number };
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 0.1 + next * 0.7;
      }
      if (!reduced) {
        mesh.rotation.y = elapsed.current * 0.12 + node.pos[0];
      }
    }

    // ---- work in flight ---------------------------------------------------
    const pulses = pulsesRef.current;
    if (!pulses || reduced) return;

    for (let i = 0; i < pulseParams.length; i += 1) {
      const p = pulseParams[i];
      const edge = workflow.edges[p.edge];
      if (!edge) continue;

      const a = nodeIndex[edge.from];
      const b = nodeIndex[edge.to];
      if (!a || !b) continue;

      from.copy(a);
      to.copy(b);

      const t = (elapsed.current * p.speed * FLOW_SPEED + p.offset) % 1;
      dummy.position.lerpVectors(from, to, t);

      // Emphasise work on edges touching the active node; dim the rest, so
      // selecting an agent shows what actually flows through it.
      const touches =
        activeId === null || edge.from === activeId || edge.to === activeId ? 1 : 0.15;

      const edgeFade = Math.sin(t * Math.PI);
      dummy.scale.setScalar(Math.max(0.05 * edgeFade * touches, 0.0001));
      dummy.updateMatrix();
      pulses.setMatrixAt(i, dummy.matrix);
    }

    pulses.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      {workflow.nodes.map((node) => (
        <mesh
          key={node.id}
          ref={(el) => {
            nodeRefs.current[node.id] = el;
          }}
          position={node.pos}
        >
          {node.role === 'lead' ? (
            <icosahedronGeometry args={[0.42, 1]} />
          ) : node.role === 'reviewer' ? (
            <octahedronGeometry args={[0.36, 0]} />
          ) : node.role === 'output' ? (
            <boxGeometry args={[0.5, 0.5, 0.5]} />
          ) : (
            <dodecahedronGeometry args={[0.32, 0]} />
          )}
          <meshStandardMaterial
            color={ROLE_COLORS[node.role]}
            emissive={ROLE_COLORS[node.role]}
            emissiveIntensity={0.15}
            roughness={0.26}
            metalness={0.86}
            flatShading
          />
        </mesh>
      ))}

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[edgePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#5E6B78" transparent opacity={0.18} />
      </lineSegments>

      <instancedMesh
        ref={pulsesRef}
        args={[undefined, undefined, pulseCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color="#E8E6DF"
          emissive="#CBFF4D"
          emissiveIntensity={profile.tier === 'high' ? 0.7 : 0.4}
          roughness={0.4}
          metalness={0.1}
        />
      </instancedMesh>
    </group>
  );
}
