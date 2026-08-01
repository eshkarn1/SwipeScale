import type { Metadata } from 'next';
import Image from 'next/image';
import { getAgents } from '@/lib/sanity';
import { AgentCatalog } from '@/components/sections/AgentCatalog';
import array from '../../../public/img/agent-array.jpg';

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
    <>
      {/* Catalogue header plate. The composition is deliberately an orderly
          array rather than the cluster used on the closing CTAs — it reads as
          a catalogue of specimens, which is what this page is. Upper-left is
          pure black so the copy needs only a light scrim.
          Decorative: alt="" and aria-hidden. */}
      <div className="relative overflow-hidden bg-black">
        <Image
          src={array}
          alt=""
          aria-hidden="true"
          priority
          placeholder="blur"
          sizes="100vw"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[65%_center] opacity-70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.75)_55%,rgba(0,0,0,0.9)_100%)] md:bg-[linear-gradient(95deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.82)_42%,rgba(0,0,0,0.4)_75%,rgba(0,0,0,0.25)_100%)]"
        />

        <div className="relative mx-auto max-w-[var(--container-page)] px-6 pb-20 pt-36 md:px-12 md:pb-28 md:pt-44">
          <header className="max-w-[52ch]">
            <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">Catalog</p>
            <h1 className="mt-6 text-5xl">Agents, ready to deploy.</h1>
            <p className="mt-6 text-lg text-text-muted">
              Each one does a defined job end to end. Connect your tools, set the
              rules it works under, and it starts on real work in days.
            </p>
          </header>
        </div>
      </div>

      <div className="mx-auto max-w-[var(--container-page)] px-6 pb-32 md:px-12">
        <AgentCatalog agents={agents} />
      </div>
    </>
  );
}
