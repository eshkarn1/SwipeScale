import { HeroScene } from '@/components/sections/HeroScene';

/**
 * Scaffold home page.
 *
 * Content here is real but minimal — its job right now is to prove the
 * pipeline end to end: server-rendered HTML that is readable before any
 * WebGL loads, with the persistent canvas layered behind it. The full scroll
 * journey (proof strip, three offerings, how it works, featured agents,
 * testimonials, CTA) lands after the scroll storyboard is approved.
 */
export default function HomePage() {
  return (
    <>
      <HeroScene />

      {/* Second viewport exists so there is something to scroll to — it proves
          Lenis, ScrollTrigger, and the canvas are all reading one clock. */}
      <section className="relative z-10 mx-auto flex min-h-screen max-w-[var(--container-page)] flex-col justify-center px-6 md:px-12">
        <p className="font-mono text-2xs uppercase tracking-[0.2em] text-accent">
          Scaffold checkpoint
        </p>
        <h2 className="mt-6 max-w-[16ch] text-4xl">One clock, three systems.</h2>
        <p className="mt-6 max-w-[var(--container-text)] text-lg text-text-muted">
          Lenis interpolates the scroll, GSAP&nbsp;ScrollTrigger drives the
          timelines, and React&nbsp;Three&nbsp;Fiber renders the scene — all
          advanced from a single ticker. If this section scrolls smoothly and
          the object above tracks without lag, the foundation is sound.
        </p>
      </section>
    </>
  );
}
