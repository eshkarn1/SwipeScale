import { CommandPalette } from "@/components/app/command-palette";
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
      {/* Wraps rather than overflowing: at 375px the nav alone is ~727px
          wide, which pushed the whole document to 930px and left every page
          horizontally scrollable. Measured, not guessed — see
          .claude/ENGINEERING-NOTES.md. */}
      <header className="border-border bg-surface flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
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
        <div className="flex shrink-0 items-center gap-3">
          {/* Mounted at the layout so ⌘K works on every authenticated page,
              not only the record lists. */}
          <CommandPalette workspaceSlug={slug} />
          <span className="text-fg-muted text-xs font-medium tracking-wide uppercase">
            {membership.role}
          </span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
