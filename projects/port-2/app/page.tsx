"use client";

/**
 * Demo / integration page for the motion engine.
 *
 * Its job is to exercise both modes honestly enough to measure: a pinned
 * 300vh scrub hero, three ambient loops spaced far enough apart that Pass C's
 * idle / IntersectionObserver gating actually happens instead of all three
 * being in view at once, the fixed timecode readout, and real focusable
 * elements so keyboard order and focus visibility can be tested.
 */

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";

import FrameSequence from "@/components/motion/FrameSequence";
import { Timecode } from "@/components/ui/Timecode";
import type { SequenceId } from "@/lib/sequences";

const CASES: { id: SequenceId; index: string; title: string; note: string }[] = [
  {
    id: "case-01",
    index: "01",
    title: "Ambient loop, sparse",
    note: "48 frames at 24fps. Clock-driven, seamless, pauses the moment it leaves the viewport.",
  },
  {
    id: "case-02",
    index: "02",
    title: "Ambient loop, moderate",
    note: "Same primitive, denser field. Loads on idle after the hero is interactive, not before.",
  },
  {
    id: "case-03",
    index: "03",
    title: "Ambient loop, dense",
    note: "Furthest down the page. Holds only its stride set until it is approached.",
  },
];

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal";

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const introPlayed = useRef(false);

  /**
   * §6: the intro fires on `onReady`. What it may NOT do is hide the headline
   * until then — see the .hero-line block in globals.css. The resting state is
   * visible and legible in the first painted frame; this only removes the last
   * 0.18em of travel.
   */
  const playIntro = useCallback(() => {
    if (introPlayed.current) return;
    introPlayed.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lines = heroRef.current?.querySelectorAll<HTMLElement>(".hero-line");
    if (!lines || lines.length === 0) return;
    gsap.to(lines, {
      y: 0,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.07,
      overwrite: "auto",
    });
  }, []);

  /**
   * Dev-only LCP readout. The number alone is not enough — the failure mode
   * this guards against shows up as the wrong ELEMENT being the LCP candidate,
   * with a number that can still look acceptable on a fast connection.
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (typeof PerformanceObserver === "undefined") return;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as
        | (PerformanceEntry & { element?: Element; url?: string; renderTime?: number })
        | undefined;
      if (!last) return;
      const target = window as Window & {
        __lcp?: { time: number; tag: string; src: string; className: string };
      };
      target.__lcp = {
        time: Math.round(last.startTime),
        tag: last.element?.tagName ?? "(none)",
        src: last.url ?? "",
        className: last.element?.className ?? "",
      };
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-[var(--gutter)] py-4">
        <span className="font-mono text-micro tracking-[0.18em] text-bone">SWIPE &amp; SCALE</span>
        <Link
          href="/blank"
          className={`inline-flex min-h-11 cursor-pointer items-center font-mono text-micro tracking-[0.18em] text-edge transition-colors hover:text-bone ${focusRing}`}
        >
          INDEX
        </Link>
      </header>

      <main>
        {/* ---------------- Hero: pinned 300vh scrub ---------------- */}
        <section ref={heroRef} className="relative">
          <FrameSequence
            id="hero"
            mode="scrub"
            scrollLength={3}
            onReady={playIntro}
            renderLoading={(p) => (
              <span className="font-mono text-micro tracking-[0.06em] text-amber">
                LOADING {String(Math.round(p * 100)).padStart(3, "0")}%
              </span>
            )}
          />

          {/* Sticky overlay spanning the pin spacer GSAP inserts, so the copy
              stays with the frame for the whole scrub. pointer-events-none so
              it cannot swallow clicks over the canvas; the links opt back in. */}
          <div className="pointer-events-none absolute inset-0">
            <div className="sticky top-0 h-[100svh]">
              {/* The asset pipeline keeps x 0.06, y 0.18, w 0.88, h 0.5 of the
                  frame visually quiet. The copy block sits inside exactly that. */}
              <div className="absolute left-[6%] top-[18%] h-[50%] w-[88%]">
                <p className="font-mono text-micro tracking-[0.18em] text-amber">
                  MOTION-LED WEB DESIGN
                </p>
                <h1 className="mt-[var(--stack-md)] max-w-[18ch] font-display text-h1 leading-[0.95] text-bone">
                  <span className="hero-line block">Motion that</span>
                  <span className="hero-line block">carries weight</span>
                </h1>
                <p className="hero-line mt-6 max-w-[46ch] text-body text-edge">
                  Canvas image sequences, scrubbed by scroll and driven by a clock. No video
                  element, no scroll hijacking, no library between your hand and the frame.
                </p>
                <div className="pointer-events-auto mt-[var(--stack-md)] flex flex-wrap items-center gap-6">
                  <a
                    href="#work"
                    className={`inline-flex min-h-11 cursor-pointer items-center border-b border-edge font-mono text-micro tracking-[0.18em] text-bone transition-colors hover:border-amber hover:text-amber ${focusRing}`}
                  >
                    SEE THE LOOPS
                  </a>
                  <a
                    href="#approach"
                    className={`inline-flex min-h-11 cursor-pointer items-center font-mono text-micro tracking-[0.18em] text-edge transition-colors hover:text-bone ${focusRing}`}
                  >
                    HOW IT WORKS
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Approach ---------------- */}
        <section
          id="approach"
          className="px-[var(--gutter)] py-[var(--stack-lg)]"
          style={{ scrollMarginTop: "5rem" }}
        >
          <h2 className="max-w-[20ch] font-display text-h2 leading-tight text-bone">
            Two primitives. Nothing else animates images.
          </h2>
          <div className="mt-[var(--stack-md)] grid gap-[var(--stack-md)] md:grid-cols-2">
            <div>
              <p className="font-mono text-micro tracking-[0.18em] text-amber">SCRUB</p>
              <p className="mt-4 max-w-[52ch] text-body text-edge">
                Scroll position drives the frame index through GSAP ScrollTrigger. The scroll
                handler writes a number and nothing else; drawing happens once per animation
                frame, and only when the frame has actually changed.
              </p>
            </div>
            <div>
              <p className="font-mono text-micro tracking-[0.18em] text-amber">LOOP</p>
              <p className="mt-4 max-w-[52ch] text-body text-edge">
                A clock advances the index and wraps cleanly. Offscreen or backgrounded, the
                loop is not merely throttled — its animation frame is cancelled outright.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- Work cases: three ambient loops ---------------- */}
        <section id="work" style={{ scrollMarginTop: "5rem" }}>
          {CASES.map((entry) => (
            <article
              key={entry.id}
              // Tall enough that only one loop is ever in view, so Pass C's idle
              // and observer gating is genuinely exercised rather than bypassed.
              className="flex min-h-[130svh] flex-col justify-center px-[var(--gutter)] py-[var(--stack-lg)]"
            >
              <div className="flex items-baseline justify-between gap-6">
                <h3 className="font-display text-h3 text-bone">{entry.title}</h3>
                <span className="font-mono text-micro tracking-[0.18em] text-edge">
                  {entry.index}
                </span>
              </div>
              <FrameSequence id={entry.id} mode="loop" className="mt-6 w-full" />
              <p className="mt-6 max-w-[52ch] text-body text-edge">{entry.note}</p>
            </article>
          ))}
        </section>

        {/* ---------------- Footer ---------------- */}
        <footer className="px-[var(--gutter)] pb-[var(--stack-lg)] pt-[var(--stack-md)]">
          <div className="flex flex-wrap items-center gap-6 border-t border-slate pt-[var(--stack-md)]">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
              className={`inline-flex min-h-11 cursor-pointer items-center border border-slate px-5 font-mono text-micro tracking-[0.18em] text-bone transition-colors hover:border-amber hover:text-amber ${focusRing}`}
            >
              BACK TO TOP
            </button>
            <Link
              href="/blank"
              className={`inline-flex min-h-11 cursor-pointer items-center font-mono text-micro tracking-[0.18em] text-edge transition-colors hover:text-bone ${focusRing}`}
            >
              INDEX
            </Link>
          </div>
        </footer>
      </main>

      <Timecode />
    </>
  );
}
