"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  createCustomFieldDefAction,
  deleteCustomFieldDefAction,
} from "@/server/actions/custom-field";
import type { CustomFieldEntity } from "@/server/services/custom-field-def";

import type { CustomFieldDef, FieldType } from "@/generated/prisma/client";

const ENTITY_LABELS: Record<CustomFieldEntity, string> = {
  company: "Companies",
  contact: "Contacts",
  deal: "Deals",
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "CURRENCY", label: "Currency" },
  { value: "DATE", label: "Date" },
  { value: "BOOLEAN", label: "Yes / No" },
  { value: "URL", label: "URL" },
  { value: "SELECT", label: "Select (one)" },
  { value: "MULTISELECT", label: "Select (multiple)" },
];

export function FieldsSettingsClient({
  workspaceSlug,
  defsByEntity,
}: {
  workspaceSlug: string;
  defsByEntity: Record<string, CustomFieldDef[]>;
}) {
  const router = useRouter();
  const [addingEntity, setAddingEntity] = useState<CustomFieldEntity | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  function handleDelete(def: CustomFieldDef) {
    startTransition(async () => {
      const result = await deleteCustomFieldDefAction(workspaceSlug, def.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed "${def.label}".`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {(Object.keys(ENTITY_LABELS) as CustomFieldEntity[]).map((entity) => (
        <section key={entity}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-fg-muted text-xs font-medium tracking-wide uppercase">
              {ENTITY_LABELS[entity]}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingEntity(entity)}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add field
            </Button>
          </div>
          {(defsByEntity[entity]?.length ?? 0) === 0 ? (
            <p className="text-fg-muted text-sm">No custom fields yet.</p>
          ) : (
            <ul className="divide-border border-border divide-y rounded-lg border">
              {defsByEntity[entity]!.map((def) => (
                <li
                  key={def.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span>{def.label}</span>
                    <Badge variant="outline">{def.type}</Badge>
                    <span className="text-fg-muted font-mono text-xs">
                      {def.key}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${def.label}`}
                    onClick={() => handleDelete(def)}
                    disabled={isPending}
                    className="text-fg-muted hover:text-danger cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <AddFieldDialog
        workspaceSlug={workspaceSlug}
        entity={addingEntity}
        onOpenChange={(open) => !open && setAddingEntity(null)}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function AddFieldDialog({
  workspaceSlug,
  entity,
  onOpenChange,
  onCreated,
}: {
  workspaceSlug: string;
  entity: CustomFieldEntity | null;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [type, setType] = useState<FieldType>("TEXT");
  const [options, setOptions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setLabel("");
    setKey("");
    setType("TEXT");
    setOptions("");
    setError(null);
  }

  function handleLabelChange(value: string) {
    setLabel(value);
    if (!key || key === slugifyKey(label)) {
      setKey(slugifyKey(value));
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entity) return;
    setError(null);

    const optionList =
      type === "SELECT" || type === "MULTISELECT"
        ? options
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    startTransition(async () => {
      const result = await createCustomFieldDefAction(workspaceSlug, {
        entity,
        key,
        label,
        type,
        options: optionList,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Added "${label}".`);
      reset();
      onOpenChange(false);
      onCreated();
    });
  }

  return (
    <Dialog open={entity !== null} onOpenChange={onOpenChange}>
      {entity ? (
        <DialogContent>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>
                Add {ENTITY_LABELS[entity].toLowerCase()} field
              </DialogTitle>
            </DialogHeader>

            <Field label="Label" error={error ?? undefined}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  invalid={Boolean(error)}
                  required
                  autoFocus
                />
              )}
            </Field>

            <Field
              label="Key"
              description="Used internally, cannot be changed later."
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={key}
                  onChange={(e) => setKey(slugifyKey(e.target.value))}
                  required
                />
              )}
            </Field>

            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as FieldType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "SELECT" || type === "MULTISELECT" ? (
              <Field label="Options" description="Comma-separated.">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={options}
                    onChange={(e) => setOptions(e.target.value)}
                    required
                  />
                )}
              </Field>
            ) : null}

            <DialogFooter>
              <Button type="submit" loading={isPending}>
                Add field
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function slugifyKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}
