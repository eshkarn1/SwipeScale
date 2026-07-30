/**
 * Renderer construction — isolated to this one module by design.
 *
 * DECISION (verified 2026-07-30, recorded here so it is not re-litigated
 * per-scene): we use R3F's default `WebGLRenderer` (WebGL2), not
 * `WebGPURenderer`.
 *
 *   - WebGL2 ~94.7% global support vs WebGPU ~83.6%.
 *   - WebGPU is default-on in Chrome/Edge and Safari 26, but Firefox has it
 *     default-on only on Windows and Apple-Silicon macOS — not Linux, Intel
 *     Mac, or Android. A WebGPU-only build would serve those users nothing.
 *   - drei and @react-three/postprocessing remain WebGL-oriented; there are
 *     live reports of WebGPURenderer performing *below* WebGLRenderer for
 *     scenes like this one.
 *
 * ESCAPE HATCH, if this is revisited: R3F v9 accepts an async factory on
 * `gl`, so the swap is a one-file change here, not a rewrite:
 *
 *   import { WebGPURenderer } from 'three/webgpu';
 *   export const glConfig = async (props: object) => {
 *     const renderer = new WebGPURenderer(props);
 *     await renderer.init();
 *     return renderer;
 *   };
 *
 * and pass `<Canvas gl={glConfig}>` instead of the object below.
 */
import type { WebGLRendererParameters } from 'three';

export const glConfig: WebGLRendererParameters = {
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
};

/** Capped device pixel ratio — never render at full retina. */
export const dprRange: [number, number] = [1, 2];
