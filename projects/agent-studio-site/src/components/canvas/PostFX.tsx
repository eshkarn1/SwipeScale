'use client';

import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { useTier } from '@/components/canvas/SceneCanvas';
import { sceneState } from '@/lib/scene-state';

/**
 * Post-processing.
 *
 * The brief asks for these "tuned, not maxed", which is the whole discipline:
 * heavy bloom is the clearest tell of an amateur WebGL scene. Settings, and
 * why each is what it is:
 *
 *   Bloom     luminanceThreshold 0.72 — high, so only the signal pulses and
 *             the brightest specular glints bloom at all. The metal bodies
 *             stay crisp. Lower this and the whole frame hazes over.
 *             mipmapBlur gives a wide soft falloff far more cheaply than a
 *             large kernel, and looks better doing it.
 *   Vignette  Pulls the corners down so the eye stays on the network. Subtle
 *             enough not to read as a filter.
 *   Noise     Film grain, but its real job is dithering — large areas of
 *             near-black gradient band badly on 8-bit displays and a little
 *             noise breaks the bands up. Also stops the image looking
 *             synthetically clean.
 *
 * Everything is tier-gated. Each effect is a full-screen pass, which is the
 * most expensive thing on a weak GPU and the first thing that should go.
 *
 * Note: no JSX comments between the children below. `{/* ... *\/}` evaluates
 * to `undefined`, and EffectComposer types its children as
 * `JSX.Element | JSX.Element[]`, so a comment child fails to typecheck with a
 * message about `Element` that gives no hint of the real cause.
 */
export function PostFX() {
  const profile = useTier();

  // Skip the composer entirely rather than mounting it with everything
  // disabled — an empty EffectComposer still costs a render target.
  if (!profile.postprocessing || sceneState.reducedMotion) return null;

  const effects: React.JSX.Element[] = [];

  if (profile.effects.bloom) {
    effects.push(
      <Bloom
        key="bloom"
        luminanceThreshold={0.72}
        luminanceSmoothing={0.28}
        intensity={0.55}
        mipmapBlur
        kernelSize={KernelSize.LARGE}
      />,
    );
  }

  effects.push(
    <Vignette key="vignette" offset={0.32} darkness={0.62} blendFunction={BlendFunction.NORMAL} />,
  );

  effects.push(<Noise key="noise" opacity={0.022} blendFunction={BlendFunction.OVERLAY} />);

  return (
    <EffectComposer
      // Normal pass stays off — nothing here needs scene normals, and it is an
      // extra full-scene render when enabled. (v3 renamed this from
      // `disableNormalPass`; it is opt-in now.)
      enableNormalPass={false}
      multisampling={profile.tier === 'high' ? 4 : 0}
    >
      {effects}
    </EffectComposer>
  );
}
