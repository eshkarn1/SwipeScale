"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { createInviteAction } from "@/server/actions/invite";

const ROLE_OPTIONS = ["ADMIN", "MEMBER", "VIEWER"] as const;

export function InviteForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createInviteAction(workspaceSlug, { email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Invite sent to ${result.data.email}.`);
      setEmail("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <Field label="Invite by email" error={error ?? undefined} className="min-w-56 flex-1">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            invalid={Boolean(error)}
            required
          />
        )}
      </Field>

      <label className="flex flex-col gap-1.5">
        <span className="text-fg text-sm font-medium">Role</span>
        <select
          value={role}
          onChange={(event) =>
            setRole(event.target.value as (typeof ROLE_OPTIONS)[number])
          }
          className="border-border-strong bg-surface text-fg min-h-11 rounded-md border px-3 text-sm"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <Button type="submit" loading={isPending}>
        Send invite
      </Button>

      {success ? (
        <p role="status" className="text-fg-muted w-full text-xs">
          {success}
        </p>
      ) : null}
    </form>
  );
}
