"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion/usePrefersReducedMotion";
import { timecode, type SequenceId } from "@/lib/sequences";

const LABELS: Record<SequenceId, string> = {
  hero: "HERO",
  "case-01": "CASE 01",
  "case-02": "CASE 02",
  "case-03": "CASE 03",
};

interface Reading {
  f: number;
  t: number;
  id: SequenceId;
}

/**
 * Spec §9. Fed from inside the draw, immediately after `drawImage`, so the
 * number and the pixels are always the same frame.
 */
export function Timecode() {
  const reduced = usePrefersReducedMotion();
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(
    () =>
      timecode.subscribe((f, t, id) => {
        // total === 0 is the store's "no sequence owns the readout" signal.
        setReading(t === 0 ? null : { f, t, id });
      }),
    [],
  );

  // Hidden entirely under reduced motion: a counter ticking 24 times a second
  // is exactly the kind of motion the preference is asking us to stop.
  if (reduced || reading === null) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-6 left-[var(--gutter)] z-50 font-mono text-micro tracking-[0.06em] text-amber"
    >
      FRAME {String(reading.f).padStart(3, "0")} / {reading.t}
      <span className="hidden sm:inline"> · {LABELS[reading.id]}</span>
    </div>
  );
}
