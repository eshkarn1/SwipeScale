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
