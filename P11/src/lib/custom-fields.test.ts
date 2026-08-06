import { describe, expect, it } from "vitest";

import {
  CustomFieldError,
  parseCustomFieldValues,
  type CustomFieldDefLike,
} from "@/lib/custom-fields";

const defs: CustomFieldDefLike[] = [
  {
    key: "referral_source",
    label: "Referral source",
    type: "TEXT",
    options: null,
  },
  {
    key: "square_footage",
    label: "Square footage",
    type: "NUMBER",
    options: null,
  },
  {
    key: "commission_cents",
    label: "Commission",
    type: "CURRENCY",
    options: null,
  },
  { key: "closing_date", label: "Closing date", type: "DATE", options: null },
  { key: "is_investor", label: "Is investor", type: "BOOLEAN", options: null },
  { key: "listing_url", label: "Listing URL", type: "URL", options: null },
  {
    key: "property_type",
    label: "Property type",
    type: "SELECT",
    options: ["Condo", "House"],
  },
  {
    key: "amenities",
    label: "Amenities",
    type: "MULTISELECT",
    options: ["Pool", "Garage"],
  },
];

describe("parseCustomFieldValues", () => {
  it("returns an empty object for null/undefined input", () => {
    expect(parseCustomFieldValues(defs, undefined)).toEqual({});
    expect(parseCustomFieldValues(defs, null)).toEqual({});
  });

  it("passes through a valid value per type (happy path)", () => {
    const result = parseCustomFieldValues(defs, {
      referral_source: "Zillow",
      square_footage: 1800,
      commission_cents: 250000,
      closing_date: "2026-09-01",
      is_investor: true,
      listing_url: "https://example.com/listing/1",
      property_type: "Condo",
      amenities: ["Pool", "Garage"],
    });
    expect(result).toEqual({
      referral_source: "Zillow",
      square_footage: 1800,
      commission_cents: 250000,
      closing_date: "2026-09-01",
      is_investor: true,
      listing_url: "https://example.com/listing/1",
      property_type: "Condo",
      amenities: ["Pool", "Garage"],
    });
  });

  it("omits keys that are null or undefined rather than writing them", () => {
    expect(parseCustomFieldValues(defs, { referral_source: null })).toEqual({});
  });

  it("rejects a key that has no CustomFieldDef (validation failure)", () => {
    expect(() =>
      parseCustomFieldValues(defs, { not_a_real_field: "x" }),
    ).toThrow(CustomFieldError);
  });

  it("rejects a CURRENCY value that isn't an integer (validation failure)", () => {
    expect(() =>
      parseCustomFieldValues(defs, { commission_cents: 12.5 }),
    ).toThrow(CustomFieldError);
  });

  it("rejects a NUMBER value that is a string (validation failure)", () => {
    expect(() =>
      parseCustomFieldValues(defs, { square_footage: "1800" }),
    ).toThrow(CustomFieldError);
  });

  it("rejects a SELECT value outside its configured options (validation failure)", () => {
    expect(() =>
      parseCustomFieldValues(defs, { property_type: "Yacht" }),
    ).toThrow(CustomFieldError);
  });

  it("rejects a MULTISELECT value containing an option outside the configured list", () => {
    expect(() =>
      parseCustomFieldValues(defs, { amenities: ["Pool", "Yacht"] }),
    ).toThrow(CustomFieldError);
  });

  it("rejects an invalid URL", () => {
    expect(() =>
      parseCustomFieldValues(defs, { listing_url: "not-a-url" }),
    ).toThrow(CustomFieldError);
  });

  it("rejects an invalid DATE", () => {
    expect(() =>
      parseCustomFieldValues(defs, { closing_date: "not-a-date" }),
    ).toThrow(CustomFieldError);
  });

  it("rejects a non-boolean BOOLEAN", () => {
    expect(() => parseCustomFieldValues(defs, { is_investor: "yes" })).toThrow(
      CustomFieldError,
    );
  });
});
