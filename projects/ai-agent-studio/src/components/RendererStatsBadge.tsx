import { useRendererStats } from '@/hooks/useRendererStats';

/**
 * Live renderer telemetry, read straight from `renderer.info` and a
 * measured frame-time sample — see `src/three/rendererStats.ts`. This is
 * the "real runtime facts, not a hardcoded 60fps badge" proof-of-craft
 * element called for in the brief. Baseline markup; ui-builder may restyle
 * placement/visual treatment.
 */
export function RendererStatsBadge() {
  const stats = useRendererStats();

  return (
    <p className="renderer-stats" aria-live="off">
      <span>{stats.drawCalls} draw calls</span>
      <span>{stats.triangles.toLocaleString()} tris</span>
      <span>{stats.fps || '—'} fps (measured)</span>
      <span>{stats.dpr.toFixed(2)}x DPR</span>
    </p>
  );
}
