import { Link } from 'react-router';
import { useAgentFilters } from '@/hooks/useAgentFilters';
import type { ToolKind } from '@/data';

const CAPABILITY_LABELS: Record<ToolKind, string> = {
  read: 'Read',
  write: 'Write',
  exec: 'Exec',
  delegate: 'Delegate',
  web: 'Web',
  skill: 'Skill',
  mcp: 'MCP',
  plan: 'Plan',
};

/**
 * The agent directory: search + filter, with filter state mirrored into the
 * URL query string (`?q=&model=&cap=&edit=`) so a filtered view is
 * linkable and back/forward moves through filter history. Designed to read
 * the same at 8 agents (today's real count) and at 50 — nothing here
 * assumes the fixed canonical order the data module documents.
 */
export default function AgentsDirectory() {
  const {
    state,
    results,
    totalCount,
    resultCount,
    availableModels,
    availableCapabilities,
    setQuery,
    toggleModel,
    toggleCapability,
    setCanEditFiles,
    clearAll,
  } = useAgentFilters();

  const hasActiveFilters =
    state.query !== '' ||
    state.models.length > 0 ||
    state.capabilities.length > 0 ||
    state.canEditFiles !== null;

  return (
    <div className="agents-directory">
      <header>
        <h1>Browse agents</h1>
        <p className="agents-directory__lede">
          Each agent is a specialist with a defined role and scoped tool
          access. Filter by the model it runs on or what it is allowed to do.
        </p>
        <p className="agents-directory__count" role="status">
          Showing {resultCount} of {totalCount} agents
        </p>
      </header>

      <form className="agents-directory__filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="agent-search">Search</label>
        <input
          id="agent-search"
          type="search"
          value={state.query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, title, description…"
        />

        <fieldset>
          <legend>Model</legend>
          {availableModels.map((model) => (
            <label key={model}>
              <input
                type="checkbox"
                checked={state.models.includes(model)}
                onChange={() => toggleModel(model)}
              />
              {model}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Capabilities</legend>
          {availableCapabilities.map((cap) => (
            <label key={cap}>
              <input
                type="checkbox"
                checked={state.capabilities.includes(cap)}
                onChange={() => toggleCapability(cap)}
              />
              {CAPABILITY_LABELS[cap]}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Write access</legend>
          <label>
            <input
              type="radio"
              name="canEditFiles"
              checked={state.canEditFiles === null}
              onChange={() => setCanEditFiles(null)}
            />
            Any
          </label>
          <label>
            <input
              type="radio"
              name="canEditFiles"
              checked={state.canEditFiles === true}
              onChange={() => setCanEditFiles(true)}
            />
            Can change files
          </label>
          <label>
            <input
              type="radio"
              name="canEditFiles"
              checked={state.canEditFiles === false}
              onChange={() => setCanEditFiles(false)}
            />
            Read-only
          </label>
        </fieldset>

        {hasActiveFilters ? (
          <button type="button" onClick={clearAll}>
            Clear filters
          </button>
        ) : null}
      </form>

      {results.length === 0 ? (
        <p className="agents-directory__empty" role="status">
          No agents match these filters.{' '}
          <button type="button" onClick={clearAll}>
            Clear filters
          </button>{' '}
          to see all {totalCount}.
        </p>
      ) : (
        <ul className="agents-directory__grid">
          {results.map((agent) => (
            <li key={agent.id}>
              <Link to={`/agents/${agent.id}`} className="agent-card agent-swatch" data-color={agent.color}>
                <h2>{agent.name}</h2>
                <p className="agent-card__title">{agent.title}</p>
                <p className="agent-card__summary">{agent.summary}</p>
                <p className="agent-card__meta">
                  <span className="agent-card__model">{agent.model}</span>
                  <span className="agent-card__access">
                    {agent.canEditFiles ? 'Can change files' : 'Read-only'}
                  </span>
                </p>
                <span className="agent-card__cta" aria-hidden="true">
                  View details
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
