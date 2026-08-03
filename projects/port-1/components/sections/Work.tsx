import Eyebrow from "@/components/ui/Eyebrow";
import WorkCase from "./WorkCase";
import { WORK } from "@/content/work";

export default function Work() {
  return (
    <section
      id="work"
      className="bg-void px-[var(--gutter)] py-[var(--stack-lg)]"
      aria-labelledby="work-heading"
    >
      <Eyebrow className="text-bone/55">SELECTED WORK</Eyebrow>
      <h2 id="work-heading" className="display mt-[clamp(1rem,2vh,1.75rem)] text-h2 text-bone">
        Three concepts, built to be looked at.
      </h2>

      <div className="mt-[var(--stack-md)] flex flex-col gap-[var(--stack-lg)]">
        {WORK.map((entry) => (
          <WorkCase key={entry.index} entry={entry} />
        ))}
      </div>
    </section>
  );
}
