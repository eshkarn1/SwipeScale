import { useEffect, useState } from 'react';

export type WebGLSupport = 'checking' | 'supported' | 'unsupported';

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * One-time WebGL feature detection. Starts in `checking` so the first paint
 * never assumes support either way, then settles to `supported` /
 * `unsupported`. The team-structure and directory routes must stay fully
 * usable in the `unsupported` state — this hook only gates whether the
 * `<Canvas>` mounts, never the rest of the page.
 */
export function useWebGLSupport(): WebGLSupport {
  const [support, setSupport] = useState<WebGLSupport>('checking');

  useEffect(() => {
    setSupport(detectWebGL() ? 'supported' : 'unsupported');
  }, []);

  return support;
}
