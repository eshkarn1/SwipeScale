import { Link } from 'react-router';
import { teams } from '@/data';

/**
 * Teams index. Only one team exists today (`studio-core`), but this stays
 * a real listing rather than a redirect so a second team is a drop-in
 * addition, not a rewrite.
 */
export default function TeamsIndex() {
  return (
    <div className="teams-index">
      <header>
        <h1>Teams</h1>
        <p>{teams.length} team, {teams[0].members.length} agents.</p>
      </header>
      <ul className="teams-index__list">
        {teams.map((team) => (
          <li key={team.id}>
            <Link to={`/teams/${team.id}`} className="team-card">
              <h2>{team.name}</h2>
              <p>{team.description}</p>
              <p>
                {team.members.length} members, {team.edges.length} relationships
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
