'use client';

import { SceneCanvas } from '@/components/canvas/SceneCanvas';
import { AgentNetwork } from '@/components/canvas/AgentNetwork';
import { SceneEnvironment } from '@/components/canvas/SceneEnvironment';
import { PostFX } from '@/components/canvas/PostFX';
import { Reveal } from '@/components/motion/Reveal';
import { Magnetic } from '@/components/motion/Magnetic';
import Link from 'next/link';

/**
 * Hero.
 *
 * The DOM content is real, server-rendered, readable text that exists
 * independently of the canvas. The canvas sits behind it, `aria-hidden`, and
 * if WebGL never loads the section still reads and its CTAs still work — the
 * brief's requirement that 3D never obstruct conversion.
 */
export function HeroScene() {
  return (
    <section
      data-beat="arrival"
      className="relative flex min-h-screen items-center overflow-hidden bg-black"
    >
      <SceneCanvas
        className="absolute inset-0 z-0"
        ariaLabel="A three-dimensional diagram of an agent network: an irregular central agent surrounded by smaller specialist agents of varied form, with signals travelling slowly along the links between them. It becomes more active as you move the pointer over it."
        fallback={<div className="absolute inset-0 bg-black" />}
      >
        {/* Atmospheric depth. Distant satellites fall away into the black
            rather than sitting at the same apparent distance as the core —
            depth from air, not from adding more objects. */}
        <fog attach="fog" args={['#000000', 7, 19]} />

        {/* Reflections. Without this the metal is black — see SceneEnvironment. */}
        <SceneEnvironment />

        {/* Very low ambient: the environment does the lifting now, and a strong
            ambient would flatten everything the Lightformers just shaped. */}
        <ambientLight intensity={0.08} />

        {/* One directional key for crisp facet definition on top of the soft
            environment. Environment gives form; this gives edges. */}
        <directionalLight position={[5, 6, 4]} intensity={1.1} color="#DCE6F0" />

        <AgentNetwork />
        <PostFX />
      </SceneCanvas>

      {/* Scrim: the copy must stay legible over whatever the scene is doing
          behind it. Reference sites all do this; text straight on a moving 3D
          backdrop is unreadable at some frames. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[5] bg-[linear-gradient(100deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.75)_34%,rgba(0,0,0,0.15)_62%,transparent_88%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-[var(--container-page)] px-6 md:px-12">
        <div className="max-w-[42rem]">
          <Reveal>
            <p className="font-mono text-2xs uppercase tracking-[0.24em] text-accent">
              AI Agent Studio
            </p>
          </Reveal>

          {/* CSS-driven, not the JS primitive: this is the LCP element, and the
              JS version ships its initial transform in the SSR HTML — the text
              would be invisible until hydration. See .reveal-line in globals.css. */}
          <h1 className="mt-8 text-6xl">
            <span className="reveal-mask reveal-line reveal-line-1">
              <span>Agents that ship</span>
            </span>
            <span className="reveal-mask reveal-line reveal-line-2">
              <span>real work.</span>
            </span>
          </h1>

          <Reveal delay={0.45}>
            <p className="mt-8 max-w-[44ch] text-lg text-text-muted">
              Buy a pre-built agent, commission one to your spec, or deploy a
              team that runs an entire workflow. Measured in hours returned to
              your team, not tokens consumed.
            </p>
          </Reveal>

          <Reveal delay={0.58}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {/* Magnetic on the primary CTA only. The effect works because
                  almost nothing else on the page does it. */}
              <Magnetic>
                <Link
                  href="/contact"
                  className="inline-block rounded-[var(--radius-full)] bg-accent px-7 py-3.5 text-sm font-semibold text-accent-ink"
                >
                  Book a call
                </Link>
              </Magnetic>
              <Link
                href="/agents"
                className="rounded-[var(--radius-full)] border border-edge px-7 py-3.5 text-sm font-semibold backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-raised"
              >
                Browse agents
              </Link>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Scroll affordance. A full-bleed hero with no page furniture leaves
          people unsure there is anything below it. */}
      <Reveal delay={1.1} className="absolute inset-x-0 bottom-8 z-10">
        <div className="mx-auto flex max-w-[var(--container-page)] px-6 md:px-12">
          <span className="font-mono text-2xs uppercase tracking-[0.2em] text-text-faint">
            Scroll
          </span>
        </div>
      </Reveal>
    </section>
  );
}
