import { Link, useParams } from 'react-router';
import { agentsById, type AgentId } from '@/data';
import { parseMarkdown } from '@/lib/markdown';
import { MarkdownBody } from '@/components/MarkdownBody';
import { useAgentRelationships } from '@/hooks/useAgentRelationships';

function isAgentId(id: string): id is AgentId {
  return id in agentsById;
}

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const agent = id && isAgentId(id) ? agentsById[id] : undefined;
  const relationships = useAgentRelationships(agent?.id ?? null);

  if (!agent) {
    return (
      <div className="agent-detail agent-detail--not-found">
        <h1>Agent not found</h1>
        <p>
          There&apos;s no agent with id &quot;{id}&quot;. It may have been
          renamed or never existed.
        </p>
        <Link to="/agents">Back to the directory</Link>
      </div>
    );
  }

  return (
    <article className="agent-detail agent-swatch" data-color={agent.color}>
      <header>
        <p className="agent-detail__eyebrow">{agent.title}</p>
        <h1>{agent.name}</h1>
        <p className="agent-detail__description">{agent.description}</p>
      </header>

      <dl className="agent-detail__facts">
        <div>
          <dt>Model</dt>
          <dd>{agent.model}</dd>
        </div>
        {agent.effort ? (
          <div>
            <dt>Effort</dt>
            <dd>{agent.effort}</dd>
          </div>
        ) : null}
        {agent.permissionMode ? (
          <div>
            <dt>Permission mode</dt>
            <dd>{agent.permissionMode}</dd>
          </div>
        ) : null}
        {agent.memory ? (
          <div>
            <dt>Memory</dt>
            <dd>{agent.memory}</dd>
          </div>
        ) : null}
        <div>
          <dt>Write access</dt>
          <dd>
            {agent.canEditFiles ? 'Can change files' : 'Read-only'}
            {!agent.canEditFiles ? (
              <span className="agent-detail__note">
                {' '}
                — enforced by its tool list, not by instruction
              </span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="agent-detail__buy">
        <p className="agent-detail__buy-text">
          Deploy {agent.name} into your codebase, or pair it with the
          specialists it already knows how to work with.
        </p>
        <div className="agent-detail__buy-actions">
          <a href="#enquire" className="button button--primary">
            Get this agent
          </a>
          <Link to="/teams" className="button button--secondary">
            See team packages
          </Link>
        </div>
      </div>

      {agent.skills.length > 0 ? (
        <section aria-labelledby="skills-heading">
          <h2 id="skills-heading">Skills</h2>
          <ul>
            {agent.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {agent.mcpServers.length > 0 ? (
        <section aria-labelledby="mcp-heading">
          <h2 id="mcp-heading">MCP servers</h2>
          <ul>
            {agent.mcpServers.map((server) => (
              <li key={server}>{server}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading">Tools</h2>
        <ul className="agent-detail__tools">
          {agent.tools.map((tool) => (
            <li key={tool.raw}>
              <span className="agent-detail__tool-name">{tool.name}</span>
              <span className="agent-detail__tool-kind">{tool.kind}</span>
              {tool.targets ? (
                <ul>
                  {tool.targets.map((targetId) => (
                    <li key={targetId}>
                      <Link to={`/agents/${targetId}`}>{agentsById[targetId].name}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {relationships.outgoing.length > 0 || relationships.incoming.length > 0 ? (
        <section aria-labelledby="relationships-heading">
          <h2 id="relationships-heading">Team relationships</h2>
          {relationships.outgoing.length > 0 ? (
            <div>
              <h3>Hands off to</h3>
              <ul>
                {relationships.outgoing.map((edge) => (
                  <li key={`${edge.from}-${edge.to}-${edge.kind}`} data-edge-kind={edge.kind}>
                    <Link to={`/agents/${edge.to}`}>{agentsById[edge.to].name}</Link>
                    {' — '}
                    {edge.label}
                    {edge.kind === 'approves' ? ' (approval loop)' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {relationships.incoming.length > 0 ? (
            <div>
              <h3>Receives from</h3>
              <ul>
                {relationships.incoming.map((edge) => (
                  <li key={`${edge.from}-${edge.to}-${edge.kind}`} data-edge-kind={edge.kind}>
                    <Link to={`/agents/${edge.from}`}>{agentsById[edge.from].name}</Link>
                    {' — '}
                    {edge.label}
                    {edge.kind === 'approves' ? ' (approval loop)' : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {agent.sections.map((section) => (
        <section key={section.heading} aria-label={section.heading}>
          <h2>{section.heading}</h2>
          <MarkdownBody blocks={parseMarkdown(section.body)} />
        </section>
      ))}

      <section className="agent-detail__enquire" id="enquire" aria-labelledby="enquire-heading">
        <h2 id="enquire-heading">Get {agent.name}</h2>
        <p>
          Available on its own or as part of a team package. Tell us what you
          are building and we will confirm the right configuration.
        </p>
        <div className="agent-detail__buy-actions">
          <a href="mailto:sales@example.com" className="button button--primary">
            Enquire about pricing
          </a>
          <Link to="/agents" className="button button--secondary">
            Compare other agents
          </Link>
        </div>
      </section>
    </article>
  );
}
