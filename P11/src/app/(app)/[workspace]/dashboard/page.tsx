import type { Metadata } from "next";

import { db } from "@/server/db";
import { requireWorkspace } from "@/server/tenancy";
import { getVerticalPreset } from "@/server/services/workspace-presets";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Placeholder — the real dashboard (KPIs, forecast, funnel, at-risk deals)
 * is BUILD_SPEC M5. This exists so M1 has somewhere to land after sign-in,
 * and so tenancy scoping is visible in the running app, not just in tests:
 * every count below is filtered by `workspaceId: workspace.id`.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace: slug } = await params;
  const { workspace } = await requireWorkspace(slug);
  const preset = getVerticalPreset(workspace.vertical);

  const [companyCount, contactCount, dealCount, memberCount] = await Promise.all([
    db.company.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
    db.contact.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
    db.deal.count({ where: { workspaceId: workspace.id, deletedAt: null } }),
    db.membership.count({ where: { workspaceId: workspace.id } }),
  ]);

  const stats = [
    { label: "Companies", value: companyCount },
    { label: "Contacts", value: contactCount },
    { label: "Deals", value: dealCount },
    { label: "Members", value: memberCount },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">{workspace.name}</h1>
      <p className="text-fg-muted mb-8 text-sm">
        {preset.label} · default pipeline &ldquo;{preset.pipelineName}&rdquo;
      </p>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-border bg-surface rounded-lg border p-4"
          >
            <p className="text-fg-muted text-xs tracking-wide uppercase">
              {stat.label}
            </p>
            <p className="mt-1 font-mono text-2xl">{stat.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-fg-muted mb-3 text-xs font-medium tracking-wide uppercase">
        Pipeline stages
      </h2>
      <ol className="flex flex-wrap gap-2">
        {preset.stages.map((stage) => (
          <li
            key={stage.name}
            className="border-border-strong bg-surface-raised rounded-full border px-3 py-1 text-sm"
          >
            {stage.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
