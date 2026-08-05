import Eyebrow from "@/components/ui/Eyebrow";
import { FAQ } from "@/content/faq";

/** Native <details>/<summary>. No JS accordion. */
export default function Faq() {
  return (
    <section
      id="faq"
      className="surface-graphite px-[var(--gutter)] py-[var(--stack-lg)]"
      aria-labelledby="faq-heading"
    >
      <Eyebrow className="text-bone/70">QUESTIONS</Eyebrow>
      <h2 id="faq-heading" className="display mt-[clamp(1rem,2vh,1.75rem)] text-h2 text-bone">
        The things people ask first.
      </h2>

      <div className="mt-[var(--stack-md)]">
        {FAQ.map((item) => (
          <details key={item.question} className="faq-item rule group">
            <summary className="flex min-h-[44px] items-center justify-between gap-6 py-[clamp(1rem,2vh,1.5rem)]">
              <span className="display text-h3 text-bone">{item.question}</span>
              <span
                aria-hidden="true"
                className="faq-marker mono shrink-0 text-bone/70 text-base"
              />
            </summary>
            <p className="prose pb-[clamp(1rem,2vh,1.5rem)] text-body text-bone/80">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
