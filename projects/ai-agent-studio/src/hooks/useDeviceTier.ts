import { useEffect, useState } from 'react';

export type DeviceTier = 'checking' | 'full' | 'reduced';

/**
 * Cheap heuristic for "weak GPU / small device" so the hero can drop to a
 * lighter scene instead of shipping 12fps. None of these signals alone is
 * reliable, so we combine several and are conservative (any one weak
 * signal drops the tier):
 *   - narrow viewport (assume 320px-floor mobile hardware)
 *   - coarse pointer with no hover (touch-primary device)
 *   - low logical core count, where the browser exposes it
 *   - a software/SwiftShader WebGL renderer string, where readable
 */
function detectTier(): DeviceTier {
  if (typeof window === 'undefined') return 'full';

  const narrow = window.matchMedia('(max-width: 640px)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse) and (hover: none)').matches;
  const lowCores =
    typeof navigator !== 'undefined' &&
    typeof navigator.hardwareConcurrency === 'number' &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency <= 4;

  let softwareRenderer = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = ext
        ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
        : '';
      softwareRenderer = /swiftshader|software|llvmpipe/i.test(renderer);
    }
  } catch {
    softwareRenderer = false;
  }

  if (softwareRenderer) return 'reduced';
  if (narrow && coarsePointer) return 'reduced';
  if (coarsePointer && lowCores) return 'reduced';
  return 'full';
}

/** Client-only device capability tier, used to scale hero scene complexity. */
export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>('checking');

  useEffect(() => {
    setTier(detectTier());
  }, []);

  return tier;
}
