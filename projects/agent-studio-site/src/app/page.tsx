import { HeroScene } from '@/components/sections/HeroScene';
import { ProblemSection } from '@/components/sections/ProblemSection';
import { Offerings } from '@/components/sections/Offerings';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ObjectionsSection } from '@/components/sections/ObjectionsSection';
import { ClosingCTA } from '@/components/sections/ClosingCTA';
import { ScrollChoreography } from '@/components/providers/ScrollChoreography';

/**
 * Home.
 *
 * Ordered as a narrative rather than a feature list: hook, problem, solution,
 * mechanism, objections, close. The problem beat is load-bearing — without it
 * the page asks a visitor to care what we sell before showing we understand
 * what is wrong, and for an ops lead that is the section which decides whether
 * the rest is worth reading.
 *
 * ObjectionsSection occupies the slot a testimonial wall normally would. Real
 * logos, quotes, and metrics do not exist yet and inventing them on a page
 * whose job is establishing credibility would be self-defeating; straight
 * answers to the four things a cautious buyer actually worries about do the
 * same work honestly.
 *
 * Still outstanding: the team-graph beat, which needs one genuine multi-agent
 * workflow with real hand-offs to model.
 *
 * Everything here is server-rendered. ScrollChoreography and the canvas are
 * the only client boundaries.
 */
export default function HomePage() {
  return (
    <>
      <ScrollChoreography />
      <HeroScene />
      <ProblemSection />
      <Offerings />
      <HowItWorks />
      <ObjectionsSection />
      <ClosingCTA />
    </>
  );
}
