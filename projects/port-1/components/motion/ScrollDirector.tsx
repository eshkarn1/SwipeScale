// Owned by Script 1 (build). DOM scroll effects only — it never touches a
// <canvas>; the frame engine in FrameSequence.tsx is Script 2's and is driven
// independently by its own rAF loop.
"use client";

import { useEffect } from "react";

/**
 * The page's single GSAP consumer.
 *
 * Sections are server components that ship inert `data-*` hooks; this one
 * client island wires ScrollTrigger to them. Two reasons it is shaped this way:
 *
 * 1. GSAP is `import()`ed inside the effect, so it lands in an async chunk and
 *    stays out of First Load JS. Nothing above the fold depends on it — the
 *    hero headline reveal is CSS keyframes (globals.css), because a JS reveal
 *    renders its initial state into the SSR HTML and hides the LCP element
 *    until hydration.
 * 2. Everything lives inside `gsap.matchMedia("(prefers-reduced-motion:
 *    no-preference)")`, so `reduce` gets no scrub, no fades, no from-states —
 *    just the static, fully readable document.
 */
export default function ScrollDirector() {
  useEffect(() => {
    let cancelled = false;
    // Structural rather than `gsap.MatchMedia`: a type-only import of the
    // namespace would be erased, but keeping the surface tiny documents
    // exactly what this component touches.
    let media: {
      add: (query: string, callback: () => void) => unknown;
      revert: () => void;
    } | null = null;

    void (async () => {
      const [core, plugin] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;

      const gsap = core.gsap;
      const ScrollTrigger = plugin.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const track = document.getElementById("hero-track");

        // --- Hero: the two scroll-linked fades over the pinned track --------
        // `start: top top` → `end: bottom bottom` maps the timeline 1:1 onto
        // the pin's own progress, so the spec's 0.05 / 0.75–0.9 numbers are
        // literal timeline positions. The leading no-op tween forces the
        // timeline duration to exactly 1 so those positions stay fractions.
        if (track) {
          const headline = track.querySelector("[data-hero-headline]");
          const cue = track.querySelector("[data-hero-cue]");

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: track,
              start: "top top",
              end: "bottom bottom",
              scrub: true,
            },
          });

          timeline.to({}, { duration: 1 }, 0);
          if (cue) timeline.to(cue, { opacity: 0, duration: 0.05 }, 0);
          if (headline) timeline.to(headline, { opacity: 0, duration: 0.15 }, 0.75);
        }

        // --- Positioning: word-by-word reveal -------------------------------
        // One block, not per word.
        //
        // This was a 0.04 per-word stagger. Across 41 words that is 1.6s of
        // staggering on top of the 0.7s tween, and because the statement is
        // 218 characters over six centred lines, *every* mid-scroll position
        // showed a half-lit paragraph with words sitting at different opacities
        // AND different vertical offsets — "build" and "website" hanging below
        // "AI can" — with the sentence cut off mid-phrase. It read as a
        // rendering fault rather than as an effect. The settled state was
        // always fine; nobody had looked at the in-between.
        //
        // Per-word stagger is a device for a short punchy line. This is a
        // paragraph, and it gets the same block reveal as every other section,
        // which is also why the page now feels consistent while scrolling.
        const statement = document.querySelector('[data-reveal="words"]');
        if (statement) {
          gsap.from(statement, {
            opacity: 0,
            y: 24,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: statement, start: "top 80%" },
          });
        }

        // --- Work cases -----------------------------------------------------
        for (const item of document.querySelectorAll('[data-reveal="case"]')) {
          gsap.from(item, {
            opacity: 0,
            y: 32,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: { trigger: item, start: "top 80%" },
          });
        }

        // --- Process: four rows, 0.06 stagger --------------------------------
        const rows = document.querySelectorAll('[data-reveal="process-row"]');
        if (rows.length > 0) {
          gsap.from(rows, {
            opacity: 0,
            y: 24,
            duration: 0.7,
            ease: "power2.out",
            stagger: 0.06,
            scrollTrigger: { trigger: rows[0], start: "top 80%" },
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      media?.revert();
    };
  }, []);

  return null;
}
