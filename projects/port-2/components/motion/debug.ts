/**
 * `window.__motion` — the debug surface QA measures against.
 *
 * Development only. `process.env.NODE_ENV` is statically replaced at build
 * time, so the whole body is dead code in a production bundle.
 */

import { budgetSnapshot } from "./bitmapBudget";
import type { FrameStore } from "./FrameStore";
import { queueSnapshot } from "./frameQueue";
import { idleReleased } from "./idle";

const stores = new Map<string, FrameStore>();

export const DEBUG_ENABLED = process.env.NODE_ENV !== "production";

interface MotionDebug {
  sequences: () => ReturnType<FrameStore["snapshot"]>[];
  budget: () => ReturnType<typeof budgetSnapshot>;
  queue: () => ReturnType<typeof queueSnapshot>;
  passC: () => { idleReleased: boolean };
  /** performance.measure entries for every sequence's Pass A. */
  marks: () => { name: string; startTime: number; duration: number }[];
}

function install(): void {
  if (typeof window === "undefined") return;
  const target = window as Window & { __motion?: MotionDebug };
  if (target.__motion !== undefined) return;

  target.__motion = {
    sequences: () => Array.from(stores.values(), (store) => store.snapshot()),
    budget: budgetSnapshot,
    queue: queueSnapshot,
    passC: () => ({ idleReleased: idleReleased() }),
    marks: () =>
      performance
        .getEntriesByType("measure")
        .filter((entry) => entry.name.startsWith("motion:"))
        .map((entry) => ({
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
        })),
  };
}

export function registerDebugStore(store: FrameStore): () => void {
  if (!DEBUG_ENABLED) return () => {};
  install();
  stores.set(store.id, store);
  return () => {
    stores.delete(store.id);
  };
}
