/**
 * Route-level Suspense fallback for lazy-loaded pages (not the 3D canvas —
 * see CanvasStates.tsx for that). Baseline only; ui-builder may restyle.
 */
export function PageLoadingFallback() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      Loading…
    </div>
  );
}
