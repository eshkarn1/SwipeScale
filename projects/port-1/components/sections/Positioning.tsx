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
 * §6.2 asks for `--text-h1` at `max-w-[18ch]`. Rendered, that gave 88px type
 * with an 81px line-height — leading *tighter* than the font size — across a
 * 218-character paragraph, producing a ~980px wall of text that read as
 * shouting rather than as a thesis. At 18ch it would have been roughly twelve
 * lines of 88px.
 *
 * Those values describe a short, punchy statement; §7's actual copy is a
 * three-clause paragraph. The spec's size and the spec's copy disagree, and
 * the copy is the fixed one — §7 ships verbatim.
 *
 * So: `--text-h2` (52px at 1440), leading opened to 1.15 because a paragraph
 * needs room a headline does not, and the measure widened to 26ch so the line
 * count stays sane. Still display face, still centred, still the only element
 * in the section. It reads as the thesis it is.
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
