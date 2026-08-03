import { Fragment } from "react";

const STATEMENT =
  "AI can build you a website in an afternoon. It cannot make anyone feel anything. That last ten percent — the weight, the timing, the restraint — is the entire difference between a site that works and a site that sells.";

const WORDS = STATEMENT.split(" ");

/**
 * Below the fold, so a JS reveal is correct here — in-view detection is the
 * point. The words carry no CSS initial state: GSAP applies the `from` state
 * only when the trigger fires, so with JS off the statement reads normally.
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
        className="display mx-auto max-w-[18ch] text-center text-h1 text-bone"
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
