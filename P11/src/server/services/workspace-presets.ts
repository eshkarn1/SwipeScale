/**
 * The vertical preset registry. DECISIONS §8.6: "verticalise the
 * configuration, not the schema." `Workspace.vertical` is the one seam;
 * everything that differs between a real-estate brokerage and a generic B2B
 * sales team — the pipeline stages, the deal-contact roles, whether "which
 * side do we represent" is even a concept — is data here, not a branch
 * anywhere else in the codebase. `createWorkspaceForUser` and `prisma/seed.ts`
 * both read this file and neither one names "real_estate" or "general_b2b"
 * itself; adding a third vertical is a new entry in `VERTICAL_PRESETS`, not a
 * migration or a new `if`.
 *
 * "real_estate" is v1's default because DECISIONS §2 makes it the
 * go-to-market wedge, not because the model assumes every workspace is a
 * brokerage — "general_b2b" exists specifically to prove that.
 */
import type { StageType } from "@/generated/prisma/enums";

export interface StagePreset {
  name: string;
  position: number;
  probability: number;
  type: StageType;
}

export interface OptionPreset {
  /** Stable key written onto records — see `WorkspaceOption.value`. */
  value: string;
  label: string;
  position: number;
}

export interface VerticalPreset {
  key: string;
  label: string;
  pipelineName: string;
  stages: StagePreset[];
  /** Seeds `WorkspaceOption` rows with `kind = "deal_contact_role"`. */
  dealContactRoles: OptionPreset[];
  /**
   * Seeds `WorkspaceOption` rows with `kind = "deal_side"`. Deliberately
   * empty for a vertical with no concept of "which party do we represent" —
   * `Deal.side` just stays null for that workspace, proving the field is
   * optional rather than a schema-level assumption.
   */
  dealSides: OptionPreset[];
}

export const VERTICAL_PRESETS = {
  real_estate: {
    key: "real_estate",
    label: "Real estate",
    pipelineName: "Transactions",
    stages: [
      { name: "Lead", position: 0, probability: 10, type: "OPEN" },
      { name: "Appointment", position: 1, probability: 25, type: "OPEN" },
      { name: "Agreement Signed", position: 2, probability: 50, type: "OPEN" },
      { name: "Under Contract", position: 3, probability: 75, type: "OPEN" },
      { name: "Closed", position: 4, probability: 100, type: "WON" },
    ],
    dealContactRoles: [
      { value: "SELLER", label: "Seller", position: 0 },
      { value: "BUYER", label: "Buyer", position: 1 },
      { value: "CO_BUYER", label: "Co-Buyer", position: 2 },
      { value: "LENDER", label: "Lender", position: 3 },
      { value: "ATTORNEY", label: "Attorney", position: 4 },
    ],
    dealSides: [
      { value: "LISTING", label: "Listing side", position: 0 },
      { value: "BUYER", label: "Buyer side", position: 1 },
    ],
  },
  general_b2b: {
    key: "general_b2b",
    label: "General B2B sales",
    pipelineName: "Sales pipeline",
    stages: [
      { name: "New Lead", position: 0, probability: 10, type: "OPEN" },
      { name: "Qualified", position: 1, probability: 25, type: "OPEN" },
      { name: "Proposal Sent", position: 2, probability: 50, type: "OPEN" },
      { name: "Negotiation", position: 3, probability: 75, type: "OPEN" },
      { name: "Closed Won", position: 4, probability: 100, type: "WON" },
    ],
    dealContactRoles: [
      { value: "CHAMPION", label: "Champion", position: 0 },
      { value: "DECISION_MAKER", label: "Decision Maker", position: 1 },
      { value: "ECONOMIC_BUYER", label: "Economic Buyer", position: 2 },
      { value: "PROCUREMENT", label: "Procurement", position: 3 },
      { value: "INFLUENCER", label: "Influencer", position: 4 },
    ],
    // No concept of "which side we represent" in a B2B vendor pipeline —
    // left empty on purpose. See VerticalPreset.dealSides above.
    dealSides: [],
  },
} satisfies Record<string, VerticalPreset>;

export type VerticalKey = keyof typeof VERTICAL_PRESETS;

export const DEFAULT_VERTICAL: VerticalKey = "real_estate";

export function isVerticalKey(value: string): value is VerticalKey {
  return Object.hasOwn(VERTICAL_PRESETS, value);
}

/** Falls back to the default preset for an unrecognised/legacy value rather
 * than throwing — a workspace should never be unrenderable because of a
 * stale `vertical` string. */
export function getVerticalPreset(vertical: string): VerticalPreset {
  return isVerticalKey(vertical)
    ? VERTICAL_PRESETS[vertical]
    : VERTICAL_PRESETS[DEFAULT_VERTICAL];
}
