import { redirect } from "next/navigation";

import { listMyWorkspaces, requireUser } from "@/server/tenancy";

/**
 * The one post-login landing spot. Both the magic-link and Google flows
 * `redirectTo` here by default (see `src/server/actions/auth.ts`) so there
 * is a single place that decides "first workspace" vs "onboarding" — no
 * duplicated logic between providers.
 *
 * Renders nothing; it only ever redirects. "go" is in `RESERVED_SLUGS`
 * (`src/lib/reserved-slugs.ts`) so no workspace can ever collide with it.
 */
export default async function GoPage() {
  await requireUser();
  const memberships = await listMyWorkspaces();

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  redirect(`/${memberships[0]!.workspace.slug}`);
}
