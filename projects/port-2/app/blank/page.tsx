import Link from "next/link";

/**
 * Deliberately trivial. Its only job is to give QA a client-side navigation
 * target so the hero unmounts and the §7 heap-after-unmount budget (within 10%
 * of baseline) can be measured against a route that holds no canvas, no
 * bitmaps and no observers of its own.
 */
export default function Blank() {
  return (
    <main className="flex min-h-[100svh] flex-col justify-center px-[var(--gutter)]">
      <p className="font-mono text-micro tracking-[0.18em] text-amber">INDEX</p>
      <h1 className="mt-[var(--stack-md)] font-display text-h2 text-bone">Nothing is running here.</h1>
      <p className="mt-6 max-w-[52ch] text-body text-edge">
        No canvas, no sequence, no animation frame. Navigate back and forth to measure what the
        motion engine leaves behind.
      </p>
      <Link
        href="/"
        className="mt-[var(--stack-md)] inline-flex min-h-11 w-fit cursor-pointer items-center border-b border-edge font-mono text-micro tracking-[0.18em] text-bone transition-colors hover:border-amber hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
      >
        BACK TO THE HERO
      </Link>
    </main>
  );
}
