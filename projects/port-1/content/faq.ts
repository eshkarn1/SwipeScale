export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: readonly FaqItem[] = [
  {
    question: "Why is there a price on this page?",
    answer:
      "Because it saves us both a week. If the number works, we talk. If it doesn't, you haven't lost an afternoon to a discovery call.",
  },
  {
    question: "What if I only have a logo?",
    answer:
      "That's a normal starting point. Art direction is included in both packages — I build the type, colour, and motion language from whatever you've got.",
  },
  {
    question: "Do you write the copy?",
    answer:
      "I refine what you have and rewrite anything that's fighting the design. If you're starting from a blank page, that's a separate scope and I'll say so upfront.",
  },
  {
    question: "Can my developer maintain it?",
    answer:
      "Yes. It's a standard Next.js codebase with no proprietary tooling. You get the repo.",
  },
  {
    question: "Will the animation slow my site down?",
    answer:
      "No. Every sequence is budgeted before it's built, and the site is tested on a throttled mid-range Android before it ships. Speed is part of the deliverable, not a trade-off against it.",
  },
  {
    question: "What happens if I need changes later?",
    answer:
      "Two weeks of fixes are included. After that, ongoing work runs monthly and you can stop any time.",
  },
];
