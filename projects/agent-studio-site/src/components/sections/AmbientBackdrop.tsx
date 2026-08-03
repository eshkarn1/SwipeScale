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
  offsetY = 0,
  intensity = 1,
  variant = 'section',
  className = '',
}: {
  /**
   * Distance down the page in viewport heights — 0 for the hero, then roughly
   * one per section below it. Sections share one continuous field and sample
   * it at their own offset, so the page reads as a single surface.
   *
   * These are hand-set rather than measured from the DOM on purpose: a
   * measured value changes with content length and would make the backdrop
   * shift whenever copy is edited.
   */
  offsetY?: number;
  intensity?: number;
  variant?: 'section' | 'hero';
  className?: string;
}) {
  return (
    <SceneCanvas
      className={`pointer-events-none absolute inset-0 z-0 ${className}`}
      ariaLabel=""
      fallback={<div className="absolute inset-0" />}
    >
      <AmbientField offsetY={offsetY} intensity={intensity} variant={variant} />
    </SceneCanvas>
  );
}
