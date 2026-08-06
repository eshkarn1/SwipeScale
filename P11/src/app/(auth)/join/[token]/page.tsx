import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { brand } from "@/config/brand";
import { auth } from "@/server/auth";
import { getInvitePreview } from "@/server/services/invite";

import { AcceptInviteForm } from "./accept-invite-form";
import { LoginForm } from "../../login/login-form";

export const metadata: Metadata = {
  title: "You're invited",
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInvitePreview(token);

  // An unknown, expired, or already-used token all render the same "not
  // found" outcome — see `requireWorkspace()` for why a distinguishable
  // error is worse here than an undistinguishable one; the same logic
  // applies to a token an attacker is guessing at.
  if (!invite) notFound();

  const session = await auth();
  const alreadySignedInAsInvitee =
    session?.user?.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <p className="text-fg-muted mb-2 text-sm font-medium tracking-wide uppercase">
          {brand.name}
        </p>
        <h1 className="mb-2 text-2xl font-semibold">
          Join {invite.workspaceName}
        </h1>

        {invite.isExpired ? (
          <p className="text-fg-muted text-sm">
            This invite has expired. Ask whoever sent it to send a new one.
          </p>
        ) : invite.isAccepted ? (
          <p className="text-fg-muted text-sm">
            This invite has already been used.
          </p>
        ) : alreadySignedInAsInvitee ? (
          <>
            <p className="text-fg-muted mb-6 text-sm">
              You&apos;ve been invited as <strong>{invite.role}</strong>.
            </p>
            <AcceptInviteForm token={token} />
          </>
        ) : (
          <>
            <p className="text-fg-muted mb-6 text-sm">
              Sign in as <strong>{invite.email}</strong> to accept.
            </p>
            <div className="text-left">
              <LoginForm
                redirectTo={`/join/${token}`}
                defaultEmail={invite.email}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
