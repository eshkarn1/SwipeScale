import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { brand } from "@/config/brand";
import { listMyWorkspaces, requireUser } from "@/server/tenancy";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Create your workspace",
};

export default async function OnboardingPage() {
  await requireUser();

  // A signed-in user with an existing workspace has no business here — send
  // them to the resolver instead of letting them spin up a second one by
  // accident.
  const memberships = await listMyWorkspaces();
  if (memberships.length > 0) redirect("/go");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-fg-muted mb-2 text-sm font-medium tracking-wide uppercase">
          {brand.name}
        </p>
        <h1 className="mb-1 text-2xl font-semibold">Create your workspace</h1>
        <p className="text-fg-muted mb-6 text-sm">
          You can invite your team once it&apos;s set up.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}
