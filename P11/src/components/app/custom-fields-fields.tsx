"use client";

import { Field, Input, Label } from "@/components/ui/input";

import type { CustomFieldDef } from "@/generated/prisma/client";

/**
 * Renders the editable controls for one entity's `CustomFieldDef` rows
 * inside a create/edit form. A single generic component rather than one per
 * entity, because the whole point of `CustomFieldDef` (BUILD_SPEC §4) is
 * that a workspace's field vocabulary is data, not a component — this is
 * the one place that vocabulary becomes inputs, for company, contact, and
 * deal forms alike.
 *
 * `CURRENCY` is entered in dollars and converted to integer minor units by
 * the caller before it reaches an action, mirroring the amount field on the
 * entity itself (`src/lib/money.ts`) — the value living in `values` for a
 * CURRENCY key is always a dollar *string* while the field is being edited,
 * never the minor-unit integer.
 */
export function CustomFieldsFields({
  defs,
  values,
  onChange,
}: {
  defs: CustomFieldDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (defs.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {defs.map((def) => (
        <CustomFieldControl
          key={def.id}
          def={def}
          value={values[def.key]}
          onChange={(v) => onChange(def.key, v)}
        />
      ))}
    </div>
  );
}

function optionList(def: CustomFieldDef): string[] {
  return Array.isArray(def.options)
    ? def.options.filter((o): o is string => typeof o === "string")
    : [];
}

function CustomFieldControl({
  def,
  value,
  onChange,
}: {
  def: CustomFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (def.type) {
    case "TEXT":
      return (
        <Field label={def.label}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
    case "URL":
      return (
        <Field label={def.label}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="url"
              placeholder="https://"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
    case "NUMBER":
      return (
        <Field label={def.label}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
    case "CURRENCY":
      return (
        <Field label={def.label} description="Dollars">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="number"
              step="0.01"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
    case "DATE":
      return (
        <Field label={def.label}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="date"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </Field>
      );
    case "BOOLEAN":
      return (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-accent size-4"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          {def.label}
        </label>
      );
    case "SELECT": {
      const options = optionList(def);
      return (
        <div className="flex flex-col gap-1.5">
          <Label>{def.label}</Label>
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value || undefined)}
            className="border-border-strong bg-surface text-fg min-h-11 rounded-md border px-3 text-sm"
          >
            <option value="">—</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }
    case "MULTISELECT": {
      const options = optionList(def);
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-1.5">
          <Label>{def.label}</Label>
          <div className="flex flex-wrap gap-3">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  className="accent-accent size-4"
                  checked={selected.includes(opt)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, opt]
                        : selected.filter((s) => s !== opt),
                    )
                  }
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
