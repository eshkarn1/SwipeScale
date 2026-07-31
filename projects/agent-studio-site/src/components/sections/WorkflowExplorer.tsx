'use client';

import { useState } from 'react';
import { SceneCanvas } from '@/components/canvas/SceneCanvas';
import { SceneEnvironment } from '@/components/canvas/SceneEnvironment';
import { WorkflowGraph } from '@/components/canvas/WorkflowGraph';
import { ROLE_COLORS, ROLE_LABELS, type Workflow } from '@/content/workflows';

/**
 * The team-graph experience.
 *
 * Accessibility approach worth stating plainly: the 3D is a *view* of the
 * workflow, never the only way to read it. The roster below is real focusable
 * markup, tab-ordered in workflow sequence, and it is what drives the graph —
 * not the other way round. Hover, focus, and touch all set the same state.
 *
 * That inverts the usual pattern where 3D hotspots are the primary control and
 * a list is bolted on afterwards, and it means the section is fully operable
 * with a keyboard, with a screen reader, and with WebGL disabled entirely.
 */
export function WorkflowExplorer({ workflow }: { workflow: Workflow }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = workflow.nodes.find((n) => n.id === activeId) ?? null;

  return (
    <div className="mt-16">
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-hairline bg-black">
        <SceneCanvas
          className="h-[clamp(320px,52vh,540px)] w-full"
          ariaLabel={`A three-dimensional diagram of the ${workflow.name}. The same information is available in the roster list below this diagram.`}
          fallback={
            <div className="flex h-[clamp(320px,52vh,540px)] items-center justify-center px-6 text-center text-sm text-text-faint">
              Your device can&apos;t display the 3D diagram. The full workflow is
              listed below.
            </div>
          }
        >
          <fog attach="fog" args={['#000000', 9, 26]} />
          <SceneEnvironment />
          <ambientLight intensity={0.1} />
          <directionalLight position={[5, 6, 4]} intensity={1.0} color="#DCE6F0" />
          <WorkflowGraph workflow={workflow} activeId={activeId} />
        </SceneCanvas>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-x-5 gap-y-2 bg-gradient-to-t from-black to-transparent p-5">
          <LegendItem color={ROLE_COLORS.lead} label="Lead — plans and delegates" />
          <LegendItem color={ROLE_COLORS.specialist} label="Specialist — does the work" />
          <LegendItem color={ROLE_COLORS.reviewer} label="Review gate — can reject" />
        </div>
      </div>

      {/* Live region: announces the selected agent without moving focus. */}
      <p
        className="mt-6 min-h-[3.5rem] max-w-[68ch] text-sm text-text-muted"
        role="status"
        aria-live="polite"
      >
        {active
          ? `${active.name} — ${active.does}`
          : 'Select an agent below to see what it does and what flows through it.'}
      </p>

      <ul className="mt-6 flex flex-wrap gap-2">
        {workflow.nodes.map((node) => {
          const isActive = node.id === activeId;
          return (
            <li key={node.id}>
              <button
                type="button"
                aria-pressed={isActive}
                onFocus={() => setActiveId(node.id)}
                onBlur={() => setActiveId((cur) => (cur === node.id ? null : cur))}
                onMouseEnter={() => setActiveId(node.id)}
                onMouseLeave={() => setActiveId((cur) => (cur === node.id ? null : cur))}
                onClick={() => setActiveId(isActive ? null : node.id)}
                className={[
                  'inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-full)]',
                  'border px-4 py-2 text-sm transition-colors duration-[var(--duration-fast)]',
                  isActive
                    ? 'border-text-faint bg-raised text-text'
                    : 'border-hairline text-text-muted hover:border-edge hover:text-text',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: ROLE_COLORS[node.role] }}
                />
                {node.name}
                <span className="text-2xs text-text-faint">{ROLE_LABELS[node.role]}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The complete workflow in plain markup. Crawlable, printable, and the
          fallback when the canvas cannot render. */}
      <ol className="mt-12 flex flex-col divide-y divide-hairline border-y border-hairline">
        {workflow.edges.map((edge) => {
          const fromNode = workflow.nodes.find((n) => n.id === edge.from);
          const toNode = workflow.nodes.find((n) => n.id === edge.to);
          if (!fromNode || !toNode) return null;
          return (
            <li
              key={`${edge.from}-${edge.to}-${edge.kind}`}
              className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6"
            >
              <span className="text-sm font-semibold">{fromNode.name}</span>
              <span
                className={[
                  'font-mono text-2xs uppercase tracking-[0.12em]',
                  edge.kind === 'returns' ? 'text-[#D9BE96]' : 'text-text-faint',
                ].join(' ')}
              >
                {edge.kind === 'returns' ? '↩ ' : '→ '}
                {edge.label}
              </span>
              <span className="text-sm text-text-muted">{toNode.name}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-2xs text-text-muted">
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
