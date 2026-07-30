import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { getAgentColor } from './agentColor';

interface SelectionRingProps {
  position: [number, number, number];
  colorName: string;
  pulse: boolean;
}

/**
 * A torus halo marking the currently focused/hovered graph node. Kept as a
 * single small mesh separate from the instanced agent nodes because
 * per-instance emissive pulsing isn't practical on an InstancedMesh
 * (emissive is a uniform shared by every instance) — this is the cheap,
 * correct alternative: one extra draw call, only mounted while something
 * is actually focused.
 */
export function SelectionRing({ position, colorName, pulse }: SelectionRingProps) {
  const meshRef = useRef<Mesh>(null);
  const elapsed = useRef(0);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    if (!pulse) {
      meshRef.current.scale.setScalar(1);
      return;
    }
    elapsed.current += delta;
    const s = 1 + Math.sin(elapsed.current * 3) * 0.06;
    meshRef.current.scale.setScalar(s);
  });

  const color = getAgentColor(colorName);

  useEffect(() => {
    return () => {
      // color is a plain THREE.Color value object, not a GPU resource —
      // nothing to dispose here. Geometry/material below are declarative
      // JSX primitives R3F disposes automatically on unmount.
    };
  }, []);

  return (
    <mesh ref={meshRef} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.85, 0.045, 12, 48]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.9} />
    </mesh>
  );
}
