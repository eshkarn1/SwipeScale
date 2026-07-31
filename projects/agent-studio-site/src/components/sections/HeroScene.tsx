'use client';

import { SceneCanvas } from '@/components/canvas/SceneCanvas';
import { AgentNetwork } from '@/components/canvas/AgentNetwork';

/**
 * Hero.
 *
 * Structure matters more than styling here: the DOM content is real,
 * server-rendered, readable text that exists independently of the canvas. The
 * canvas sits behind it at a lower z-index and is `aria-hidden`. If WebGL
 * never loads, this section still reads and its CTAs still work — which is
 * the brief's requirement that 3D never obstruct conversion.
 */
export function HeroScene() {
  return (
    <section
      data-beat="arrival"
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      <SceneCanvas
        className="absolute inset-0 z-0"
        ariaLabel="A three-dimensional diagram of an agent network: an irregular central agent surrounded by smaller specialist agents, with signals travelling along the links between them. It becomes more active as you move the pointer over it."
        fallback={
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_60%_50%,rgba(203,255,77,0.10),transparent_70%)]" />
        }
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 5]} intensity={1.4} />
        {/* Rim from behind so the satellites separate from the background
            instead of flattening into it. */}
        <directionalLight position={[-5, -2, -6]} intensity={0.7} color="#9ecc2e" />
        <AgentNetwork />
      </SceneCanvas>

      <div className="relative z-10 mx-auto w-full max-w-[var(--container-page)] px-6 md:px-12">
        <div className="max-w-[20ch]">
          <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">
            AI Agent Studio
          </p>
          <h1 className="mt-8 text-6xl">Agents that ship real work.</h1>
          <p className="mt-8 max-w-[46ch] text-lg text-text-muted">
            Buy a pre-built agent, commission one to your spec, or deploy a team
            that runs an entire workflow. Measured in hours saved, not tokens.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="/contact"
              className="rounded-[var(--radius-full)] bg-accent px-7 py-3.5 text-sm font-semibold text-accent-ink transition-transform duration-[var(--duration-fast)] hover:-translate-y-0.5"
            >
              Book a call
            </a>
            <a
              href="/agents"
              className="rounded-[var(--radius-full)] border border-edge px-7 py-3.5 text-sm font-semibold transition-colors duration-[var(--duration-fast)] hover:bg-raised"
            >
              Browse agents
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
