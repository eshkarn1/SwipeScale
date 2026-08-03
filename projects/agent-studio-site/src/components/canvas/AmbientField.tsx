'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderMaterial, Vector2, Vector3 } from 'three';
import { sceneState } from '@/lib/scene-state';
import { useTier } from '@/components/canvas/SceneCanvas';

/**
 * Ambient background field.
 *
 * Built to replace a generated background video, and better than one for this
 * job on every axis that matters:
 *
 *   Loop        Perfect by construction, not by crossfading a seam. Every
 *               animated term is an INTEGER harmonic of the same base
 *               frequency, so the whole field returns to its exact starting
 *               state every LOOP_SECONDS. There is no seam to hide.
 *   Weight      A few hundred bytes of GLSL against ~1MB of H.264.
 *   Colour      Exactly the brand accent, not whatever a model produced.
 *   Composition The clear region is a uniform, so text legibility is
 *               guaranteed rather than hoped for.
 *   Responsive  Reflows to any viewport instead of being a fixed crop.
 *
 * Visually it is flowing contour lines — the same language as the rim-lit
 * edges on the agent network, so the two read as one system.
 */

/** Loop period. Everything is a whole multiple of this, so it tiles exactly. */
const LOOP_SECONDS = 24;
const TAU = Math.PI * 2;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;      // pre-wrapped to [0, TAU) on the CPU
  uniform float uAspect;
  uniform vec3  uAccent;
  uniform float uIntensity;
  /** 0 = clear on the left, 1 = clear on the right. */
  uniform float uClearSide;
  uniform float uDensity;
  /** 0 = section backdrop, 1 = hero. Hero adds depth layers and a focal mass. */
  uniform float uHero;
  /**
   * Where this section sits down the page, in viewport heights.
   *
   * This is what makes the whole page share ONE field instead of wearing
   * several different ones. Each placement samples the same continuous
   * function, just further along it — so scrolling reads as travelling across
   * a single surface rather than passing a series of unrelated backdrops.
   */
  uniform float uOffsetY;

  /**
   * Scalar field.
   *
   * Every time-dependent term uses sin/cos of an INTEGER multiple of t. That
   * is what makes the loop exact: at t = TAU every term is back where it
   * started, so frame N and frame 0 are identical. Use a non-integer
   * multiplier anywhere here and the seam comes back.
   */
  float field(vec2 p, float t) {
    float v = 0.0;
    v += sin(p.x * 1.7 + sin(t) * 1.3);
    v += sin(p.y * 2.1 - cos(t) * 1.1);
    v += sin((p.x + p.y) * 1.15 + sin(t * 2.0) * 0.7);
    v += sin(length(p - vec2(1.1, 0.2)) * 2.6 - cos(t * 3.0) * 0.55);
    v += sin((p.x - p.y) * 0.9 + sin(t * 2.0) * 0.4);
    return v;
  }

  void main() {
    // Aspect-corrected so the field never stretches on wide viewports, then
    // shifted down the shared field by this section's page position.
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * uDensity;
    p.y -= uOffsetY * uDensity;

    float f = field(p, uTime);

    // Thin contour lines through the field. fract() gives evenly spaced
    // isolines; the smoothstep keeps them hairline rather than banded.
    float iso = abs(fract(f * 0.5) - 0.5) * 2.0;
    float line = 1.0 - smoothstep(0.0, 0.09, iso);

    // A second, sparser set for depth — dimmer and offset.
    float iso2 = abs(fract(f * 0.5 + 0.25) - 0.5) * 2.0;
    float line2 = (1.0 - smoothstep(0.0, 0.035, iso2)) * 0.45;

    // Faint wash between the lines so the field reads as a surface with
    // contours on it rather than as loose strands floating in nothing.
    float wash = (1.0 - smoothstep(0.0, 0.85, iso)) * 0.09;

    // ---- hero-only depth --------------------------------------------------
    // A second field at a different scale and phase, sitting behind the first.
    // Two layers at different densities is what turns a flat pattern into
    // something with depth — the same reason the satellites sat behind the
    // core in the previous hero.
    float back = field(p * 0.45 + vec2(2.1, 0.0), uTime);
    float isoB = abs(fract(back * 0.5) - 0.5) * 2.0;
    float lineB = (1.0 - smoothstep(0.0, 0.16, isoB)) * 0.5;

    // Soft focal mass on the clear-side opposite, so the hero has a centre of
    // gravity instead of reading as evenly distributed texture.
    vec2 focal = vec2(mix(0.72, 0.28, uClearSide), 0.5);
    float glow = 1.0 - smoothstep(0.0, 0.62, length((vUv - focal) * vec2(uAspect, 1.0)));
    glow = pow(glow, 2.4) * 0.5;

    line += lineB * uHero;
    wash += glow * uHero;

    // Composition mask. This is the guarantee: the copy side stays black
    // regardless of what the field is doing.
    //
    // The ramp starts at 0.34 rather than 0.18 because a rendered screenshot
    // showed contour lines reaching under the headline, which runs to roughly
    // a third of the viewport. This is the whole advantage over a generated
    // video — the clear region is a number we set, not something we hope the
    // model respected.
    float x = mix(vUv.x, 1.0 - vUv.x, uClearSide);
    float clear = smoothstep(0.34, 0.88, x);

    // Deliberately a very gentle vertical falloff.
    //
    // It started at smoothstep(0, 0.28) / (0.72, 1.0), which faded every
    // section out at its own top and bottom — so each one visibly began and
    // ended, which is exactly what made the page read as separate backdrops
    // rather than one surface. Only the outermost few percent are touched now,
    // just enough to hide the plane edge.
    float vert = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.94, 1.0, vUv.y));

    float a = (line + line2 + wash) * clear * vert * uIntensity;

    // Premultiplied against black: the material is additive over the page,
    // so alpha carries the shape and the colour stays pure accent.
    gl_FragColor = vec4(uAccent * a, a);
  }
`;

/**
 * Shared constants.
 *
 * Density and clear side are deliberately NOT per-section props any more.
 * Varying them made every section look like a different background — the page
 * read as five designs rather than one. The only thing that varies per
 * placement is where it sits in the shared field.
 */
const DENSITY_HIGH = 2.4;
const DENSITY_LOW = 1.9;
/** Every heading on this site is left-aligned, so the clear side never changes. */
const CLEAR_SIDE = 0;

interface AmbientFieldProps {
  /**
   * Distance down the page in viewport heights. Sections sample one continuous
   * field at their own offset, which is what makes the page feel like a single
   * surface rather than a set of separate backdrops.
   */
  offsetY?: number;
  /** Hero adds a second depth layer and a focal mass. */
  variant?: 'section' | 'hero';
  /**
   * Brightness. The one intentional per-section control, because a heading
   * over open space and a four-column grid genuinely need different weights.
   * Keep the range narrow or the sections stop matching again.
   */
  intensity?: number;
}

export function AmbientField({
  offsetY = 0,
  variant = 'section',
  intensity = 1,
}: AmbientFieldProps) {
  const profile = useTier();
  const materialRef = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAspect: { value: 1.6 },
      uAccent: { value: new Vector3(0.796, 1.0, 0.302) }, // #CBFF4D linearised
      uIntensity: { value: intensity },
      uClearSide: { value: CLEAR_SIDE },
      // Fewer lines on weak hardware — the fragment cost is per pixel.
      uDensity: { value: profile.tier === 'high' ? DENSITY_HIGH : DENSITY_LOW },
      uHero: { value: variant === 'hero' ? 1 : 0 },
      uOffsetY: { value: offsetY },
      uResolution: { value: new Vector2(1, 1) },
    }),
    [intensity, profile.tier, variant, offsetY],
  );

  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;

    mat.uniforms.uAspect.value = state.viewport.aspect;

    // Reduced motion: hold a fixed, composed frame. Not frozen mid-transition —
    // a deliberate phase that reads as designed.
    if (sceneState.reducedMotion) {
      mat.uniforms.uTime.value = 1.2;
      return;
    }

    elapsed.current += Math.min(delta, 1 / 30);
    // Wrap on the CPU so the GPU never sees a large float, which loses
    // precision over a long session and makes the motion visibly stutter.
    mat.uniforms.uTime.value = ((elapsed.current / LOOP_SECONDS) * TAU) % TAU;
  });

  return (
    <mesh>
      {/* Sized generously and unlit — this is a full-bleed backdrop, and the
          camera never moves relative to it. */}
      <planeGeometry args={[26, 14]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
