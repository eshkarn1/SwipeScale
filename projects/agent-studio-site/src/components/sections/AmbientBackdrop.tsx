'use client';

import { SceneCanvas } from '@/components/canvas/SceneCanvas';
import { AmbientField } from '@/components/canvas/AmbientField';

/**
 * Drop-in ambient backdrop for a content section.
 *
 * Wraps the field in a canvas that is absolutely positioned behind whatever
 * the section renders. `pointer-events-none` matters: this sits above the
 * section background but below the copy, and without it every click and text
 * selection in the section would hit the canvas instead.
 *
 * The canvas has no lights and no environment — the field is unlit by design,
 * so this costs a fragment shader and nothing else.
 */
export function AmbientBackdrop({
  clearSide = 'left',
  intensity = 0.5,
  className = '',
}: {
  clearSide?: 'left' | 'right';
  intensity?: number;
  className?: string;
}) {
  return (
    <SceneCanvas
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      ariaLabel=""
      fallback={<div className="absolute inset-0" />}
    >
      <AmbientField clearSide={clearSide} intensity={intensity} />
    </SceneCanvas>
  );
}
