"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/server/actions/invite";

export function AcceptInviteForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <Button
        loading={isPending}
        className="w-full"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await acceptInviteAction({ token });
            // A successful call redirects and never resolves here.
            if (result && !result.ok) {
              setError(result.error);
            }
          });
        }}
      >
        Accept invite
      </Button>
      {error ? (
        <p role="alert" className="text-danger text-center text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
