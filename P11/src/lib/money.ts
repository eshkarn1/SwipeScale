/**
 * Money helpers.
 *
 * BUILD_SPEC §8: money is `Decimal` in the database and **integer minor units**
 * in JavaScript. Never a float. Every amount that crosses into JS is a whole
 * number of cents; `0.1 + 0.2 !== 0.3` is not an acceptable failure mode for a
 * deal value.
 *
 * DECISIONS §4: all v1 prices are USD, no local-currency switching.
 */

/** A whole number of minor units (cents for USD). Never fractional. */
export type MinorUnits = number;

export class MoneyError extends Error {
  override name = "MoneyError";
}

/**
 * Format an integer minor-unit amount for display.
 *
 * @param minorUnits e.g. `125000` for $1,250.00
 * @param currency ISO 4217 code
 * @param locale BCP 47 tag
 */
export function formatCurrency(
  minorUnits: MinorUnits,
  currency = "USD",
  locale = "en-US",
): string {
  if (!Number.isInteger(minorUnits)) {
    throw new MoneyError(
      `Money must be integer minor units, received ${minorUnits}. ` +
        `See BUILD_SPEC §8.`,
    );
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(minorUnits / 100);
}

/**
 * Sum minor-unit amounts. Integer-safe by construction.
 */
export function sumMinorUnits(amounts: readonly MinorUnits[]): MinorUnits {
  let total = 0;
  for (const amount of amounts) {
    if (!Number.isInteger(amount)) {
      throw new MoneyError(
        `Money must be integer minor units, received ${amount}.`,
      );
    }
    total += amount;
  }
  return total;
}

/**
 * The DB boundary. `Deal.amount` etc. are `Decimal(14,2)` — a decimal
 * *major*-unit amount, e.g. `"1250.00"` for $1,250.00 — while every amount
 * that reaches JS is integer minor units per BUILD_SPEC §8. These two
 * functions are the only place a value is allowed to cross between the two
 * representations, and both go through a string (never a division that
 * lands on a JS float) so a value like `100019` cents becomes exactly
 * `"1000.19"`, not `1000.1899999999999`.
 */
export function minorUnitsToDecimalString(minorUnits: MinorUnits): string {
  if (!Number.isInteger(minorUnits)) {
    throw new MoneyError(
      `Money must be integer minor units, received ${minorUnits}.`,
    );
  }
  const negative = minorUnits < 0;
  const digits = Math.abs(minorUnits).toString().padStart(3, "0");
  const majorPart = digits.slice(0, -2);
  const minorPart = digits.slice(-2);
  return `${negative ? "-" : ""}${majorPart}.${minorPart}`;
}

/**
 * Inverse of {@link minorUnitsToDecimalString}. Accepts what Prisma hands
 * back for a `Decimal` field: an object with `.toString()` (a `Decimal.js`
 * instance), or a plain string/number for callers that already stringified
 * it.
 */
export function decimalToMinorUnits(
  value: { toString(): string } | string | number,
): MinorUnits {
  const asString = typeof value === "number" ? value.toFixed(2) : value.toString();
  const [wholePart = "0", fractionalPart = ""] = asString.split(".");
  const paddedFraction = (fractionalPart + "00").slice(0, 2);
  const minorUnits = Number(`${wholePart}${paddedFraction}`);
  if (!Number.isInteger(minorUnits)) {
    throw new MoneyError(`Could not parse "${asString}" as money.`);
  }
  return minorUnits;
}
