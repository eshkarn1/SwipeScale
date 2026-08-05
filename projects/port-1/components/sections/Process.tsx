import Eyebrow from "@/components/ui/Eyebrow";

interface Step {
  number: string;
  title: string;
  body: string;
}

/** Numbered 01–04 because the order carries information. */
const STEPS: readonly Step[] = [
  {
    number: "01",
    title: "Scope in one call",
    body: "Forty-five minutes. You show me the brand, I tell you which package fits and what it will cost. No proposal document, no second call.",
  },
  {
    number: "02",
    title: "Direction, not mood boards",
    body: "You get one art direction with real type, real colour, and one animated moment built for real. You approve the thing itself, not a picture of it.",
  },
  {
    number: "03",
    title: "Build in the open",
    body: "A staging URL from day two. You watch it come together and give notes as it happens, so nothing lands as a surprise at the end.",
  },
  {
    number: "04",
    title: "Ship and hand over",
    body: "Deployed, documented, and yours. Two weeks of fixes included. Editable by you or your developer without calling me.",
  },
];

export default function Process() {
  return (
    <section
      id="process"
      className="surface-paper px-[var(--gutter)] py-[var(--stack-lg)]"
      aria-labelledby="process-heading"
    >
      <Eyebrow className="text-void/60">HOW IT RUNS</Eyebrow>
      <h2 id="process-heading" className="display mt-[clamp(1rem,2vh,1.75rem)] text-h2 text-void">
        Four steps, no surprises.
      </h2>

      <ol className="mt-[var(--stack-md)]">
        {STEPS.map((step) => (
          <li
            key={step.number}
            data-reveal="process-row"
            className="rule grid grid-cols-1 gap-x-8 gap-y-3 py-[clamp(1.5rem,3vh,2.5rem)] md:grid-cols-12"
          >
            <span className="mono text-signal md:col-span-2">{step.number}</span>
            <h3 className="display text-h3 text-void md:col-span-4">{step.title}</h3>
            <p className="prose text-body text-void/75 md:col-span-6">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
