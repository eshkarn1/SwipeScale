import FrameSequence from "@/components/motion/FrameSequence";
import Eyebrow from "@/components/ui/Eyebrow";
import type { WorkCaseEntry } from "@/content/work";

/**
 * Cases 01 and 03 are image-left / metadata-right on desktop; case 02 is
 * reversed. Everything stacks below 1024px.
 */
export default function WorkCase({ entry }: { entry: WorkCaseEntry }) {
  return (
    <article
      data-reveal="case"
      className="grid grid-cols-1 items-center gap-[var(--stack-md)] lg:grid-cols-12"
    >
      <div
        className={`lg:col-span-7 ${entry.reversed ? "lg:order-2 lg:col-start-6" : "lg:order-1"}`}
      >
        <FrameSequence id={entry.sequenceId} mode="loop" className="w-full" />
      </div>

      <div
        className={`lg:col-span-5 ${entry.reversed ? "lg:order-1 lg:col-start-1 lg:row-start-1" : "lg:order-2"}`}
      >
        {/* Amber is reserved for timecode and frame counters — spec §6.3
            explicitly marks this one line amber. Nothing else on the site. */}
        <Eyebrow tone="amber">{entry.eyebrow}</Eyebrow>

        <h3 className="display mt-[clamp(0.75rem,1.5vh,1.25rem)] text-h2 text-bone">
          {entry.brand}
        </h3>

        <p className="prose mt-[clamp(0.75rem,1.5vh,1.25rem)] max-w-[48ch] text-body text-bone/80">
          {entry.premise}
        </p>

        <dl className="mt-[clamp(1.5rem,3vh,2.5rem)]">
          {entry.meta.map((row) => (
            <div key={row.label} className="rule flex gap-6 py-3">
              <dt className="mono w-[5.5rem] shrink-0 text-bone/55">{row.label}</dt>
              <dd className="mono text-bone">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
