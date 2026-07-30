import { Link } from 'react-router';
import { teams } from '@/data';

/**
 * Team packages index. One package exists today, but this stays a real
 * listing rather than a redirect so a second is a drop-in addition, not a
 * rewrite.
 */
export default function TeamsIndex() {
  return (
    <div className="teams-index">
      <header>
        <h1>Team packages</h1>
        <p className="teams-index__lede">
          Agents that already know how to work together — a lead that plans and
          delegates, specialists that execute, and a reviewer that gates what
          ships. Buy the structure, not just the parts.
        </p>
      </header>
      <ul className="teams-index__list">
        {teams.map((team) => (
          <li key={team.id}>
            <Link to={`/teams/${team.id}`} className="team-card">
              <h2>{team.name}</h2>
              <p>{team.description}</p>
              <p className="team-card__meta">
                <span>{team.members.length} agents</span>
                <span>
                  {team.edges.filter((e) => e.kind === 'approves').length} approval
                  {team.edges.filter((e) => e.kind === 'approves').length === 1
                    ? ' gate'
                    : ' gates'}
                </span>
              </p>
              <span className="team-card__cta" aria-hidden="true">
                View package
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
