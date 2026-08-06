# Row-level security

BUILD_SPEC §5: *"Additionally enable Postgres row-level security on the
tenant tables as a second net."* This document is that documentation.

**Read this before touching `prisma/migrations/20260806062455_enable_row_level_security/`.**

## What's actually enforced today

RLS is enabled and correct on every tenant table, and is **verified working**
against a non-owner role (commands below). It is **not yet in the app's own
request path** — `src/server/db.ts` connects using the same Postgres role
that owns the tables (`prisma migrate` runs as that role too), and Postgres
lets a table's owner bypass RLS by default. So today:

- The primary defence is `requireWorkspace()` (`src/server/tenancy.ts`) plus
  `workspaceId: workspace.id` in every service query — tested by
  `src/server/tenancy.test.ts`, which is the suite BUILD_SPEC §5 requires and
  must grow with every new service.
- RLS is a correctly-configured, independently-verified **second net that
  isn't wired into the primary connection yet**. It protects any *other*
  connection to the database that isn't the owning role — a future BI tool,
  a support engineer's psql session, a read replica — from day one.

This is a real gap, not a cosmetic one, and it's written down here instead of
implied. See "Wiring it into the app" below for what closing it requires.

## The one mistake worth recording so it isn't repeated

The first version of the migration used `ALTER TABLE ... FORCE ROW LEVEL
SECURITY` on every table, on the reasoning that `ENABLE` alone is a no-op for
the table owner and `FORCE` sounds like the more-correct choice.

That's true, and it's also **exactly what broke the app**: this project's own
`DATABASE_URL` connects as the owning role, and it never sets the session
variable the policies check. Applying `FORCE` made every one of the app's own
queries return zero rows — including inside `prisma migrate dev`'s own
auto-seed step and the full Vitest suite, both of which started failing
immediately after the migration applied. It was caught in the same session
by re-running `pnpm test` right after, not discovered later.

**The fix applied:** `FORCE` was reverted (`ALTER TABLE ... NO FORCE ROW
LEVEL SECURITY`) on both `lightline_dev` and `lightline_test`, and the
migration file was corrected to never have included it. `ENABLE` without
`FORCE` is the correct choice **for as long as the app connects as the table
owner** — which is the actual, current state of this project, not a
hypothetical.

**Do not add `FORCE ROW LEVEL SECURITY` back without, in the same change,**
also moving the app's runtime `DATABASE_URL` off the owning/migration role.
Doing one without the other reproduces this exact outage.

## How the policies work

Every tenant table (every model in `prisma/schema.prisma` with a
`workspaceId` column, plus `DealContact`, which doesn't have one — see
below) has one policy:

```sql
CREATE POLICY tenant_isolation ON "Company"
  USING ("workspaceId" = current_setting('app.workspace_id', true))
  WITH CHECK ("workspaceId" = current_setting('app.workspace_id', true));
```

- `current_setting('app.workspace_id', true)` — the `true` argument is
  "missing_ok": an unset session variable reads as SQL `NULL` instead of
  raising an error.
- `"workspaceId" = NULL` is never `true` in SQL (three-valued logic), so the
  **fail-safe default is "see nothing"**, not "see everything". A connection
  that never sets the variable — including one that forgot to — is denied by
  default rather than silently granted full access.
- `WITH CHECK` applies the same condition to `INSERT`/`UPDATE`, so a
  connection scoped to workspace A cannot write a row claiming to belong to
  workspace B even if something upstream got the `workspaceId` wrong.

### `DealContact`: no `workspaceId` column

DECISIONS §8.6 deliberately left `workspaceId` off this join table — the
role a contact plays lives on the join, scoped through `Deal`, and adding a
redundant `workspaceId` here was rejected as unnecessary. RLS has to reach
through the same relation:

```sql
CREATE POLICY tenant_isolation ON "DealContact"
  USING (
    EXISTS (
      SELECT 1 FROM "Deal"
      WHERE "Deal"."id" = "DealContact"."dealId"
        AND "Deal"."workspaceId" = current_setting('app.workspace_id', true)
    )
  )
  WITH CHECK ( -- same EXISTS clause );
```

### Deliberately not covered

- **`User`, `Account`, `Session`, `VerificationToken`** — global identity,
  not workspace-scoped by nature (a user can belong to more than one
  workspace).
- **`Workspace`** itself — the tenant, not a tenant-scoped row.
- **`RateLimitBucket`** — explicitly outside the tenant model (see the
  comment on that model in `schema.prisma`); it's keyed by IP, not by
  workspace, and rate-limiting a signed-out visitor has no workspace to key
  on in the first place.

## Local setup (already done in this environment, kept here for a fresh clone)

Two Postgres roles exist locally, both created against the dev and test
databases described in `docs/local-database.md`:

- **`lightline`** — owns the schema, runs `prisma migrate`, is what
  `DATABASE_URL` in `.env`/`.env.test` points at today. Bypasses RLS (table
  owner).
- **`lightline_app`** — a non-owner role with ordinary row privileges and no
  bypass. This is what RLS was actually verified against; it is **not**
  currently used by the running app (see "What's actually enforced today").

Role creation needs `CREATEROLE`, which `lightline` doesn't have — run this
as the Postgres superuser (locally, the machine user via `psql`'s default
trust auth; in a hosted environment, whatever the provider's admin role is):

```sql
CREATE ROLE lightline_app WITH LOGIN PASSWORD 'lightline_app_dev_pw';
GRANT USAGE ON SCHEMA public TO lightline_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lightline_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO lightline_app;
```

Run once per database (`lightline_dev` and `lightline_test`).

## Verifying it (commands actually run against `lightline_dev`, seeded)

```sql
-- No session variable set: fail-safe deny, even though rows exist.
SELECT count(*) FROM "Company";
-- => 0

-- Scope to one real workspace id (from `SELECT id, name FROM "Workspace"`):
SET app.workspace_id = '<vertex-realty-workspace-id>';
SELECT count(*) FROM "Company";
-- => 60 (matches the seed's COMPANIES_PER_WORKSPACE)

-- Explicitly asking for the OTHER workspace's rows while scoped to this one:
SELECT count(*) FROM "Company" WHERE "workspaceId" = '<northwind-workspace-id>';
-- => 0 — RLS overrides the WHERE clause's own claim, not just the default scope.

-- The join-table reach-through policy:
SELECT count(*) FROM "DealContact";              -- unscoped: 0
SET app.workspace_id = '<vertex-realty-workspace-id>';
SELECT count(*) FROM "DealContact";               -- scoped: matches that workspace's deals
```

All four were run against `lightline_app` on the seeded `lightline_dev`
database and returned exactly the values above.

## Wiring it into the app (not done in M1 — the concrete next step)

Making RLS the app's actual first line of defense (rather than a verified
but idle second net) requires, in one change:

1. A new Postgres role for the app's runtime connection (`lightline_app` is
   already that role locally) — `DATABASE_URL` moves to it, and a *separate*
   migration-only connection string is used for `prisma migrate`.
2. Every Prisma call that should be tenant-scoped issued inside
   `db.$transaction(async (tx) => { await tx.$executeRaw\`SET LOCAL
   app.workspace_id = ${workspace.id}\`; ... })` rather than directly on the
   `db` singleton — `SET LOCAL` is transaction-scoped, and Prisma's
   connection pool can hand two separate queries two different underlying
   connections unless they're pinned together in one transaction.
3. `FORCE ROW LEVEL SECURITY` added back once, and only once, step 1 has
   actually shipped — see the warning above.

This is a broader refactor than M1's scope (every service function's call
sites, not just the tenancy guard), which is why it's a documented follow-up
rather than attempted piecemeal here.
