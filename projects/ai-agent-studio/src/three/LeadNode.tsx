import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { Material, Mesh } from 'three';
// From three-stdlib to match drei's useGLTF return type — see meshopt.ts.
import type { GLTF } from 'three-stdlib';
import { extendMeshopt } from './meshopt';
import { getAgentColor } from './agentColor';

const MODEL_PATH = '/models/lead-core.glb';

function getFirstMesh(gltf: GLTF): Mesh {
  let found: Mesh | null = null;
  gltf.scene.traverse((child) => {
    if (!found && (child as Mesh).isMesh) found = child as Mesh;
  });
  if (!found) throw new Error(`No mesh found in ${MODEL_PATH}`);
  return found;
}

interface LeadNodeProps {
  position: [number, number, number];
  colorName: string;
  focused: boolean;
  interactive: boolean;
  onSelect?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}

/** The single `team-lead` node — the one non-instanced agent mesh, since it
 * only ever appears once. */
export function LeadNode({
  position,
  colorName,
  focused,
  interactive,
  onSelect,
  onHoverChange,
}: LeadNodeProps) {
  const gltf = useGLTF(MODEL_PATH, true, true, extendMeshopt);
  const sourceMesh = useMemo(() => getFirstMesh(gltf), [gltf]);

  const material = useMemo(() => {
    const clone = (sourceMesh.material as Material).clone() as Material & {
      color?: { set: (v: string) => void };
    };
    clone.color?.set(getAgentColor(colorName).getStyle());
    return clone;
  }, [sourceMesh, colorName]);

  useEffect(() => () => material.dispose(), [material]);

  const meshRef = useRef<Mesh>(null);
  const scaleTarget = useRef(1);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    scaleTarget.current = focused ? 1.18 : 1;
    const current = mesh.scale.x;
    const next = current + (scaleTarget.current - current) * 0.18;
    mesh.scale.setScalar(next);
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    onSelect?.();
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={sourceMesh.geometry}
      material={material}
      onClick={interactive ? handleClick : undefined}
      onPointerOver={
        interactive
          ? (event) => {
              event.stopPropagation();
              onHoverChange?.(true);
            }
          : undefined
      }
      onPointerOut={interactive ? () => onHoverChange?.(false) : undefined}
    />
  );
}

useGLTF.preload(MODEL_PATH);
