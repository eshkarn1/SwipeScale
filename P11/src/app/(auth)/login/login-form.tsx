"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import {
  requestMagicLink,
  signInWithGoogleAction,
} from "@/server/actions/auth";

export function LoginForm({
  redirectTo,
  defaultEmail,
}: {
  redirectTo?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestMagicLink({ email, redirectTo });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/verify?email=${encodeURIComponent(result.data.email)}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Email" error={error ?? undefined}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              invalid={Boolean(error)}
              required
            />
          )}
        </Field>
        <Button type="submit" loading={isPending} className="w-full">
          Send magic link
        </Button>
      </form>

      <div className="flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-fg-muted text-xs">or</span>
        <div className="bg-border h-px flex-1" />
      </div>

      <form
        action={() => {
          startGoogleTransition(async () => {
            await signInWithGoogleAction(redirectTo);
          });
        }}
      >
        <Button
          type="submit"
          variant="secondary"
          loading={isGooglePending}
          className="w-full"
        >
          Continue with Google
        </Button>
      </form>
    </div>
  );
}
