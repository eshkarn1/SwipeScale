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
 * Hero route. The 3D scene shows the structure of a real agent team — how a
 * lead delegates and how approval gates work — because that structure IS the
 * product being sold, not decoration. Decorative mode here: no interaction,
 * slow auto-rotate; the interactive version lives on the team page.
 *
 * Weak-tier devices and reduced-motion both drop to a static frame instead of
 * a spinning scene; `useDeviceTier`'s "reduced" tier additionally skips
 * mounting the canvas at all on the narrowest / lowest-power devices.
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
            loadingFallback={<CanvasLoadingFallback label="Loading team diagram…" />}
            unsupportedFallback={<CanvasUnsupportedFallback />}
            errorFallback={<CanvasErrorFallback />}
            ariaLabel="A slowly rotating 3D diagram of an agent team, showing a lead agent delegating to specialists and the approval gates between them"
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
          <h1 id="hero-heading">AI agents that ship real work</h1>
          <p className="hero__lede">
            Specialist agents you deploy into your own codebase — each with a
            defined role, scoped tool access, and clear boundaries. Buy one, or
            buy a team that already knows how to work together.
          </p>
          <div className="hero__actions">
            <Link to="/agents" className="button button--primary">
              Browse {agents.length} agents
            </Link>
            <Link to="/teams" className="button button--secondary">
              See team packages
            </Link>
          </div>
        </div>

        {showScene ? <RendererStatsBadge /> : null}
      </section>

      <section className="value-props" aria-labelledby="value-props-heading">
        <h2 id="value-props-heading">Why agents, not prompts</h2>
        <ul className="value-props__grid">
          <li>
            <h3>Scoped by design</h3>
            <p>
              Every agent declares exactly which tools it can use. A reviewer
              that cannot edit files cannot quietly rewrite the code it just
              approved — the limit is enforced, not requested.
            </p>
          </li>
          <li>
            <h3>They work as a team</h3>
            <p>
              A lead plans and delegates; specialists execute in parallel;
              nothing ships until a reviewer approves it. You get the structure
              of a real team, not one model doing everything at once.
            </p>
          </li>
          <li>
            <h3>Drop into your repo</h3>
            <p>
              Each agent is a single file. Commit it, and your whole team has
              it on the next pull — versioned and reviewable like any other
              part of your codebase.
            </p>
          </li>
        </ul>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-heading">
        <h2 id="home-cta-heading">Start with one agent or a full team</h2>
        <p>
          Every agent lists its role, model, tool access, and operating rules up
          front, so you know what you are deploying before you deploy it.
        </p>
        <div className="home-cta__actions">
          <Link to="/agents" className="button button--primary">
            Browse the catalog
          </Link>
          <Link to="/teams" className="button button--secondary">
            Compare team packages
          </Link>
        </div>
      </section>
    </div>
  );
}
