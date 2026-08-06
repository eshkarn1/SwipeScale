import { describe, expect, it } from "vitest";

import { MoneyError, formatCurrency, sumMinorUnits } from "@/lib/money";

describe("formatCurrency", () => {
  it("formats integer minor units as USD", () => {
    expect(formatCurrency(125000)).toBe("$1,250.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("rejects a float, because money is never a float (BUILD_SPEC §8)", () => {
    expect(() => formatCurrency(12.5)).toThrow(MoneyError);
  });
});

describe("sumMinorUnits", () => {
  it("sums without float drift", () => {
    // 0.1 + 0.2 in floats is 0.30000000000000004. In minor units it is 30.
    expect(sumMinorUnits([10, 20])).toBe(30);
  });

  it("sums an empty list to zero", () => {
    expect(sumMinorUnits([])).toBe(0);
  });
});
