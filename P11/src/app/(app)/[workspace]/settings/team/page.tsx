import type { Metadata } from "next";

import { canInvite } from "@/server/permissions";
import { listMembers, listPendingInvites } from "@/server/services/workspace";
import { requireWorkspace } from "@/server/tenancy";

import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Team" };

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, membership } = await requireWorkspace(slug);

  const [members, pendingInvites] = await Promise.all([
    listMembers(workspace.id),
    canInvite(membership.role)
      ? listPendingInvites(workspace.id)
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Team</h1>

      {canInvite(membership.role) ? (
        <section className="mb-10">
          <InviteForm workspaceSlug={slug} />
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="text-fg-muted mb-3 text-xs font-medium tracking-wide uppercase">
          Members
        </h2>
        <ul className="divide-border border-border divide-y rounded-lg border">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{member.user.name ?? member.user.email}</span>
              <span className="text-fg-muted text-xs tracking-wide uppercase">
                {member.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {pendingInvites.length > 0 ? (
        <section>
          <h2 className="text-fg-muted mb-3 text-xs font-medium tracking-wide uppercase">
            Pending invites
          </h2>
          <ul className="divide-border border-border divide-y rounded-lg border">
            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>{invite.email}</span>
                <span className="text-fg-muted text-xs tracking-wide uppercase">
                  {invite.role}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
