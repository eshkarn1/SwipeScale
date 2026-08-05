import { Fragment } from "react";

const STATEMENT =
  "AI can build you a website in an afternoon. It cannot make anyone feel anything. That last ten percent — the weight, the timing, the restraint — is the entire difference between a site that works and a site that sells.";

const WORDS = STATEMENT.split(" ");

/**
 * Below the fold, so a JS reveal is correct here — in-view detection is the
 * point. The words carry no CSS initial state: GSAP applies the `from` state
 * only when the trigger fires, so with JS off the statement reads normally.
 *
 * ## Deviation from spec §6.2, deliberate
 *
 * §6.2 asks for `--text-h1` at `max-w-[18ch]`. Measured in the live page with
 * those values applied to §7's copy, at 1440: 88px type on an 80.96px
 * line-height — leading *tighter* than the font size — 9 lines, a 729px block
 * filling 81% of a 900px viewport. At 375: 40px/36.8px, 14 lines, 515px, 63%
 * of the viewport.
 *
 * Those values describe a short, punchy statement; §7's actual copy is a
 * 218-character three-clause paragraph. The spec's size and the spec's copy
 * disagree, and the copy is the fixed one — §7 ships verbatim. So the type
 * scale gives way.
 *
 * Shipped, at 1440: `--text-h2` at 51.84px, leading 59.6px, 6 lines, a 358px
 * block. Still display face, still centred, still the only element in the
 * section.
 *
 * Three deviations from §4/§6.2, all deliberate:
 *   - size      `--text-h1` -> `--text-h2`
 *   - leading   0.92 -> 1.15. §4's 0.92 is a display-face headline value; this
 *               is the one place that face carries running text.
 *   - tracking  -0.035em -> -0.02em. §4 marks its tracking "do not adjust", so
 *               this one is named explicitly rather than folded into the
 *               leading change: tight tracking that reads as precision at 88px
 *               reads as cramped at 52px across six lines.
 *
 * On the measure: 18ch -> 26ch is wider in characters but *narrower* in px,
 * because ch scales with font size — 1054px at 18ch/88px becomes 897px at
 * 26ch/51.84px. The line count is what improved, not the column width.
 */
export default function Positioning() {
  return (
    <section
      id="positioning"
      className="bg-void px-[var(--gutter)] py-[var(--stack-lg)]"
      aria-label="Positioning"
    >
      <p
        data-reveal="words"
        className="display positioning-statement mx-auto max-w-[26ch] text-center text-h2 text-bone"
      >
        {WORDS.map((word, index) => (
          <Fragment key={`${word}-${index}`}>
            <span data-reveal-word className="inline-block">
              {word}
            </span>{" "}
          </Fragment>
        ))}
      </p>
    </section>
  );
}
