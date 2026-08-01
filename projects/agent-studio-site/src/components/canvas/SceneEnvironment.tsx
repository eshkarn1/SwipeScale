'use client';

import { Environment, Lightformer } from '@react-three/drei';

/**
 * Studio environment for reflections.
 *
 * This is the single highest-impact thing in the whole scene, and its absence
 * was a real bug rather than a matter of taste: a `metalness: 0.9` material
 * renders what it *reflects*. With no environment map there is nothing to
 * reflect, so polished metal resolves to near-black and reads flat and cheap
 * no matter how many lights are added. Direct lights only produce specular
 * dots; they cannot stand in for an environment.
 *
 * Built from Lightformers rather than drei's `preset` prop, which fetches an
 * HDR from a CDN — that is a render-blocking third-party request against a
 * 2.5s LCP budget, and it fails entirely offline. These are geometry inside a
 * baked cubemap: no network, full control over where highlights land.
 *
 * `frames={1}` bakes the cubemap once. Under `frameloop="never"` a
 * continuously-updating environment would re-render the probe on every
 * advance, which is pure waste for a static studio.
 */
export function SceneEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      {/* Key — the broad soft source. This is what draws the long highlight
          down the side of the core and gives the metal its direction. */}
      <Lightformer
        form="rect"
        intensity={3.2}
        color="#EEF4FF"
        position={[-4, 3, 4]}
        scale={[8, 6, 1]}
        target={[0, 0, 0]}
      />

      {/* Warm rim behind-right. Separates the silhouette from black and puts
          the brand accent into the reflections rather than only into emissive. */}
      {/* A rendered screenshot showed why a 6x4 panel at intensity 2.4 was
          wrong here: at metalness ~0.95 the core mirrors its environment, so a
          large bright lime source does not rim the object — it floods the whole
          body green. A narrow strip puts the accent on the silhouette edge and
          leaves the body dark, which is the effect that was wanted. */}
      <Lightformer
        form="rect"
        intensity={1.6}
        color="#CBFF4D"
        position={[4.2, -0.6, -3.4]}
        scale={[1.1, 3.4, 1]}
        target={[0, 0, 0]}
      />

      {/* Cool underlight. Stops the lower facets falling to pure black, which
          is what makes a faceted object read as a silhouette instead of a form.
          Kept cool and dim so it describes shape without adding a colour cast. */}
      <Lightformer
        form="rect"
        intensity={0.75}
        color="#3E5468"
        position={[0, -5, 1]}
        scale={[7, 4, 1]}
        target={[0, 0, 0]}
      />

      {/* Two narrow strips. These are the moving glints across facets as the
          object turns — the detail that reads as "expensive" on real product
          renders, and the reason strip lights exist in a physical studio. */}
      <Lightformer
        form="rect"
        intensity={5}
        color="#FFFFFF"
        position={[2, 4, 2]}
        scale={[0.4, 5, 1]}
        target={[0, 0, 0]}
      />
      <Lightformer
        form="rect"
        intensity={3.5}
        color="#FFFFFF"
        position={[-3, -2, 3]}
        scale={[0.3, 4, 1]}
        target={[0, 0, 0]}
      />
    </Environment>
  );
}
