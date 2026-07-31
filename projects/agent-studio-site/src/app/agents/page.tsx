import type { Metadata } from 'next';
import { getAgents } from '@/lib/sanity';
import { AgentCatalog } from '@/components/sections/AgentCatalog';

export const metadata: Metadata = {
  title: 'Agent catalog',
  description:
    'Pre-built AI agents for sales, support, research, operations, content, and finance. Connect your tools and deploy in days.',
};

/**
 * Catalog route.
 *
 * The agent list is rendered on the server and passed down, so the full catalog
 * is in the HTML for crawlers and readable before any JS runs. Filtering is a
 * client concern layered on top of that — it narrows what is already there
 * rather than fetching.
 */
export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 pt-36 md:px-12 md:pt-44">
      <header className="max-w-[52ch]">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">Catalog</p>
        <h1 className="mt-6 text-5xl">Agents, ready to deploy.</h1>
        <p className="mt-6 text-lg text-text-muted">
          Each one does a defined job end to end. Connect your tools, set the
          rules it works under, and it starts on real work in days.
        </p>
      </header>

      <AgentCatalog agents={agents} />
    </div>
  );
}
