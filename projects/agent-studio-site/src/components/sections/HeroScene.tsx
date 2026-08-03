'use client';

import Link from 'next/link';
import { AmbientBackdrop } from '@/components/sections/AmbientBackdrop';
import { Magnetic } from '@/components/motion/Magnetic';

/**
 * Hero.
 *
 * The 3D agent network that used to live here is gone — replaced by the same
 * ambient field the sections use, at hero scale. The field reads better, costs
 * a fragment shader instead of a scene graph, and means the whole page speaks
 * one visual language instead of the hero speaking a different one.
 *
 * The DOM content is real, server-rendered text that exists independently of
 * the canvas. The canvas is decorative and aria-hidden; if WebGL never loads,
 * this section still reads and its CTAs still work.
 */
export function HeroScene() {
  return (
    <section
      data-beat="arrival"
      className="relative flex min-h-screen items-center overflow-hidden bg-black"
    >
      {/* Hero variant: a second depth layer plus a focal mass, so this reads
          as the anchor of the page rather than as another section backdrop. */}
      <AmbientBackdrop
        variant="hero"
        clearSide="left"
        intensity={1.25}
        seed={0}
        density={2.6}
      />

      {/* Scrim. Vertical on mobile where the copy is full-width, horizontal
          from md where it sits in the left column.
          pointer-events-none is load-bearing: this is above the canvas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.82)_44%,rgba(0,0,0,0.45)_74%,rgba(0,0,0,0.2)_100%)] md:bg-[linear-gradient(100deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.8)_32%,rgba(0,0,0,0.25)_62%,transparent_92%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-[var(--container-page)] px-6 md:px-12">
        <div className="max-w-[42rem]">
          {/* CSS reveals, not the JS primitives — everything here is above the
              fold, and the JS versions render their initial state into the SSR
              HTML, which cost 2.8s of LCP when it was measured. */}
          <h1 className="text-6xl">
            <span className="reveal-mask reveal-line reveal-line-1">
              <span>Agents that ship</span>
            </span>
            <span className="reveal-mask reveal-line reveal-line-2">
              <span>real work.</span>
            </span>
          </h1>

          <p className="reveal-fade reveal-delay-1 mt-8 max-w-[44ch] text-lg text-text-muted">
            Buy a pre-built agent, commission one to your spec, or deploy a team
            that runs an entire workflow. Measured in hours returned to your
            team, not tokens consumed.
          </p>

          <div className="reveal-fade reveal-delay-2">
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
          </div>
        </div>
      </div>

      {/* Scroll affordance. A full-bleed hero with no page furniture leaves
          people unsure there is anything below it. */}
      <div className="reveal-fade reveal-delay-3 absolute inset-x-0 bottom-8 z-10">
        <div className="mx-auto flex max-w-[var(--container-page)] px-6 md:px-12">
          <span className="font-mono text-2xs uppercase tracking-[0.2em] text-text-faint">
            Scroll
          </span>
        </div>
      </div>
    </section>
  );
}
