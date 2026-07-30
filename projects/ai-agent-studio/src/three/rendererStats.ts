/**
 * A tiny external store carrying REAL renderer telemetry out of the R3F
 * canvas to plain DOM components. Every number here is read straight off
 * `renderer.info` / a measured frame delta each frame — nothing here is a
 * hardcoded "60fps" style claim. See RendererStatsProbe (the writer, lives
 * inside <Canvas>) and useRendererStats (the DOM-side reader).
 */
export interface RendererStats {
  drawCalls: number;
  triangles: number;
  dpr: number;
  fps: number;
}

const listeners = new Set<() => void>();

let stats: RendererStats = { drawCalls: 0, triangles: 0, dpr: 1, fps: 0 };

export function setRendererStats(next: RendererStats): void {
  stats = next;
  for (const listener of listeners) listener();
}

export function getRendererStats(): RendererStats {
  return stats;
}

export function subscribeRendererStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
