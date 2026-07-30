import { Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { useWebGLSupport } from '@/hooks/useWebGLSupport';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { glConfig, dprRange } from './renderer';

interface SceneCanvasProps {
  children: ReactNode;
  loadingFallback: ReactNode;
  unsupportedFallback: ReactNode;
  errorFallback: ReactNode;
  frameloop?: 'always' | 'demand' | 'never';
  className?: string;
  ariaLabel: string;
}

/**
 * The one place a route mounts a `<Canvas>`. Wires together, in order:
 * WebGL feature detection (mount nothing GPU-related if unsupported — the
 * route around it must still be fully usable), a Suspense boundary with a
 * real loading state (never a blank canvas), and an error boundary for
 * runtime failures (e.g. a GLB that fails to parse).
 *
 * The three fallback nodes are designed components owned by ui-builder;
 * this component only decides *when* each is shown.
 */
export function SceneCanvas({
  children,
  loadingFallback,
  unsupportedFallback,
  errorFallback,
  frameloop = 'always',
  className,
  ariaLabel,
}: SceneCanvasProps) {
  const support = useWebGLSupport();
  // `useProgress` reads a global drei store, so it works from this DOM-side
  // wrapper even though loading actually happens inside <Canvas>. Suspense
  // inside the canvas (below) can't render arbitrary DOM for its fallback,
  // so the *visible* loading state is this overlay, not the Suspense
  // fallback, which stays empty.
  const { active } = useProgress();

  if (support === 'checking') return <>{loadingFallback}</>;
  if (support === 'unsupported') return <>{unsupportedFallback}</>;

  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      {active ? loadingFallback : null}
      <CanvasErrorBoundary fallback={errorFallback}>
        <Canvas
          gl={glConfig}
          dpr={dprRange}
          frameloop={frameloop}
          shadows={false}
          aria-hidden="true"
        >
          <Suspense fallback={null}>{children}</Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
