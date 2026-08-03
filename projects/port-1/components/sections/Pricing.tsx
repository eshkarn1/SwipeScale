import Button from "@/components/ui/Button";
import Eyebrow from "@/components/ui/Eyebrow";
import { PRICING } from "@/content/pricing";

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="bg-void px-[var(--gutter)] py-[var(--stack-lg)]"
      aria-labelledby="pricing-heading"
    >
      <Eyebrow className="text-bone/70">PACKAGES</Eyebrow>
      <h2 id="pricing-heading" className="display mt-[clamp(1rem,2vh,1.75rem)] text-h2 text-bone">
        Two ways to work together.
      </h2>

      <div className="mt-[var(--stack-md)] grid grid-cols-1 gap-[clamp(1rem,2vw,2rem)] lg:grid-cols-2">
        {PRICING.map((pkg) => (
          <div
            key={pkg.name}
            className={`flex flex-col p-[clamp(1.5rem,3vw,2.5rem)] ${
              pkg.emphasis ? "border border-signal" : "border border-slate"
            }`}
          >
            <h3 className="display text-h3 text-bone">{pkg.name}</h3>

            <p className="mono mt-[clamp(1rem,2vh,1.5rem)] text-h2 leading-none text-bone">
              {pkg.price}
            </p>

            <p className="mono mt-[clamp(0.75rem,1.5vh,1.25rem)] text-bone/70">{pkg.timeline}</p>

            <ul className="mt-[clamp(1.5rem,3vh,2.5rem)] flex flex-1 flex-col gap-3">
              {pkg.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3 text-body text-bone/80">
                  <span aria-hidden="true" className="mono mt-[0.35em] shrink-0 text-bone/70">
                    +
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="mt-[clamp(1.5rem,3vh,2.5rem)]">
              <Button href="#contact" variant={pkg.emphasis ? "solid" : "outline"}>
                {pkg.ctaLabel}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="prose mt-[var(--stack-md)] text-body text-bone/80">
        Agencies: I take on the motion layer as a subcontractor on your builds. Same pricing, your
        name on the work.{" "}
        <a href="mailto:hello@swipeandscale.studio" className="text-bone underline">
          Email me.
        </a>
      </p>
    </section>
  );
}
