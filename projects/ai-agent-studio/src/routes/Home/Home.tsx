import { Link } from 'react-router';
import { agents, teams } from '@/data';
import { SceneCanvas } from '@/three/SceneCanvas';
import { TeamGraphScene } from '@/three/TeamGraphScene';
import {
  CanvasLoadingFallback,
  CanvasUnsupportedFallback,
  CanvasErrorFallback,
} from '@/components/CanvasStates';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { RendererStatsBadge } from '@/components/RendererStatsBadge';

/**
 * Hero route. The 3D scene here is the real `studio-core` team graph
 * (decorative mode: no interaction, slow auto-rotate) — establishing craft
 * with the actual product, not a generic particle demo. Weak-tier devices
 * and reduced-motion both drop to a static frame instead of a spinning
 * scene; `useDeviceTier`'s "reduced" tier additionally skips mounting the
 * canvas at all on the narrowest / lowest-power devices.
 */
export default function Home() {
  const reducedMotion = useReducedMotion();
  const deviceTier = useDeviceTier();
  const showScene = deviceTier !== 'reduced';

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-heading">
        {showScene ? (
          <SceneCanvas
            className="hero__canvas"
            frameloop={reducedMotion ? 'demand' : 'always'}
            loadingFallback={<CanvasLoadingFallback label="Loading the studio team graph…" />}
            unsupportedFallback={<CanvasUnsupportedFallback />}
            errorFallback={<CanvasErrorFallback />}
            ariaLabel="A slowly rotating 3D graph of the studio's eight agents and their reporting lines"
          >
            <TeamGraphScene
              interactive={false}
              autoRotate={!reducedMotion}
              focusedId={null}
              hoveredId={null}
            />
          </SceneCanvas>
        ) : (
          <div className="hero__canvas hero__canvas--static">
            <CanvasUnsupportedFallback />
          </div>
        )}

        <div className="hero__content">
          <h1 id="hero-heading">AI Agent Studio</h1>
          <p className="hero__lede">
            {agents.length} real AI agents, organized into {teams.length} team. This
            page is rendered by the same agents it describes.
          </p>
          <div className="hero__actions">
            <Link to="/agents">Browse the agent directory</Link>
            <Link to="/teams/studio-core">Explore the team structure</Link>
          </div>
        </div>

        {showScene ? <RendererStatsBadge /> : null}
      </section>
    </div>
  );
}
