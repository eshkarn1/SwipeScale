"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createWorkspaceAndRedirectAction } from "@/server/actions/workspace";

const VERTICAL_OPTIONS = [
  { value: "real_estate", label: "Real estate" },
  { value: "general_b2b", label: "General B2B sales" },
] as const;

export function OnboardingForm() {
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState<string>("real_estate");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createWorkspaceAndRedirectAction({ name, vertical });
      // A successful call redirects and never resolves here — only the
      // failure branch reaches this line.
      if (result && !result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field
        label="Workspace name"
        description="Your team, brokerage, or company."
        error={error ?? undefined}
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="name"
            placeholder="Vertex Realty Group"
            value={name}
            onChange={(event) => setName(event.target.value)}
            invalid={Boolean(error)}
            required
            autoFocus
          />
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-fg text-sm font-medium">What kind of team is this?</span>
        <div className="flex flex-col gap-2">
          {VERTICAL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="border-border-strong has-checked:border-accent flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="vertical"
                value={option.value}
                checked={vertical === option.value}
                onChange={() => setVertical(option.value)}
                className="accent-accent size-4"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" loading={isPending} className="mt-2 w-full">
        Create workspace
      </Button>
    </form>
  );
}
