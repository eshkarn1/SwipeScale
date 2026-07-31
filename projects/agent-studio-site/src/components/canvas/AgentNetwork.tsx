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
 * Solid forms, not wireframe. Wireframe reads as a tech demo; solid geometry
 * catching real light reads as a product, and that difference is most of what
 * "premium" means here. Everything is dark metal with a restrained emissive
 * edge, so the objects are lit rather than glowing.
 *
 * Composition: an irregular core agent, specialist satellites of varied form
 * behind and around it, and slow signals moving along the links between them.
 * It is dormant until pointed at.
 */

/* ---- Tuning -------------------------------------------------------------- */

const CORE_RADIUS = 1.4;
/** Vertex displacement off the sphere. 0 would give a ball, which we do not want. */
const IRREGULARITY = 0.26;
const IDLE_SPIN = 0.03;
const POINTER_DAMPING = 1.8;
const WAKE_RATE = 4.0;
const SLEEP_RATE = 1.5;
const MAX_DELTA = 1 / 30;

/**
 * Signal travel speed, in link-lengths per second.
 * Deliberately slow — these are messages being passed between colleagues, not
 * tracer fire. A signal takes roughly 12 seconds to cross a link at rest.
 */
const SIGNAL_SPEED_BASE = 0.085;
/** Multiplier when fully awake. Kept low so waking is a lift, not a launch. */
const SIGNAL_SPEED_AWAKE = 1.9;

/**
 * Palette.
 *
 * Mostly cool desaturated metals with two warm hits, so the group reads as a
 * considered set of objects rather than one colour repeated. Lime stays the
 * brand accent but is used on the core and one satellite only — if it appears
 * everywhere it stops being an accent.
 */
const PALETTE = {
  bone: '#E8E6DF',
  lime: '#CBFF4D',
  limeDim: '#8FB733',
  steel: '#8C9BA8',
  slate: '#5E6B78',
  violet: '#9B93C7',
  sand: '#D9BE96',
  teal: '#7FBFC4',
} as const;

type ShapeKind = 'octa' | 'dodeca' | 'tetra' | 'icosa' | 'torus' | 'box';

/**
 * Satellites — the specialists. Varied geometry deliberately: identical forms
 * in different sizes read as one object duplicated, not as a team of different
 * capabilities.
 */
const SATELLITES: {
  pos: [number, number, number];
  scale: number;
  shape: ShapeKind;
  color: string;
  emissive: string;
  spin: number;
}[] = [
  { pos: [2.45, 0.9, -1.5], scale: 0.34, shape: 'octa', color: PALETTE.steel, emissive: PALETTE.slate, spin: 0.16 },
  { pos: [-2.7, 0.4, -2.2], scale: 0.28, shape: 'dodeca', color: PALETTE.violet, emissive: '#3B3557', spin: -0.12 },
  { pos: [1.6, -1.6, -2.7], scale: 0.24, shape: 'tetra', color: PALETTE.sand, emissive: '#6B563A', spin: 0.22 },
  { pos: [-1.85, -1.25, -1.0], scale: 0.3, shape: 'torus', color: PALETTE.teal, emissive: '#2F5B5E', spin: -0.18 },
  { pos: [0.4, 2.1, -3.0], scale: 0.2, shape: 'box', color: PALETTE.lime, emissive: PALETTE.limeDim, spin: 0.14 },
  { pos: [3.15, -0.75, -3.6], scale: 0.17, shape: 'icosa', color: PALETTE.bone, emissive: '#5A5A52', spin: -0.2 },
];

/**
 * Links. Index 0 is the core; 1+ are satellites.
 * Two run satellite-to-satellite — the hand-off between specialists, which is
 * what makes this a team rather than a hub and spoke.
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

/** Stable pseudo-noise. A real simplex implementation is not worth the bytes
    for a single cached vertex displacement. Range roughly -1..1. */
function noise3(x: number, y: number, z: number): number {
  return (
    Math.sin(x * 1.7 + y * 0.9) * 0.5 +
    Math.sin(y * 2.3 - z * 1.1) * 0.3 +
    Math.sin(z * 1.9 + x * 1.3) * 0.2
  );
}

function Shape({ kind }: { kind: ShapeKind }) {
  switch (kind) {
    case 'octa':
      return <octahedronGeometry args={[1, 0]} />;
    case 'dodeca':
      return <dodecahedronGeometry args={[1, 0]} />;
    case 'tetra':
      return <tetrahedronGeometry args={[1, 0]} />;
    case 'torus':
      return <torusGeometry args={[0.75, 0.3, 12, 32]} />;
    case 'box':
      return <boxGeometry args={[1.3, 1.3, 1.3]} />;
    default:
      return <icosahedronGeometry args={[1, 0]} />;
  }
}

export function AgentNetwork() {
  const profile = useTier();
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const pulsesRef = useRef<InstancedMesh>(null);
  const satelliteRefs = useRef<(Mesh | null)[]>([]);

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

  const nodes = useMemo(
    () => [new Vector3(0, 0, 0), ...satellites.map((s) => new Vector3(...s.pos))],
    [satellites],
  );

  /** The irregular core. Built once, cached — a sculpted form, not a per-frame effect. */
  const coreGeometry = useMemo(() => {
    const geo = new IcosahedronGeometry(CORE_RADIUS, 4);
    const position = geo.attributes.position;
    const v = new Vector3();

    for (let i = 0; i < position.count; i += 1) {
      v.fromBufferAttribute(position, i);
      const n = noise3(v.x * 1.15, v.y * 1.15, v.z * 1.15);
      v.multiplyScalar(1 + n * IRREGULARITY);
      position.setXYZ(i, v.x, v.y, v.z);
    }

    position.needsUpdate = true;
    // Flat normals: the facets catch light individually, which is what makes a
    // dark metal read as faceted rather than as a smooth blob.
    geo.computeVertexNormals();
    return geo;
  }, []);

  const linkPositions = useMemo(() => {
    const arr = new Float32Array(links.length * 6);
    links.forEach(([a, b], i) => {
      arr.set([nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z], i * 6);
    });
    return arr;
  }, [links, nodes]);

  const pulseParams = useMemo(
    () =>
      Array.from({ length: pulseCount }, (_, i) => ({
        link: Math.floor(i / PULSES_PER_LINK),
        offset: (i % PULSES_PER_LINK) / PULSES_PER_LINK + ((i * 0.37) % 1) * 0.4,
        // Narrow spread: signals should feel like one system, not a race.
        speed: 0.85 + ((i * 0.19) % 1) * 0.3,
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
  const wake = useRef(0);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, MAX_DELTA);

    if (sceneState.reducedMotion) {
      group.rotation.set(0, 0.35, 0);
      return;
    }

    elapsed.current += dt;

    const px = state.pointer.x;
    const py = state.pointer.y;

    damped.current.x = MathUtils.damp(damped.current.x, px, POINTER_DAMPING, dt);
    damped.current.y = MathUtils.damp(damped.current.y, py, POINTER_DAMPING, dt);

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

    group.rotation.y = elapsed.current * IDLE_SPIN + damped.current.x * 0.3;
    group.rotation.x = -damped.current.y * 0.18;
    group.scale.setScalar(1 + w * 0.04);

    if (coreRef.current) {
      coreRef.current.rotation.y = -elapsed.current * IDLE_SPIN * 1.5;
      coreRef.current.rotation.z = Math.sin(elapsed.current * 0.22) * 0.07;
      coreRef.current.scale.setScalar(1 + Math.sin(elapsed.current * 0.6) * 0.01 + w * 0.04);
    }

    // Each satellite turns at its own rate and direction, so the group never
    // looks like one rigid object being rotated.
    for (let i = 0; i < satelliteRefs.current.length; i += 1) {
      const mesh = satelliteRefs.current[i];
      const sat = satellites[i];
      if (!mesh || !sat) continue;
      mesh.rotation.y = elapsed.current * sat.spin;
      mesh.rotation.x = elapsed.current * sat.spin * 0.6;
    }

    const pulses = pulsesRef.current;
    if (!pulses) return;

    const rate = SIGNAL_SPEED_BASE * (1 + w * (SIGNAL_SPEED_AWAKE - 1));

    for (let i = 0; i < pulseParams.length; i += 1) {
      const p = pulseParams[i];
      const link = links[p.link];
      if (!link) continue;

      from.copy(nodes[link[0]]);
      to.copy(nodes[link[1]]);

      const t = (elapsed.current * p.speed * rate + p.offset) % 1;
      dummy.position.lerpVectors(from, to, t);

      // Fade at both ends so a signal departs and arrives rather than popping
      // into existence at a node.
      const edgeFade = Math.sin(t * Math.PI);
      dummy.scale.setScalar(Math.max((0.026 + w * 0.014) * edgeFade, 0.0001));
      dummy.updateMatrix();
      pulses.setMatrixAt(i, dummy.matrix);
    }

    pulses.instanceMatrix.needsUpdate = true;
  });

  const colors = useMemo(
    () => ({
      bone: new Color(PALETTE.bone),
      lime: new Color(PALETTE.lime),
      limeDim: new Color(PALETTE.limeDim),
      slate: new Color(PALETTE.slate),
    }),
    [],
  );

  return (
    <group ref={groupRef}>
      {/* Core — the lead agent. Dark metal, faceted, lit rather than glowing. */}
      <mesh ref={coreRef} geometry={coreGeometry}>
        <meshStandardMaterial
          color={colors.bone}
          emissive={colors.limeDim}
          emissiveIntensity={0.06}
          roughness={0.22}
          metalness={0.92}
          flatShading
        />
      </mesh>

      {/* Satellites — varied form and colour, so they read as different
          capabilities rather than one object duplicated. */}
      {satellites.map((sat, i) => (
        <mesh
          key={i}
          ref={(el) => {
            satelliteRefs.current[i] = el;
          }}
          position={sat.pos}
          scale={sat.scale}
        >
          <Shape kind={sat.shape} />
          <meshStandardMaterial
            color={sat.color}
            emissive={sat.emissive}
            emissiveIntensity={0.14}
            roughness={0.28}
            metalness={0.85}
            flatShading={sat.shape !== 'torus'}
          />
        </mesh>
      ))}

      {/* Links — faint. They are the paths, not the subject. */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linkPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={colors.slate} transparent opacity={0.12} />
      </lineSegments>

      {/* Signals. Soft and slow — tone-mapped so they sit in the image instead
          of blowing out into laser streaks. One InstancedMesh for all of them. */}
      <instancedMesh ref={pulsesRef} args={[undefined, undefined, pulseCount]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color={colors.bone}
          emissive={colors.lime}
          emissiveIntensity={0.55}
          roughness={0.4}
          metalness={0.1}
        />
      </instancedMesh>
    </group>
  );
}
