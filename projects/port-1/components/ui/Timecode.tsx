"use client";

import { useSyncExternalStore } from "react";
import { getFrameState, getServerFrameState, subscribeFrameState } from "@/lib/sequences";

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/**
 * The one signature element on the page: a live readout of whichever frame
 * sequence is currently on screen. Fixed bottom-left, amber, mono.
 * Decorative — `aria-hidden`, because announcing every frame is noise.
 *
 * ## Why it sits in a reserved lane
 *
 * The first version was `fixed bottom-[--gutter] left-[--gutter]` with nothing
 * behind it. Measured with `elementsFromPoint` in 400px scroll steps, it
 * overprinted page copy in 10 of 25 samples at 375x812 — at y=6000 the amber
 * string printed straight through the h2 "Two ways to work together.", the
 * heading that introduces both prices.
 *
 * The cause was a desktop-tuned constant: `--gutter` collapses from 5rem to
 * 1.25rem at 375 while body copy goes full-bleed, so the readout and the text
 * end up in the same column. At 1440 the copy is inset and there is no
 * conflict, which is why it looked fine there.
 *
 * Two changes, both needed:
 *
 * 1. A reserved lane — `body` carries bottom padding equal to this bar's
 *    height (`--timecode-lane` in globals.css), so page content cannot flow
 *    into the readout's row at all. Out of the text column, not merely on top
 *    of it.
 * 2. A backdrop — even in its own lane it sits over the page background, and
 *    over the hero canvas the frame beneath it is arbitrary.
 *
 * Nudging the offset was rejected: it moves the collision rather than removing
 * it, and would need re-tuning at every breakpoint.
 */
export default function Timecode() {
  const state = useSyncExternalStore(subscribeFrameState, getFrameState, getServerFrameState);
  const digits = state ? String(state.total).length : 3;

  return (
    <div
      aria-hidden="true"
      className="timecode-bar pointer-events-none fixed inset-x-0 bottom-0 z-40 select-none"
    >
      <span className="mono text-amber inline-block px-[var(--gutter)]">
      {state ? (
        <span className="whitespace-nowrap tabular-nums">
          Frame {pad(state.frame, digits)} / {pad(state.total, digits)}
          <span className="hidden sm:inline">
            {" "}·{" "}
            {state.label}
          </span>
        </span>
      ) : (
        <span className="whitespace-nowrap opacity-60">Standby</span>
      )}
      </span>
    </div>
  );
}
