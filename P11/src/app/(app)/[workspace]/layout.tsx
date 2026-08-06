import { PrimaryNav } from "@/components/app/primary-nav";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { listMyWorkspaces, requireWorkspace } from "@/server/tenancy";

/**
 * Every page under `(app)/[workspace]/*` is reached through this layout,
 * which means every one of them is already behind `requireWorkspace()` —
 * see BUILD_SPEC §5. Pages further down only need to call it again if they
 * require a higher `minRole` than the default `VIEWER`.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace, membership } = await requireWorkspace(slug);
  const memberships = await listMyWorkspaces();

  return (
    <div className="bg-bg min-h-dvh">
      <header className="border-border bg-surface flex min-h-14 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          <WorkspaceSwitcher
            current={{
              id: workspace.id,
              name: workspace.name,
              slug: workspace.slug,
            }}
            workspaces={memberships.map((m) => ({
              id: m.workspace.id,
              name: m.workspace.name,
              slug: m.workspace.slug,
            }))}
          />
          <PrimaryNav workspaceSlug={slug} />
        </div>
        <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
          {membership.role}
        </span>
      </header>
      <main>{children}</main>
    </div>
  );
}
