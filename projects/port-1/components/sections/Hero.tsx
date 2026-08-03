import FrameSequence from "@/components/motion/FrameSequence";

const HEADLINE_LINES = ["Websites", "that feel", "expensive."] as const;

/**
 * 300vh scroll track, sticky pin, scrubbed frame sequence.
 *
 * The headline reveal is pure CSS keyframes with per-line delays of
 * 0 / 0.08 / 0.16s — never JS. A JS reveal renders its initial state into
 * the SSR HTML, which ships an above-the-fold element that is invisible to
 * the LCP observer until hydration.
 *
 * GSAP only touches this section for the scroll-linked fades, which are
 * genuinely scroll-dependent.
 */
export default function Hero() {
  return (
    <section id="hero-track" className="hero-track relative h-[300svh]" aria-label="Introduction">
      <div className="hero-pin sticky top-0 h-svh w-full overflow-hidden">
        <FrameSequence
          id="hero"
          mode="scrub"
          scrubTargetId="hero-track"
          priority
          className="absolute inset-0 h-full w-full"
        />

        <div className="hero-vignette absolute inset-0" aria-hidden="true" />

        <div
          data-hero-headline
          className="absolute inset-x-0 bottom-0 px-[var(--gutter)] pb-[calc(var(--gutter)+4.75rem)]"
        >
          <h1 className="display text-mega text-bone">
            {HEADLINE_LINES.map((line) => (
              <span key={line} className="hero-line">
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <p className="hero-fade-in mono mt-[clamp(1.25rem,2.5vh,2rem)] text-bone">
            MOTION-LED WEB DESIGN · BUILT IN 2–6 WEEKS · FIXED PRICE
          </p>
        </div>

        <p
          data-hero-cue
          className="hero-fade-in mono absolute bottom-[calc(var(--gutter)+2.5rem)] left-1/2 -translate-x-1/2 text-bone"
        >
          SCROLL
        </p>
      </div>
    </section>
  );
}
