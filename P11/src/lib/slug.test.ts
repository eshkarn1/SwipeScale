import { describe, expect, it } from "vitest";

import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Vertex Realty Group")).toBe("vertex-realty-group");
  });

  it("strips accents", () => {
    expect(slugify("Café René")).toBe("cafe-rene");
  });

  it("strips punctuation", () => {
    expect(slugify("Smith & Co., LLC.")).toBe("smith-co-llc");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugify("  --Foo   Bar--  ")).toBe("foo-bar");
  });

  it("falls back to a default for an all-punctuation input", () => {
    expect(slugify("!!!")).toBe("workspace");
  });

  it("falls back to a default for an empty string", () => {
    expect(slugify("")).toBe("workspace");
  });
});
