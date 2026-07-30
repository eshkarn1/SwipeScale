import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  Color,
  Object3D,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Mesh,
} from 'three';
// From three-stdlib to match drei's useGLTF return type — see meshopt.ts.
import type { GLTF } from 'three-stdlib';
import type { AgentId } from '@/data';
import { extendMeshopt } from './meshopt';
import { getAgentColor } from './agentColor';

const MODEL_PATH = '/models/agent-core.glb';

// Module-scope scratch objects — reused every frame, never reallocated.
const dummy = new Object3D();
const scratchColor = new Color();

function getFirstMesh(gltf: GLTF): Mesh {
  let found: Mesh | null = null;
  gltf.scene.traverse((child) => {
    if (!found && (child as Mesh).isMesh) found = child as Mesh;
  });
  if (!found) throw new Error(`No mesh found in ${MODEL_PATH}`);
  return found;
}

export interface InstanceNodeDatum {
  id: AgentId;
  color: string;
  position: [number, number, number];
}

interface AgentCoreInstancesProps {
  nodes: InstanceNodeDatum[];
  focusedId: AgentId | null;
  interactive: boolean;
  onSelect?: (id: AgentId) => void;
  onHoverChange?: (id: AgentId | null) => void;
}

/**
 * Instances `agent-core.glb` once for every non-lead agent node — one draw
 * call for up to 7 nodes, instead of 7. The GLTF geometry/material come
 * from drei's cache (shared, never disposed here on purpose: it is a 7.4KB
 * asset meant to live for the app's session and be reused across routes).
 * The one thing this component itself allocates — the cloned tint
 * material, set to white so per-instance colour multiplies cleanly — IS
 * disposed on unmount.
 */
export function AgentCoreInstances({
  nodes,
  focusedId,
  interactive,
  onSelect,
  onHoverChange,
}: AgentCoreInstancesProps) {
  const gltf = useGLTF(MODEL_PATH, true, true, extendMeshopt);
  const sourceMesh = useMemo(() => getFirstMesh(gltf), [gltf]);
  const geometry = sourceMesh.geometry as BufferGeometry;

  const material = useMemo(() => {
    const clone = (sourceMesh.material as Material).clone() as Material & { color?: Color };
    if (clone.color) clone.color.set('#ffffff');
    return clone;
  }, [sourceMesh]);

  useEffect(() => () => material.dispose(), [material]);

  const meshRef = useRef<InstancedMesh>(null);
  const scaleRef = useRef<Float32Array>(new Float32Array(nodes.length).fill(1));

  useEffect(() => {
    scaleRef.current = new Float32Array(nodes.length).fill(1);
  }, [nodes.length]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    nodes.forEach((node, i) => {
      mesh.setColorAt(i, scratchColor.set(getAgentColor(node.color)));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [nodes]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let dirty = false;
    nodes.forEach((node, i) => {
      const target = node.id === focusedId ? 1.22 : 1;
      const current = scaleRef.current[i];
      const next = current + (target - current) * 0.18;
      if (Math.abs(next - current) > 0.0005) dirty = true;
      scaleRef.current[i] = next;
      dummy.position.set(...node.position);
      dummy.scale.setScalar(next);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || event.instanceId === undefined) return;
    event.stopPropagation();
    onSelect?.(nodes[event.instanceId].id);
  };
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive || event.instanceId === undefined) return;
    event.stopPropagation();
    onHoverChange?.(nodes[event.instanceId].id);
  };
  const handlePointerOut = () => {
    if (!interactive) return;
    onHoverChange?.(null);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, nodes.length]}
      onClick={interactive ? handleClick : undefined}
      onPointerOver={interactive ? handlePointerOver : undefined}
      onPointerOut={interactive ? handlePointerOut : undefined}
    />
  );
}

useGLTF.preload(MODEL_PATH);
