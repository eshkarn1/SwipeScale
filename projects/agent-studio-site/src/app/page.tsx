import { HeroScene } from '@/components/sections/HeroScene';
import { Offerings } from '@/components/sections/Offerings';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { ClosingCTA } from '@/components/sections/ClosingCTA';
import { ScrollChoreography } from '@/components/providers/ScrollChoreography';

/**
 * Home.
 *
 * Beats present: arrival, offerings, process, close. Still to come once their
 * blocking content exists — proof strip and evidence need real logos, metrics,
 * and testimonials, and the team-graph beat needs one genuine multi-agent
 * workflow to model. Those are the open questions raised in Deliverable 1;
 * shipping invented numbers or fabricated quotes on a page whose whole job is
 * establishing credibility would be worse than shipping without them.
 *
 * Everything here is server-rendered. ScrollChoreography and the canvas are
 * the only client boundaries.
 */
export default function HomePage() {
  return (
    <>
      <ScrollChoreography />
      <HeroScene />
      <Offerings />
      <HowItWorks />
      <ClosingCTA />
    </>
  );
}
