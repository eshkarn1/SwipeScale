/**
 * Baseline loading / unsupported / error states for every `<SceneCanvas>`
 * mount. Functionally complete and accessible (real text, no dead ends) but
 * intentionally plain — ui-builder owns the final visual design of these
 * three states per the ownership split ("canvas loading/error/unsupported
 * states"). Restyle in place; keep the semantics (role, aria-live, the
 * link out in the unsupported state) intact.
 */

interface CanvasLoadingFallbackProps {
  label?: string;
}

export function CanvasLoadingFallback({ label = 'Loading 3D scene…' }: CanvasLoadingFallbackProps) {
  return (
    <div className="canvas-state canvas-state--loading" role="status" aria-live="polite">
      <span className="canvas-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function CanvasUnsupportedFallback() {
  return (
    <div className="canvas-state canvas-state--unsupported" role="status">
      <p>
        Your browser or device doesn&apos;t support WebGL, so the 3D scene is
        turned off here. Everything else on this site — including the full
        agent directory and team structure — works the same without it.
      </p>
    </div>
  );
}

export function CanvasErrorFallback() {
  return (
    <div className="canvas-state canvas-state--error" role="status">
      <p>The 3D scene couldn&apos;t load. The rest of the page is unaffected.</p>
    </div>
  );
}
