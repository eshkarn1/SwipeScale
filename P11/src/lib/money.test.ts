import { describe, expect, it } from "vitest";

import {
  MoneyError,
  decimalToMinorUnits,
  formatCurrency,
  minorUnitsToDecimalString,
  sumMinorUnits,
} from "@/lib/money";

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

describe("minorUnitsToDecimalString", () => {
  it("converts cents to a Decimal(14,2)-ready string", () => {
    expect(minorUnitsToDecimalString(125000)).toBe("1250.00");
  });

  it("does not lose the trailing cent that a float division would", () => {
    // 100019 / 100 as a JS float is 1000.1899999999999.
    expect(minorUnitsToDecimalString(100019)).toBe("1000.19");
  });

  it("handles zero and small amounts", () => {
    expect(minorUnitsToDecimalString(0)).toBe("0.00");
    expect(minorUnitsToDecimalString(5)).toBe("0.05");
  });

  it("handles negative amounts", () => {
    expect(minorUnitsToDecimalString(-125000)).toBe("-1250.00");
  });

  it("rejects a non-integer", () => {
    expect(() => minorUnitsToDecimalString(12.5)).toThrow(MoneyError);
  });
});

describe("decimalToMinorUnits", () => {
  it("is the exact inverse of minorUnitsToDecimalString", () => {
    for (const cents of [0, 5, 100019, 125000, 999999999]) {
      expect(decimalToMinorUnits(minorUnitsToDecimalString(cents))).toBe(cents);
    }
  });

  it("parses a Prisma Decimal-like object via toString()", () => {
    const decimalLike = { toString: () => "1250.00" };
    expect(decimalToMinorUnits(decimalLike)).toBe(125000);
  });

  it("pads a whole-dollar string", () => {
    expect(decimalToMinorUnits("5")).toBe(500);
  });
});
