export interface PricingPackage {
  name: string;
  price: string;
  timeline: string;
  bullets: readonly string[];
  ctaLabel: string;
  /** card 2 carries the signal-blue border */
  emphasis: boolean;
}

export const PRICING: readonly PricingPackage[] = [
  {
    name: "Signature Page",
    price: "$5,400",
    timeline: "2 weeks · one revision round",
    bullets: [
      "One long-form landing page, fully responsive",
      "One scroll-driven motion sequence, custom built",
      "Art direction, type system, and colour",
      "Copy refinement on your existing text",
      "Deployed and handed over, source included",
    ],
    ctaLabel: "Start a Signature Page",
    emphasis: false,
  },
  {
    name: "Full Site",
    price: "$18,000",
    timeline: "4–6 weeks · two revision rounds",
    bullets: [
      "Up to eight pages, fully responsive",
      "Three motion sequences and a full interaction system",
      "Complete brand-to-web design system",
      "CMS setup so your team can edit without me",
      "Deployed, documented, thirty days of support",
    ],
    ctaLabel: "Start a Full Site",
    emphasis: true,
  },
];

/** Budget options in the contact form — the two package prices plus an out. */
export const BUDGET_OPTIONS: readonly string[] = ["$5,400", "$18,000", "Not sure yet"];
