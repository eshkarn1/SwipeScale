import type { Metadata } from "next";
import Footer from "@/components/sections/Footer";
import Eyebrow from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "Terms — Swipe & Scale",
  description:
    "The terms this site is published under, and the terms design work with Swipe & Scale runs on.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <a
        href="#main"
        className="btn btn-solid sr-only focus:not-sr-only focus:absolute focus:left-[var(--gutter)] focus:top-[var(--gutter)] focus:z-50"
      >
        Skip to content
      </a>

      <main id="main" className="px-[var(--gutter)] py-[var(--stack-lg)]">
        <Eyebrow className="text-bone/70">LEGAL</Eyebrow>
        <h1 className="display mt-[clamp(1rem,2vh,1.75rem)] text-h1 text-bone">Terms</h1>
        <p className="mono mt-[clamp(1rem,2vh,1.5rem)] text-bone/70">
          LAST UPDATED 1 JANUARY 2026
        </p>

        <div className="prose mt-[var(--stack-md)] flex flex-col gap-[clamp(1.5rem,3vh,2.25rem)] text-body text-bone/80">
          <p>
            Two things live on this page: the terms for using this website, and a summary of
            how paid work runs. The summary is not the contract — every project gets a short
            written agreement before it starts, and that document wins if the two ever
            disagree.
          </p>

          <section>
            <h2 className="display text-h3 text-bone">Using this site</h2>
            <p className="mt-3">
              Read it, share it, quote it. The text, layout, motion, and code on this site
              belong to Swipe &amp; Scale; please do not republish them as your own. The site
              is provided as it is, with no warranty that it will be available without
              interruption.
            </p>
          </section>

          <section>
            <h2 className="display text-h3 text-bone">The case studies</h2>
            <p className="mt-3">
              Halden, Meridian Type, and Fold are unsolicited concepts. They are invented
              brands, built to show what the studio can do. No client commissioned them, no
              money changed hands, and no result is claimed for any of them.
            </p>
          </section>

          <section>
            <h2 className="display text-h3 text-bone">Prices and quotes</h2>
            <p className="mt-3">
              The prices on the home page are the real prices for the scope described beside
              them. They are quoted in US dollars and exclude any sales tax or VAT that
              applies where you are. A quote holds for thirty days from the date I send it.
            </p>
          </section>

          <section>
            <h2 className="display text-h3 text-bone">How projects run</h2>
            <p className="mt-3">
              Fifty percent is invoiced to book the dates and is what reserves them; the
              balance is invoiced on handover. Revision rounds are the number listed against
              each package. Work beyond the agreed scope is quoted separately before it
              starts, never afterwards. If a project stalls on your side for more than sixty
              days, the booking fee is not refunded and the remaining dates are released.
            </p>
          </section>

          <section>
            <h2 className="display text-h3 text-bone">Ownership of the work</h2>
            <p className="mt-3">
              On final payment, the designs, the code, and the repository are yours outright.
              Third-party fonts and licensed assets stay under their own licences, which are
              bought in your name. I keep the right to show the finished work in this
              portfolio unless you ask me in writing not to.
            </p>
          </section>

          <section>
            <h2 className="display text-h3 text-bone">Support and liability</h2>
            <p className="mt-3">
              Every package includes fixes for defects after handover — two weeks on Signature
              Page, thirty days on Full Site. That covers things that are broken, not things
              that are new. Liability for any project is limited to the fees paid for it.
            </p>
          </section>

          <p>
            Questions about any of this go to{" "}
            <a href="mailto:hello@swipeandscale.studio" className="text-bone underline">
              hello@swipeandscale.studio
            </a>
            .
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
