'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type Agent,
  type AgentCategory,
} from '@/content/agents';
import { DURATION, EASE } from '@/lib/motion-tokens';

/**
 * Catalog grid with filtering.
 *
 * The brief asks that filtering trigger a physical rearrangement rather than a
 * CSS reflow. Motion's `layout` prop does exactly that: surviving cards animate
 * from their old box to their new one instead of jumping, so the grid reads as
 * rearranging rather than repainting. `AnimatePresence` handles the ones
 * leaving so nothing pops out of existence.
 */
export function AgentCatalog({ agents }: { agents: Agent[] }) {
  const [active, setActive] = useState<AgentCategory | 'all'>('all');

  const visible = useMemo(
    () => (active === 'all' ? agents : agents.filter((a) => a.category === active)),
    [agents, active],
  );

  // Only offer filters that would actually return something.
  const available = useMemo(
    () => CATEGORIES.filter((c) => agents.some((a) => a.category === c)),
    [agents],
  );

  return (
    <>
      <div className="mt-14 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
        <FilterChip active={active === 'all'} onClick={() => setActive('all')}>
          All
          <span className="ml-1.5 tabular-nums text-text-faint">{agents.length}</span>
        </FilterChip>
        {available.map((cat) => {
          const count = agents.filter((a) => a.category === cat).length;
          return (
            <FilterChip key={cat} active={active === cat} onClick={() => setActive(cat)}>
              {CATEGORY_LABELS[cat]}
              <span className="ml-1.5 tabular-nums text-text-faint">{count}</span>
            </FilterChip>
          );
        })}
      </div>

      <p className="sr-only" role="status">
        Showing {visible.length} of {agents.length} agents
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visible.map((agent) => (
            <motion.li
              key={agent.slug}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: DURATION.base, ease: EASE.outQuart }}
            >
              <Link
                href={`/agents/${agent.slug}`}
                className="group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-hairline bg-surface p-7 transition-colors duration-[var(--duration-base)] hover:border-edge"
              >
                <p className="font-mono text-2xs uppercase tracking-[0.16em] text-accent">
                  {CATEGORY_LABELS[agent.category]}
                </p>
                <h2 className="text-xl">{agent.name}</h2>
                <p className="text-sm text-text-muted">{agent.tagline}</p>

                <div className="mt-auto flex items-center justify-between border-t border-hairline pt-4 text-xs">
                  <span className="text-text-faint">Live in {agent.setupTime}</span>
                  <span className="font-semibold text-accent">
                    Details
                    <span
                      aria-hidden="true"
                      className="ml-1 inline-block transition-transform duration-[var(--duration-fast)] group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        // min-h-11 keeps the tap target at 44px even though the label is small.
        'cursor-pointer rounded-[var(--radius-full)] border px-4 py-2 text-sm',
        'inline-flex min-h-11 items-center transition-colors duration-[var(--duration-fast)]',
        active
          ? 'border-accent bg-accent font-semibold text-accent-ink'
          : 'border-edge text-text-muted hover:border-text-faint hover:text-text',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
