/**
 * Global frame-fetch scheduler.  (Spec §3)
 *
 * §3 puts a concurrency cap of 6 on Pass B. The cap is applied GLOBALLY rather
 * than per sequence: four sequences each running their own pool of 6 is 24
 * concurrent decodes, which is exactly the main-thread contention the pass
 * structure exists to avoid.
 *
 * Priority is a CALLBACK evaluated at pop time, not a number fixed at enqueue
 * time. That is what makes "reprioritise on scroll" free — the playhead moves,
 * and the next task popped is already the one nearest the new playhead, with no
 * re-sorting, no re-enqueueing, and no work on the scroll handler itself.
 *
 * Pop is a linear scan of pending tasks. For this project that is ~324 tasks
 * scanned per pop across the whole page load, which is far cheaper than
 * maintaining a heap whose keys change on every scroll event.
 */

export const MAX_CONCURRENT = 6;

export interface QueueTask {
  /** Lower runs sooner. Evaluated fresh on every pop. */
  priority: () => number;
  run: () => Promise<void>;
  cancelled: boolean;
}

const pending: QueueTask[] = [];
let active = 0;

function pop(): QueueTask | undefined {
  let bestIndex = -1;
  let bestPriority = Number.POSITIVE_INFINITY;

  for (let i = 0; i < pending.length; i += 1) {
    const task = pending[i];
    if (task === undefined || task.cancelled) continue;
    const priority = task.priority();
    if (priority < bestPriority) {
      bestPriority = priority;
      bestIndex = i;
    }
  }

  if (bestIndex === -1) {
    // Everything left is cancelled; drop it all rather than rescanning forever.
    pending.length = 0;
    return undefined;
  }

  const [task] = pending.splice(bestIndex, 1);
  return task;
}

function pump(): void {
  while (active < MAX_CONCURRENT) {
    const task = pop();
    if (task === undefined) return;
    active += 1;
    void task
      .run()
      .catch(() => {
        // Task-level failure is the caller's business: FrameStore records the
        // dead index and nearestLoaded() covers it. The queue only schedules.
      })
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

export function enqueue(task: QueueTask): void {
  pending.push(task);
  pump();
}

/** Dev debug readout only. */
export function queueSnapshot(): { pending: number; active: number } {
  let live = 0;
  for (const task of pending) if (!task.cancelled) live += 1;
  return { pending: live, active };
}
