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
  /** Shifts the whole field's phase so two sections never look identical. */
  uniform float uSeed;

  /**
   * Scalar field.
   *
   * Every time-dependent term uses sin/cos of an INTEGER multiple of t. That
   * is what makes the loop exact: at t = TAU every term is back where it
   * started, so frame N and frame 0 are identical. Use a non-integer
   * multiplier anywhere here and the seam comes back.
   */
  float field(vec2 p, float t, float seed) {
    float v = 0.0;
    v += sin(p.x * 1.7 + sin(t + seed) * 1.3);
    v += sin(p.y * 2.1 - cos(t + seed) * 1.1);
    v += sin((p.x + p.y) * 1.15 + sin(t * 2.0 + seed) * 0.7);
    v += sin(length(p - vec2(1.1, 0.2)) * 2.6 - cos(t * 3.0 + seed) * 0.55);
    v += sin((p.x - p.y) * 0.9 + sin(t * 2.0 + seed) * 0.4);
    return v;
  }

  void main() {
    // Aspect-corrected so the field never stretches on wide viewports.
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * uDensity;

    float f = field(p, uTime, uSeed);

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
    float back = field(p * 0.45, uTime, uSeed + 2.1);
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

    // Soft vertical falloff so the band blends into the sections above and
    // below rather than ending on a hard edge.
    float vert = smoothstep(0.0, 0.28, vUv.y) * (1.0 - smoothstep(0.72, 1.0, vUv.y));

    float a = (line + line2 + wash) * clear * vert * uIntensity;

    // Premultiplied against black: the material is additive over the page,
    // so alpha carries the shape and the colour stays pure accent.
    gl_FragColor = vec4(uAccent * a, a);
  }
`;

interface AmbientFieldProps {
  /** Which side stays black for copy. */
  clearSide?: 'left' | 'right';
  /** Overall brightness. Keep low — this sits behind text. */
  intensity?: number;
  /** Hero adds a second depth layer and a focal mass. */
  variant?: 'section' | 'hero';
  /**
   * Phase offset. Two sections with the same seed animate identically, which
   * reads as a repeated asset rather than one continuous system — give each
   * placement its own.
   */
  seed?: number;
  /** Scale of the pattern. Lower means larger, calmer forms. */
  density?: number;
}

export function AmbientField({
  clearSide = 'left',
  intensity = 0.5,
  variant = 'section',
  seed = 0,
  density,
}: AmbientFieldProps) {
  const profile = useTier();
  const materialRef = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);

  const uniforms = useMemo(() => {
    // Fewer lines on weak hardware — the fragment cost is per pixel.
    const base = profile.tier === 'high' ? 3.2 : 2.4;
    return {
      uTime: { value: 0 },
      uAspect: { value: 1.6 },
      uAccent: { value: new Vector3(0.796, 1.0, 0.302) }, // #CBFF4D linearised
      uIntensity: { value: intensity },
      uClearSide: { value: clearSide === 'left' ? 0 : 1 },
      uDensity: { value: density ?? base },
      uHero: { value: variant === 'hero' ? 1 : 0 },
      uSeed: { value: seed },
      uResolution: { value: new Vector2(1, 1) },
    };
  }, [clearSide, intensity, profile.tier, variant, seed, density]);

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
