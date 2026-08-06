import { formatCurrency } from "@/lib/money";

import type { CustomFieldDef } from "@/generated/prisma/client";

/** Read-only rendering of an entity's custom field values on a detail page —
 * the display half of `custom-fields-fields.tsx`. Renders nothing for a
 * workspace with no field defs for this entity, and skips any def with no
 * stored value rather than showing an empty row. */
export function CustomFieldsView({
  defs,
  values,
}: {
  defs: CustomFieldDef[];
  values: unknown;
}) {
  const record =
    typeof values === "object" && values !== null
      ? (values as Record<string, unknown>)
      : {};
  const populated = defs.filter(
    (def) =>
      record[def.key] !== undefined &&
      record[def.key] !== null &&
      record[def.key] !== "",
  );
  if (populated.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {populated.map((def) => (
        <div key={def.id}>
          <dt className="text-fg-muted text-xs tracking-wide uppercase">
            {def.label}
          </dt>
          <dd className="text-fg mt-0.5 text-sm">
            {formatValue(def, record[def.key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatValue(def: CustomFieldDef, value: unknown): string {
  switch (def.type) {
    case "CURRENCY":
      return typeof value === "number" ? formatCurrency(value) : String(value);
    case "BOOLEAN":
      return value ? "Yes" : "No";
    case "MULTISELECT":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "URL":
      return String(value);
    default:
      return String(value);
  }
}
