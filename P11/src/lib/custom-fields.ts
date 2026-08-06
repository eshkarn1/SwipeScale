/**
 * `CustomFieldDef` value validation — the one place a workspace's own field
 * vocabulary (BUILD_SPEC §4 `CustomFieldDef`) is checked against the JSON
 * blob stored on `Company.customFields` / `Contact.customFields` /
 * `Deal.customFields`.
 *
 * Deliberately framework/DB-free (no `db` import) so it can be unit tested
 * without a database and reused by every entity service instead of each one
 * re-deriving its own type coercion.
 */
import type { FieldType } from "@/generated/prisma/enums";

export class CustomFieldError extends Error {
  override name = "CustomFieldError";
}

/** The subset of `CustomFieldDef` this module needs — keeps it decoupled
 * from the generated Prisma type so a caller can pass a plain object in
 * tests. */
export interface CustomFieldDefLike {
  key: string;
  label: string;
  type: FieldType;
  /** For SELECT/MULTISELECT: the allowed values. Anything else in Json is
   * ignored — a def with no options is treated as "no choices configured". */
  options: unknown;
}

function optionValues(def: CustomFieldDefLike): string[] {
  if (!Array.isArray(def.options)) return [];
  return def.options.filter(
    (value): value is string => typeof value === "string",
  );
}

function validateOne(
  def: CustomFieldDefLike,
  value: unknown,
): string | number | boolean | string[] {
  switch (def.type) {
    case "TEXT": {
      if (typeof value !== "string") {
        throw new CustomFieldError(`"${def.label}" must be text.`);
      }
      return value;
    }
    case "URL": {
      if (typeof value !== "string") {
        throw new CustomFieldError(`"${def.label}" must be a URL.`);
      }
      if (value !== "") {
        try {
          new URL(value);
        } catch {
          throw new CustomFieldError(`"${def.label}" must be a valid URL.`);
        }
      }
      return value;
    }
    case "NUMBER": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new CustomFieldError(`"${def.label}" must be a number.`);
      }
      return value;
    }
    case "CURRENCY": {
      // Same convention as every other money value in this codebase
      // (BUILD_SPEC §8 / src/lib/money.ts): integer minor units, never a float.
      if (!Number.isInteger(value)) {
        throw new CustomFieldError(
          `"${def.label}" must be a whole number of cents.`,
        );
      }
      return value as number;
    }
    case "DATE": {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        throw new CustomFieldError(`"${def.label}" must be a valid date.`);
      }
      return value;
    }
    case "BOOLEAN": {
      if (typeof value !== "boolean") {
        throw new CustomFieldError(`"${def.label}" must be true or false.`);
      }
      return value;
    }
    case "SELECT": {
      const allowed = optionValues(def);
      if (typeof value !== "string" || !allowed.includes(value)) {
        throw new CustomFieldError(
          `"${def.label}" must be one of the configured options.`,
        );
      }
      return value;
    }
    case "MULTISELECT": {
      const allowed = optionValues(def);
      if (
        !Array.isArray(value) ||
        !value.every(
          (item) => typeof item === "string" && allowed.includes(item),
        )
      ) {
        throw new CustomFieldError(
          `"${def.label}" must be a list of the configured options.`,
        );
      }
      return value;
    }
    default: {
      // Exhaustiveness guard — a new FieldType member must be handled above.
      const exhaustive: never = def.type;
      throw new CustomFieldError(
        `Unsupported field type: ${String(exhaustive)}`,
      );
    }
  }
}

/**
 * Validates a client-supplied `customFields` object against this
 * workspace+entity's `CustomFieldDef` rows.
 *
 * - Rejects any key that isn't a defined field (never let a client write an
 *   arbitrary key into the JSON blob).
 * - Every defined field is optional: an absent key is simply omitted from
 *   the result, never defaulted or required.
 * - Returns a plain JSON-safe object, ready for Prisma's `Json` column.
 */
export function parseCustomFieldValues(
  defs: readonly CustomFieldDefLike[],
  raw: Record<string, unknown> | null | undefined,
): Record<string, string | number | boolean | string[]> {
  if (!raw) return {};

  const byKey = new Map(defs.map((def) => [def.key, def]));
  const result: Record<string, string | number | boolean | string[]> = {};

  for (const [key, value] of Object.entries(raw)) {
    const def = byKey.get(key);
    if (!def) {
      throw new CustomFieldError(
        `"${key}" is not a custom field on this workspace.`,
      );
    }
    if (value === null || value === undefined) continue;
    result[key] = validateOne(def, value);
  }

  return result;
}
