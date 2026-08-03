import type { SequenceId } from "@/lib/sequences";

export interface WorkMetaRow {
  label: string;
  value: string;
}

export interface WorkCaseEntry {
  /** "01" — mono, used in the eyebrow */
  index: string;
  eyebrow: string;
  brand: string;
  premise: string;
  sequenceId: SequenceId;
  meta: readonly WorkMetaRow[];
  /** true = metadata-left, image-right on desktop */
  reversed: boolean;
}

/**
 * These are invented brands, not clients. Every case carries
 * `STATUS  Unsolicited concept`. Nothing here claims paid work,
 * a result, a metric, or a testimonial.
 */
const META: readonly WorkMetaRow[] = [
  { label: "ROLE", value: "Motion, art direction, build" },
  { label: "STACK", value: "GSAP, canvas frame sequence" },
  { label: "STATUS", value: "Unsolicited concept" },
];

export const WORK: readonly WorkCaseEntry[] = [
  {
    index: "01",
    eyebrow: "CASE 01 / CONCEPT",
    brand: "Halden",
    premise:
      "A cold-water swim label whose catalogue photography was doing all of the work and none of the selling.",
    sequenceId: "case-01",
    meta: META,
    reversed: false,
  },
  {
    index: "02",
    eyebrow: "CASE 02 / CONCEPT",
    brand: "Meridian Type",
    premise: "A forty-year-old type foundry showing its specimens as a downloadable PDF.",
    sequenceId: "case-02",
    meta: META,
    reversed: true,
  },
  {
    index: "03",
    eyebrow: "CASE 03 / CONCEPT",
    brand: "Fold",
    premise:
      "An architecture practice whose built work is patient and considered, and whose website was neither.",
    sequenceId: "case-03",
    meta: META,
    reversed: false,
  },
];
