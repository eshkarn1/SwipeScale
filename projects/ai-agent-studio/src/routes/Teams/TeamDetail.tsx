import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { agentsById, teams, type AgentId } from '@/data';
import { SceneCanvas } from '@/three/SceneCanvas';
import { TeamGraphScene } from '@/three/TeamGraphScene';
import {
  CanvasLoadingFallback,
  CanvasUnsupportedFallback,
  CanvasErrorFallback,
} from '@/components/CanvasStates';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAgentRelationships } from '@/hooks/useAgentRelationships';
import { RendererStatsBadge } from '@/components/RendererStatsBadge';

const team = teams[0];

/**
 * The fully interactive, explorable team graph.
 *
 * Keyboard operability: every node is also a real, focusable `<Link>` in
 * the `.team-graph__roster` list below the canvas — not an invisible
 * overlay sitting on top of it, so focus is never obscured by the canvas
 * (SC 2.4.11). Tabbing through the roster highlights the matching 3D node
 * (a torus ring, see SelectionRing) and updates the live region describing
 * that agent's delegate/approve relationships; Enter/click on a roster
 * entry navigates to its detail page, same as clicking the node directly
 * in the canvas. Mouse users get the same highlight via hover on either
 * surface.
 */
export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const [focusedId, setFocusedId] = useState<AgentId | null>(null);
  const [hoveredId, setHoveredId] = useState<AgentId | null>(null);

  const activeId = hoveredId ?? focusedId;
  const relationships = useAgentRelationships(activeId);
  const activeAgent = activeId ? agentsById[activeId] : null;

  const handleCanvasSelect = useCallback(
    (id: AgentId) => navigate(`/agents/${id}`),
    [navigate],
  );

  if (teamId && teamId !== team.id) {
    return (
      <div className="team-detail team-detail--not-found">
        <h1>Team not found</h1>
        <p>There&apos;s no team with id &quot;{teamId}&quot;.</p>
        <Link to="/teams">Back to teams</Link>
      </div>
    );
  }

  return (
    <div className="team-detail">
      <header>
        <h1>{team.name}</h1>
        <p>{team.description}</p>
      </header>

      <div className="team-graph">
        <SceneCanvas
          className="team-graph__canvas"
          // Reduced-motion users get an on-demand loop: the graph still renders
          // and stays interactive, but nothing animates continuously.
          frameloop={reducedMotion ? 'demand' : 'always'}
          loadingFallback={<CanvasLoadingFallback label="Loading team graph…" />}
          unsupportedFallback={<CanvasUnsupportedFallback />}
          errorFallback={<CanvasErrorFallback />}
          ariaLabel="Interactive 3D graph of the studio-core team's reporting, delegation, and approval structure. Use the roster list below for keyboard access."
        >
          <TeamGraphScene
            interactive
            autoRotate={false}
            focusedId={focusedId}
            hoveredId={hoveredId}
            onSelect={handleCanvasSelect}
            onHoverChange={setHoveredId}
          />
        </SceneCanvas>
        <RendererStatsBadge />

        <div className="team-graph__legend" aria-hidden="true">
          <span className="team-graph__legend-item" data-edge-kind="delegates">
            delegates
          </span>
          <span className="team-graph__legend-item" data-edge-kind="approves">
            approves (review loop)
          </span>
        </div>
      </div>

      <p className="team-graph__live" role="status" aria-live="polite">
        {activeAgent
          ? `${activeAgent.name}: ${
              relationships.outgoing.length > 0
                ? `delegates to ${relationships.outgoing.map((e) => agentsById[e.to].name).join(', ')}. `
                : ''
            }${
              relationships.incoming.length > 0
                ? `receives from ${relationships.incoming.map((e) => agentsById[e.from].name).join(', ')}.`
                : ''
            }`
          : 'Focus or hover an agent below to see its place in the team.'}
      </p>

      <ul className="team-graph__roster" aria-label="Team members (keyboard-operable graph controls)">
        {team.members.map((memberId) => {
          const agent = agentsById[memberId];
          return (
            <li key={memberId}>
              <Link
                to={`/agents/${memberId}`}
                className="agent-swatch"
                data-color={agent.color}
                onFocus={() => setFocusedId(memberId)}
                onBlur={() => setFocusedId((cur) => (cur === memberId ? null : cur))}
                onMouseEnter={() => setHoveredId(memberId)}
                onMouseLeave={() => setHoveredId((cur) => (cur === memberId ? null : cur))}
              >
                {agent.name}
                {memberId === team.lead ? ' (lead)' : ''}
              </Link>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="structure-notes-heading">
        <h2 id="structure-notes-heading">How this package is built</h2>
        <ul>
          <li>
            The lead (<Link to={`/agents/${team.lead}`}>{agentsById[team.lead].name}</Link>) holds
            no file-editing tools at all. It plans and delegates; it never writes code itself, so
            the agent deciding what to build is never the agent quietly building it.
          </li>
          <li>
            The asset agents run their own approve/reject loop with the reviewer before anything
            ships — the &quot;approves&quot; edges above, distinct from the plain delegate lines.
            Work is gated inside the team, not just at the end.
          </li>
        </ul>
      </section>

      <section className="team-detail__enquire" aria-labelledby="team-enquire-heading">
        <h2 id="team-enquire-heading">Deploy this package</h2>
        <p>
          {team.members.length} agents, configured to work together, dropped
          into your repository as versioned files. Tell us what you are
          building and we will confirm the right configuration.
        </p>
        <div className="team-detail__enquire-actions">
          <a href="mailto:sales@example.com" className="button button--primary">
            Enquire about pricing
          </a>
          <Link to="/agents" className="button button--secondary">
            Browse individual agents
          </Link>
        </div>
      </section>
    </div>
  );
}
