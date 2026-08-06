-- Row-level security — the second net behind `requireWorkspace()`.
-- BUILD_SPEC §5: "Additionally enable Postgres row-level security on the
-- tenant tables as a second net. Document the setup in docs/rls.md."
--
-- Read docs/rls.md before touching this file — it explains what this does
-- and does not currently protect, and why `FORCE ROW LEVEL SECURITY` is
-- deliberately NOT used here even though it sounds like the stricter,
-- more-correct choice. Short version: this app's own runtime connection
-- (`DATABASE_URL`) is the same role that owns these tables (the one
-- `prisma migrate` ran as), because standing up a second, lower-privileged
-- role and threading `SET LOCAL app.workspace_id` through every Prisma call
-- is real follow-up work, not done in M1. `ENABLE` alone leaves the table
-- owner exempt (Postgres' own default), so the app keeps working exactly as
-- it does today; `FORCE` applies the policy to the owner too, which was
-- tried, applied to both databases, and immediately returned zero rows to
-- every one of the app's own queries — caught by re-running the test suite
-- right after, not discovered later. That failure is *why* this comment is
-- this explicit: the next person tempted to add FORCE here needs to also
-- migrate the app off the owning role in the same change, not before.
--
-- Every policy is keyed off one session variable:
--   current_setting('app.workspace_id', true)
-- `true` = "missing_ok", so an unset variable reads as NULL rather than
-- raising — and `"workspaceId" = NULL` is never true in SQL, so a
-- non-owner role that never sets the variable sees nothing, not everything.

-- ---------- Tables with a workspaceId column ----------
-- (Every tenant table per BUILD_SPEC §4 except DealContact, which has no
-- workspaceId of its own — see below.)

ALTER TABLE "Membership" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Membership"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "WorkspaceOption" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "WorkspaceOption"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Invite"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Company"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Contact"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Pipeline"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "Stage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Stage"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "Deal" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Deal"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "DealStageEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DealStageEvent"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Activity"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "CustomFieldDef" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CustomFieldDef"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "SavedView" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "SavedView"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ApiKey"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "AuditLog"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));

-- ---------- DealContact: no workspaceId column ----------
-- DECISIONS §8.6 deliberately left `workspaceId` off this join table (the
-- role lives on the join, scoped through `Deal`). RLS has to reach through
-- the same relation: a row is visible only if its parent Deal belongs to
-- the current workspace.

ALTER TABLE "DealContact" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DealContact"
  USING (
    EXISTS (
      SELECT 1 FROM "Deal"
      WHERE "Deal"."id" = "DealContact"."dealId"
        AND "Deal"."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Deal"
      WHERE "Deal"."id" = "DealContact"."dealId"
        AND "Deal"."workspaceId" = current_setting('app.workspace_id', true)
    )
  );

-- ---------- Deliberately NOT covered ----------
-- User, Account, Session, VerificationToken — global identity, not
--   workspace-scoped by nature.
-- Workspace itself — the tenant, not a tenant-scoped row.
-- RateLimitBucket — explicitly outside the tenant model (see the comment
--   on that model in schema.prisma); keyed by IP, not by workspace.
