'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { MathUtils } from 'three';
import { sceneState } from '@/lib/scene-state';

/**
 * Scaffold version of the hero "agent" object.
 *
 * This is deliberately a placeholder with the RIGHT WIRING, not the finished
 * centerpiece: the brief calls for a shader-driven procedural form reacting to
 * cursor and scroll velocity, and that belongs after style-frame approval.
 * What is real here is the plumbing — one accumulated clock, damped input, no
 * allocation inside the frame loop. Replace the geometry and material; keep
 * the update pattern.
 */

/* ---- Motion tuning -------------------------------------------------------
   Every value that affects how the object *feels* lives here, so tuning is a
   one-line change rather than a hunt through the frame loop. */

/** Idle spin, radians per second. One full turn takes 2π / this ≈ 3.5 min. */
const IDLE_SPIN = 0.03;
/** How far the object leans toward the cursor, in radians at full deflection. */
const PARALLAX_YAW = 0.22;
const PARALLAX_PITCH = 0.14;
/** Damping rate for cursor follow. Lower = heavier, more lag, more weight. */
const POINTER_DAMPING = 1.6;
/** Frames longer than this are treated as this long — see note below. */
const MAX_DELTA = 1 / 30;

export function AgentObject() {
  const meshRef = useRef<Mesh>(null);

  // Hoisted: allocating a Vector3 per frame is 3,600 objects a minute for the
  // GC. Plain refs, mutated in place, cost nothing.
  const damped = useRef({ x: 0, y: 0 });
  const velocity = useRef(0);

  /**
   * Our own accumulated time, in seconds.
   *
   * Deliberately NOT `state.clock.elapsedTime`. The Canvas runs
   * `frameloop="never"` and is advanced manually from the GSAP ticker, so
   * R3F's internal clock is not a reliable wall-clock source here — it
   * advances per `advance()` call rather than per real second, which made the
   * idle spin run visibly fast. Accumulating from the clamped per-frame delta
   * is correct under manual advance and immune to that whole class of bug.
   */
  const elapsed = useRef(0);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Clamp before use. A backgrounded tab or a long GC pause produces a huge
    // delta; unclamped, the object visibly teleports on return.
    const dt = Math.min(delta, MAX_DELTA);
    elapsed.current += dt;

    // Damped rather than linear: an object that tracks the cursor exactly reads
    // as cheap. The lag is the character.
    // Under reduced motion the object holds a composed static frame rather
    // than freezing mid-spin — the calm variant from Deliverable 1.
    if (sceneState.reducedMotion) {
      mesh.rotation.set(0, 0.4, 0);
      mesh.scale.setScalar(1);
      return;
    }

    damped.current.x = MathUtils.damp(damped.current.x, state.pointer.x, POINTER_DAMPING, dt);
    damped.current.y = MathUtils.damp(damped.current.y, state.pointer.y, POINTER_DAMPING, dt);
    // Read straight from the scroll bridge — no prop, no re-render.
    velocity.current = MathUtils.damp(velocity.current, sceneState.velocity, 4, dt);

    mesh.rotation.y = elapsed.current * IDLE_SPIN + damped.current.x * PARALLAX_YAW;
    mesh.rotation.x = -damped.current.y * PARALLAX_PITCH;

    // Scroll velocity reads as a subtle breath until the real shader lands.
    const breath = 1 + Math.min(Math.abs(velocity.current), 1) * 0.04;
    mesh.scale.setScalar(breath);
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
