'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, ShaderMaterial } from 'three';
import { MathUtils } from 'three';

/**
 * Scaffold version of the hero "agent" object.
 *
 * This is deliberately a placeholder with the RIGHT WIRING, not the finished
 * centerpiece: the brief calls for a shader-driven procedural form that reacts
 * to cursor and scroll velocity, and that belongs after style-frame approval.
 * What is real here is the plumbing — uniforms updated per frame from a single
 * clock, cursor parallax damped rather than snapped, and no allocation inside
 * the frame loop.
 *
 * Replace the geometry and material; keep the update pattern.
 */
export function AgentObject({ scrollVelocity = 0 }: { scrollVelocity?: number }) {
  const meshRef = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  // Hoisted so the frame loop never allocates. Allocating a Vector3 per frame
  // at 60fps is 3,600 objects a minute for the GC to collect.
  const pointer = useRef({ x: 0, y: 0 });
  const damped = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    pointer.current.x = state.pointer.x;
    pointer.current.y = state.pointer.y;

    // Damped rather than linear: a cursor-following object that tracks exactly
    // reads as cheap. The lag is the character.
    damped.current.x = MathUtils.damp(damped.current.x, pointer.current.x, 3, delta);
    damped.current.y = MathUtils.damp(damped.current.y, pointer.current.y, 3, delta);

    mesh.rotation.y = damped.current.x * 0.4 + state.clock.elapsedTime * 0.08;
    mesh.rotation.x = -damped.current.y * 0.25;

    // Scroll velocity feeds deformation once the real shader lands.
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uVelocity.value = MathUtils.damp(
        materialRef.current.uniforms.uVelocity.value as number,
        scrollVelocity,
        4,
        delta,
      );
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.6, 6]} />
      <meshStandardMaterial
        color="#cbff4d"
        emissive="#9ecc2e"
        emissiveIntensity={0.35}
        roughness={0.28}
        metalness={0.6}
        wireframe
      />
    </mesh>
  );
}
