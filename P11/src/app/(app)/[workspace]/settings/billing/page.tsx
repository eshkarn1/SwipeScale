import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Billing" };

/**
 * Billing itself is BUILD_SPEC M6 — this page exists in M1 only as the
 * landing spot `requireWorkspace()` redirects a SUSPENDED workspace to.
 *
 * Deliberately does NOT call `requireWorkspace()`: that function redirects
 * a suspended workspace to this exact path, so reusing it here would be an
 * infinite redirect loop. This does the same membership lookup without the
 * suspension check.
 */
export default async function BillingSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, workspace: { slug, deletedAt: null } },
    include: { workspace: true },
  });
  if (!membership) notFound();

  const { workspace } = membership;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Billing</h1>
      {workspace.status === "SUSPENDED" ? (
        <p className="text-danger text-sm">
          This workspace is suspended. Billing (BUILD_SPEC M6) isn&apos;t
          built yet — contact support to resolve this.
        </p>
      ) : (
        <p className="text-fg-muted text-sm">
          Plan: {workspace.plan}. Billing management ships in M6.
        </p>
      )}
    </div>
  );
}
