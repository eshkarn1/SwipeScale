import ScrollDirector from "@/components/motion/ScrollDirector";
import Contact from "@/components/sections/Contact";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Positioning from "@/components/sections/Positioning";
import Pricing from "@/components/sections/Pricing";
import Process from "@/components/sections/Process";
import Work from "@/components/sections/Work";
import Timecode from "@/components/ui/Timecode";

/**
 * The single page. Section order is spec §6.
 *
 * Everything here is a server component except <Timecode /> and the two client
 * islands it depends on, so the whole document is in the SSR HTML and reads
 * with JS disabled.
 */
export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="btn btn-solid sr-only focus:not-sr-only focus:absolute focus:left-[var(--gutter)] focus:top-[var(--gutter)] focus:z-50"
      >
        Skip to content
      </a>

      <main id="main">
        <Hero />
        <Positioning />
        <Work />
        <Process />
        <Pricing />
        <Faq />
        <Contact />
      </main>

      <Footer />

      {/* The one flourish: a live readout of whichever sequence is on screen. */}
      <Timecode />
      <ScrollDirector />
    </>
  );
}
