import type { Metadata } from "next";
import { MailCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Check your email",
};

/**
 * Shown right after a magic-link request. Auth.js also has a built-in
 * `verifyRequest` page (configured in `src/server/auth.ts`) that points
 * here for parity, but the primary route into this page is the client
 * redirect in `login-form.tsx` after `requestMagicLink` succeeds.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <MailCheck className="text-accent mb-4 size-10" aria-hidden="true" />
        <h1 className="mb-2 text-xl font-semibold">Check your email</h1>
        <p className="text-fg-muted text-sm">
          We sent a sign-in link to{" "}
          {email ? <span className="text-fg font-medium">{email}</span> : "you"}
          . Click it to finish signing in — it expires in 24 hours.
        </p>
      </div>
    </main>
  );
}
