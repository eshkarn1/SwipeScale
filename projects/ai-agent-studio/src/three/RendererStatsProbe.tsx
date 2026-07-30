import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { setRendererStats } from './rendererStats';

const SAMPLE_INTERVAL = 0.25; // seconds between store updates — real data, throttled writes

/** Mount once per scene. Renders nothing; reads real `renderer.info` counts
 * and a rolling frame-time average each frame, publishing to the
 * DOM-visible telemetry store a few times a second. */
export function RendererStatsProbe() {
  const { gl } = useThree();
  const accum = useRef(0);
  const frames = useRef(0);
  const frameTimeAccum = useRef(0);

  useFrame((_state, delta) => {
    accum.current += delta;
    frameTimeAccum.current += delta;
    frames.current += 1;

    if (accum.current >= SAMPLE_INTERVAL) {
      const avgDelta = frameTimeAccum.current / frames.current;
      setRendererStats({
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        dpr: gl.getPixelRatio(),
        fps: avgDelta > 0 ? Math.round(1 / avgDelta) : 0,
      });
      accum.current = 0;
      frames.current = 0;
      frameTimeAccum.current = 0;
    }
  });

  return null;
}
