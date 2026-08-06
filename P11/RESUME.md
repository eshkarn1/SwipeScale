# Where this project stands

Last session ended: 2026-08-06. Everything below is committed and pushed —
the working tree was clean at shutdown.

## Committed so far

| Commit | What |
|---|---|
| `c070c53` | M0 scaffold, Prisma schema, design tokens, CI |
| `2c07820` | M0 complete — vertical-neutral schema, 12 primitives, kitchen-sink |
| `486c4a3` | M1 — auth, tenancy guard, RLS, invites, two-vertical seed |
| `67e8d8a` | M2 part 1 — companies/contacts/deals, custom fields, saved views |
| `f44a4b5` | TanStack Table v8 + Radix Tabs installed, nothing importing them yet |

Verified at shutdown, by a real run and not by assertion:
`pnpm typecheck` 0 errors · `pnpm lint` clean · `pnpm test` 59/59 ·
`pnpm build` clean · `pnpm exec playwright test` 1/1.

## Pick up here — M2 is NOT finished

`docs/DECISIONS.md` §10.1 records the deviation. BUILD_SPEC §7 M2 requires five
things that are not built:

1. **TanStack Table v8** — column visibility, multi-sort, filter chips. §2 fixes
   this choice; the current lists are hand-rolled. The dependency is installed.
2. **Cursor-based pagination** — currently page-based.
3. **Inline editing on the grid.**
4. **Global command palette (⌘K)** for search and navigation.
5. **Record detail layout** — left summary panel, centre tabs
   (Overview / Activity / Deals / Files), right context rail. Activity and Files
   may be empty states until M4; do not fake data.

**M2's acceptance criterion, verbatim from §7, is the real target:**

> a record can be created, edited inline, deleted, and restored entirely by keyboard

This has never been verified. The M2 agent flagged honestly that it assumed
Radix provided keyboard support rather than testing it. An inline-editing grid
is exactly where that assumption breaks — focus between cells, Enter/Escape to
commit or cancel, and focus surviving the re-render after a save. Drive the full
create → inline-edit → delete → restore cycle with no mouse input, and commit it
as an e2e test rather than a throwaway script.

After M2: M3 Kanban (dnd-kit), M4 activities and timeline, M5 dashboard.

## The constraint that overrides defaults

The owner, verbatim: *"this project is for real estate agents but I dont want to
limit it there keep it in mind."*

Real estate is v1's default preset and go-to-market wedge, never a modelling
assumption. `Workspace.vertical` is the one seam; presets live in
`src/server/services/workspace-presets.ts`. Deal side and per-deal contact roles
resolve against `WorkspaceOption` rows. No hardcoded `listing` / `buyer` /
`seller` in any component, service or query. Adding a third vertical must be a
new registry entry, not a migration.

Test against the seeded `northwind-b2b-solutions` workspace — if real-estate
vocabulary shows up there, something leaked. See `docs/DECISIONS.md` §8.6.

## Environment

- **Node 24.16.0 is required.** Node 20 breaks vitest (jsdom 30 / undici 8).
  `export PATH="$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"`, pnpm via corepack.
- Local Postgres, `.env` configured — see `docs/local-database.md`.
- Two seeded workspaces: `vertex-realty-group` (real estate) and
  `northwind-b2b-solutions` (generic B2B).
- Migrations `20260806055903_init` and `20260806062455_enable_row_level_security`
  are applied. Add new ones; never edit those two.
- No dev servers left running.

## Traps already paid for

`.claude/ENGINEERING-NOTES.md` is the shared failure memory — read it before
starting. Two worth repeating here:

- **`Prisma.Decimal` crossing the server/client boundary** typechecks, lints and
  builds completely clean, and only ever appears as a runtime console error.
  Serialise via `src/lib/serialize.ts` at every page and action boundary.
- **Never run `build` and `dev` against the same `.next`** — the collision
  produces symptoms that look exactly like broken application code.

## Still open, and blocking later milestones

- What each pricing tier gates; whether a non-selling coordinator seat is
  billable — both block M6.
- Commission-split tracking, in or out — affects the data model, decide before M6.
- Domain and trademark clearance — blocks all brand and design spend.
- Sales tax setup (GST/HST + US nexus) — blocks the first invoice.
- Privacy policy (PIPEDA applies regardless of US hosting) — blocks launch.

## Unrecorded decision to write up

The shared-database question was settled in conversation but never written into
`docs/DECISIONS.md`: **one Postgres for all tenants**, isolated by `workspaceId`
on every row plus row-level security — not a database per client. Per-tenant
databases would turn every schema change into an operations event and break
connection pooling, and `workspaceId` everywhere keeps sharding possible later.
Revisit only for a contractual isolation or data-residency requirement.
