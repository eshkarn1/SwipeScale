"use client";

import { useEffect, useState } from "react";

/**
 * Live subscription, not a one-shot read at mount — QA toggles this at runtime
 * and a sequence that only sampled it once would keep its rAF loop running.
 *
 * Starts `false` so the server and the first client render agree; the effect
 * corrects it before paint-relevant work begins.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}
