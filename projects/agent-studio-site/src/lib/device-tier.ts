/**
 * Device capability tiering.
 *
 * The brief is explicit: phones must not receive the desktop scene. This is
 * the single place that decides fidelity, so every 3D component reads a tier
 * rather than sniffing the device itself and drifting out of sync.
 *
 * Deliberately conservative — it is far cheaper to under-serve a capable
 * device than to ship a scene that melts a mid-range phone.
 */

export type DeviceTier = 'high' | 'medium' | 'low' | 'none';

export interface TierProfile {
  tier: DeviceTier;
  /** Cap for the renderer's device pixel ratio. Retina at full res is the single biggest cost. */
  dpr: [number, number];
  /** Whether to mount the postprocessing stack at all. */
  postprocessing: boolean;
  /** Bloom/DOF/chromatic aberration are additive; low tiers get none. */
  effects: { bloom: boolean; dof: boolean; chromaticAberration: boolean };
  /** Dynamic lights beyond the baseline ambient + key. */
  extraLights: number;
  /** Multiplier applied to procedural geometry resolution. */
  geometryScale: number;
  /** Shadow maps are off below high — they are rarely worth their cost here. */
  shadows: boolean;
}

export const TIER_PROFILES: Record<DeviceTier, TierProfile> = {
  high: {
    tier: 'high',
    dpr: [1, 2],
    postprocessing: true,
    effects: { bloom: true, dof: true, chromaticAberration: true },
    extraLights: 2,
    geometryScale: 1,
    shadows: true,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.5],
    postprocessing: true,
    effects: { bloom: true, dof: false, chromaticAberration: false },
    extraLights: 1,
    geometryScale: 0.65,
    shadows: false,
  },
  low: {
    tier: 'low',
    dpr: [1, 1],
    postprocessing: false,
    effects: { bloom: false, dof: false, chromaticAberration: false },
    extraLights: 0,
    geometryScale: 0.4,
    shadows: false,
  },
  none: {
    tier: 'none',
    dpr: [1, 1],
    postprocessing: false,
    effects: { bloom: false, dof: false, chromaticAberration: false },
    extraLights: 0,
    geometryScale: 0,
    shadows: false,
  },
};

/** True only when a real WebGL2 context can actually be created. */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

/**
 * Classify the current device. Runs once on the client; never during SSR.
 *
 * Signals used, in order of trustworthiness:
 *  1. No WebGL2            -> 'none' (static fallback)
 *  2. Save-Data / reduced  -> 'low'
 *  3. deviceMemory + cores -> the main signal on Chromium
 *  4. Coarse pointer       -> treated as mobile, capped at 'medium'
 *
 * Safari exposes neither deviceMemory nor a useful core count, so it falls
 * through to the pointer/width heuristic. That is why the default is
 * 'medium' rather than 'high': an unknown device is assumed modest.
 */
export function detectDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'medium';
  if (!detectWebGL()) return 'none';

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  if (nav.connection?.saveData) return 'low';

  const memory = nav.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 768px)').matches;

  // Explicitly weak hardware, whatever the form factor.
  if ((memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4)) {
    return 'low';
  }

  // Phones and tablets never get the desktop scene, however fast they are.
  if (coarsePointer || narrow) return 'medium';

  if (memory !== undefined && memory >= 8 && cores !== undefined && cores >= 8) {
    return 'high';
  }

  return 'medium';
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
