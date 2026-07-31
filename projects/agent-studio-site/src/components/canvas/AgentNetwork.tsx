'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  MathUtils,
  Object3D,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import { sceneState } from '@/lib/scene-state';
import { useTier } from '@/components/canvas/SceneCanvas';

/**
 * The hero: an agent network.
 *
 * The concept the site sells is agents that hand work to each other, so the
 * hero shows exactly that rather than an abstract blob. A deliberately
 * irregular core, satellite specialists sitting behind and around it, and
 * signals travelling the links between them.
 *
 * It is dormant until you point at it. Pointer or touch anywhere over the
 * canvas wakes the network: the satellites spread, the signals accelerate and
 * brighten, and the core resolves. That is the argument in one interaction —
 * idle system, then work flowing through it.
 */

/* ---- Tuning -------------------------------------------------------------- */

const CORE_RADIUS = 1.45;
/** How far vertices are pushed off the sphere. 0 = ball, which we do not want. */
const IRREGULARITY = 0.3;
const IDLE_SPIN = 0.035;
const POINTER_DAMPING = 1.8;
/** How fast the network wakes and sleeps. Waking is quicker than sleeping. */
const WAKE_RATE = 4.5;
const SLEEP_RATE = 1.6;
const MAX_DELTA = 1 / 30;

/** Satellite specialists. Mostly behind the core (negative z) so it reads as depth. */
const SATELLITES = [
  { pos: [2.35, 0.95, -1.4], scale: 0.3, detail: 0 },
  { pos: [-2.6, 0.35, -2.1], scale: 0.24, detail: 1 },
  { pos: [1.5, -1.55, -2.6], scale: 0.2, detail: 0 },
  { pos: [-1.75, -1.2, -0.9], scale: 0.26, detail: 1 },
  { pos: [0.35, 2.05, -2.9], scale: 0.18, detail: 0 },
  { pos: [3.0, -0.7, -3.4], scale: 0.15, detail: 1 },
] as const;

/**
 * Links. Index 0 is the core; 1+ are satellites.
 * Most run core→satellite (delegation), but two run satellite→satellite —
 * that is the hand-off between specialists, which is the part that makes it a
 * team rather than a hub and spoke.
 */
const LINKS: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [0, 6],
  [1, 3],
  [4, 2],
];

const PULSES_PER_LINK = 2;

/* ---- Deterministic pseudo-noise ------------------------------------------
   A real simplex implementation is not worth the bytes for a one-off vertex
   displacement. This is stable, seedless, and produces the lumpy-but-faceted
   silhouette we want. Range is roughly -1..1. */
function noise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + y * 0.9) * 0.5 +
    Math.sin(y * 2.3 - z * 1.1) * 0.3 +
    Math.sin(z * 1.9 + x * 1.3) * 0.2
  );
}

export function AgentNetwork() {
  const profile = useTier();
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const pulsesRef = useRef<InstancedMesh>(null);

  // Lower tiers carry fewer satellites and fewer signals in flight.
  const satellites = useMemo(
    () =>
      profile.tier === 'high'
        ? SATELLITES
        : profile.tier === 'medium'
          ? SATELLITES.slice(0, 4)
          : SATELLITES.slice(0, 2),
    [profile.tier],
  );

  const links = useMemo(
    () => LINKS.filter(([a, b]) => a <= satellites.length && b <= satellites.length),
    [satellites.length],
  );

  const pulseCount = links.length * PULSES_PER_LINK;

  /** Node positions in one array so links and pulses read from a single source. */
  const nodes = useMemo(
    () => [
      new Vector3(0, 0, 0),
      ...satellites.map((s) => new Vector3(s.pos[0], s.pos[1], s.pos[2])),
    ],
    [satellites],
  );

  /**
   * The irregular core. Built once on the CPU and cached — this is a fixed
   * sculpted form, not a per-frame effect, so it costs nothing after mount.
   */
  const coreGeometry = useMemo(() => {
    const geo = new IcosahedronGeometry(CORE_RADIUS, 5);
    const position = geo.attributes.position;
    const v = new Vector3();

    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i);
      // Sample noise on the normalised direction so displacement depends on
      // orientation rather than on the (constant) radius.
      const n = noise3(v.x * 1.15, v.y * 1.15, v.z * 1.15);
      v.multiplyScalar(1 + n * IRREGULARITY);
      position.setXYZ(i, v.x, v.y, v.z);
    }

    position.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  /** Static line geometry for the links. */
  const linkPositions = useMemo(() => {
    const arr = new Float32Array(links.length * 6);
    links.forEach(([a, b], i) => {
      arr.set([nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z], i * 6);
    });
    return arr;
  }, [links, nodes]);

  /** Per-pulse phase offset and speed, so signals never march in lockstep. */
  const pulseParams = useMemo(
    () =>
      Array.from({ length: pulseCount }, (_, i) => ({
        link: Math.floor(i / PULSES_PER_LINK),
        offset: (i % PULSES_PER_LINK) / PULSES_PER_LINK + ((i * 0.37) % 1) * 0.4,
        speed: 0.28 + ((i * 0.19) % 1) * 0.22,
      })),
    [pulseCount],
  );

  // Hoisted — nothing below allocates inside the frame loop.
  const dummy = useRef(new Object3D()).current;
  const from = useRef(new Vector3()).current;
  const to = useRef(new Vector3()).current;
  const cursor = useRef(new Vector3()).current;

  const elapsed = useRef(0);
  const damped = useRef({ x: 0, y: 0 });
  /** 0 = dormant, 1 = fully awake. Everything reactive reads this. */
  const wake = useRef(0);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, MAX_DELTA);

    // Reduced motion: a composed, legible still. The network is visible and the
    // structure reads; it simply does not move.
    if (sceneState.reducedMotion) {
      group.rotation.set(0, 0.35, 0);
      if (coreRef.current) coreRef.current.rotation.set(0, 0.35, 0);
      return;
    }

    elapsed.current += dt;

    // ---- pointer ---------------------------------------------------------
    // state.pointer is -1..1 across the canvas and updates for touch too, so
    // this covers both without a separate touch path.
    const px = state.pointer.x;
    const py = state.pointer.y;

    damped.current.x = MathUtils.damp(damped.current.x, px, POINTER_DAMPING, dt);
    damped.current.y = MathUtils.damp(damped.current.y, py, POINTER_DAMPING, dt);

    // Proximity to the core in screen space. Pointing near the middle — where
    // the network sits — wakes it; drifting to the edges lets it settle.
    cursor.set(px * 3.2, py * 2.0, 0);
    const proximity = 1 - MathUtils.clamp(cursor.length() / 3.4, 0, 1);
    const target = proximity > 0.12 ? 1 : 0;
    wake.current = MathUtils.damp(
      wake.current,
      target,
      target > wake.current ? WAKE_RATE : SLEEP_RATE,
      dt,
    );

    const w = wake.current;

    // ---- group orientation ----------------------------------------------
    group.rotation.y = elapsed.current * IDLE_SPIN + damped.current.x * 0.34;
    group.rotation.x = -damped.current.y * 0.2;
    // The whole constellation opens up slightly as it wakes.
    group.scale.setScalar(1 + w * 0.045);

    // ---- core ------------------------------------------------------------
    if (coreRef.current) {
      // Counter-rotates against the group so the core never looks welded to
      // the satellites — it reads as its own object.
      coreRef.current.rotation.y = -elapsed.current * IDLE_SPIN * 1.6;
      coreRef.current.rotation.z = Math.sin(elapsed.current * 0.25) * 0.08;
      const breath = 1 + Math.sin(elapsed.current * 0.7) * 0.012 + w * 0.05;
      coreRef.current.scale.setScalar(breath);
    }

    // ---- signals ---------------------------------------------------------
    const pulses = pulsesRef.current;
    if (!pulses) return;

    // Dormant signals crawl; woken ones move with intent.
    const rate = 0.35 + w * 1.5;

    for (let i = 0; i < pulseParams.length; i += 1) {
      const p = pulseParams[i];
      const link = links[p.link];
      if (!link) continue;

      from.copy(nodes[link[0]]);
      to.copy(nodes[link[1]]);

      // Wrap 0..1 along the link.
      const t = (elapsed.current * p.speed * rate + p.offset) % 1;
      dummy.position.lerpVectors(from, to, t);

      // Fade in and out at the ends so signals emerge and arrive rather than
      // popping into existence at the node.
      const edgeFade = Math.sin(t * Math.PI);
      const size = (0.018 + w * 0.022) * edgeFade;
      dummy.scale.setScalar(Math.max(size, 0.0001));
      dummy.updateMatrix();
      pulses.setMatrixAt(i, dummy.matrix);
    }

    pulses.instanceMatrix.needsUpdate = true;

    // Link brightness tracks wake, so the connections themselves respond.
    const material = pulses.material as { emissiveIntensity?: number };
    if (material.emissiveIntensity !== undefined) {
      material.emissiveIntensity = 1.4 + w * 2.6;
    }
  });

  const accent = useMemo(() => new Color('#cbff4d'), []);
  const dim = useMemo(() => new Color('#9ecc2e'), []);

  return (
    <group ref={groupRef}>
      {/* Core — the lead agent. Irregular by construction. */}
      <mesh ref={coreRef} geometry={coreGeometry}>
        <meshStandardMaterial
          color={accent}
          emissive={dim}
          emissiveIntensity={0.22}
          roughness={0.35}
          metalness={0.55}
          wireframe
        />
      </mesh>

      {/* Satellites — the specialists, sitting behind and around. */}
      {satellites.map((sat, i) => (
        <mesh key={i} position={[sat.pos[0], sat.pos[1], sat.pos[2]]} scale={sat.scale}>
          <icosahedronGeometry args={[1, sat.detail]} />
          <meshStandardMaterial
            color={accent}
            emissive={dim}
            emissiveIntensity={0.35}
            roughness={0.4}
            metalness={0.5}
            wireframe
          />
        </mesh>
      ))}

      {/* Links — the paths work travels along. */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linkPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={dim} transparent opacity={0.16} />
      </lineSegments>

      {/* Signals in flight. One InstancedMesh for all of them — the alternative
          is a draw call per pulse, which is wasteful for something this small. */}
      <instancedMesh
        ref={pulsesRef}
        args={[undefined, undefined, pulseCount]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
