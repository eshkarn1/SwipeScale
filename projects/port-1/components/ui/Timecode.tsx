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
 */
export default function Timecode() {
  const state = useSyncExternalStore(subscribeFrameState, getFrameState, getServerFrameState);
  const digits = state ? String(state.total).length : 3;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-[var(--gutter)] left-[var(--gutter)] z-40 mono text-amber select-none"
    >
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
    </div>
  );
}
