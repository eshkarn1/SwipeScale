import { useSyncExternalStore } from 'react';
import { getRendererStats, subscribeRendererStats, type RendererStats } from '@/three/rendererStats';

/** DOM-side reader for the live renderer telemetry published by
 * `RendererStatsProbe`. Real measured numbers — draw calls, triangle
 * count, resolved DPR, sampled fps — never a hardcoded performance claim. */
export function useRendererStats(): RendererStats {
  return useSyncExternalStore(subscribeRendererStats, getRendererStats, getRendererStats);
}
