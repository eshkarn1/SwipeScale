# Decisions

Locked-in answers to the open scoping questions. Anything marked **OPEN** still
needs action before it can be treated as final.

Last updated: 2026-08-06

---

## 1. Product name

**Decision:** Lightline. Primary domain: `uselightline.com`.

The `use-` prefix pattern means the bare `lightline.com` is presumed taken or
out of budget. That's a normal tradeoff, but it has consequences worth naming:
type-in traffic leaks to the bare domain, and email deliverability reputation
has to be built from scratch on the prefixed domain.

**OPEN — do before paying a designer:**

- [ ] Confirm `uselightline.com` is actually available and register it
- [ ] Register defensive variants: `.ca`, `.io`, `lightlinecrm.com`
- [ ] CIPO trademark search (Canada) — Nice class 9 and class 42
- [ ] USPTO TESS search (US) — same classes
- [ ] Common-law check: Google, LinkedIn, Crunchbase, app stores for existing
      "Lightline" software products
- [ ] Secure social handles: X, LinkedIn, Instagram

Do not commission logo or brand work until the trademark searches come back
clean. A rename after design work is paid for is pure waste.

---

## 2. Buyer

**Decision:** Real-estate teams.

This is the wedge, not the ceiling. All v1 copy, onboarding, demo data, and
pricing-page language target this segment specifically.

**What this implies for the product:**

- Deal object is a *transaction* (listing or buyer-side), not a generic
  opportunity
- Pipeline stages should default to a real-estate lifecycle
  (Lead → Appointment → Agreement Signed → Under Contract → Closed)
- Contacts need dual-role handling — the same person is a seller now and a
  buyer in eighteen months
- Team structure is agent + team lead + transaction coordinator, so per-seat
  pricing needs to tolerate a non-selling admin seat
- Commission split tracking will be asked for. Decide in or out before M6.

**Risk to watch:** this segment is not the Swipe & Scale network. The original
argument for agencies was warm distribution — "you already talk to them." That
advantage is now gone. Cold acquisition for real-estate teams needs its own
plan (which brokerages, which conferences, which Facebook groups) and that plan
does not exist yet.

**OPEN:**

- [ ] Identify 10 target teams for design-partner conversations
- [ ] Decide: in or out on commission split tracking for v1
- [ ] Write the acquisition plan that replaces the lost warm-network advantage

---

## 3. Pricing

**Decision:** Four tiers, per-user monthly.

| Tier | Price (USD/user/mo) | Notes |
|---|---|---|
| Free | $0 | 1 user, 50 deals |
| Starter | $19 | |
| Growth | $39 | |
| Scale | $69 | |

**Annual billing:** 2 months free (≈16.7% discount).

**Still to define before the pricing page ships:**

- [ ] What gates each tier — seats, deals, automations, integrations, or a mix
- [ ] Whether the Free tier's 50-deal cap is lifetime or concurrent-active
      (concurrent-active is friendlier and converts better)
- [ ] Behaviour on downgrade and on exceeding the Free cap — read-only lock,
      soft warning, or hard block
- [ ] Whether the non-selling admin/coordinator seat is billable
      (see §2 — real-estate teams will push back hard if it is)

**Deadline:** locked before M6.

---

## 4. Currency and billing region

**Decision:** USD.

Stripe as processor. All prices displayed in USD with no local-currency
switching in v1.

**Consequences to handle:**

- We are a Canadian entity billing in USD — FX exposure sits on our side
- Revenue recognition and bookkeeping stay in CAD; note the FX policy for the
  accountant (spot rate at invoice date is the simplest defensible choice)
- Canadian customers will see USD pricing. Acceptable, but expect it to come up
  in sales conversations

**OPEN:**

- [ ] Confirm Canadian sales tax handling (GST/HST) on USD-denominated SaaS
      sales to Canadian customers — this is a question for an accountant, not a
      guess
- [ ] Confirm US state sales tax / economic nexus obligations. Several states
      tax SaaS. Stripe Tax handles most of this but has to be switched on and
      configured.

---

## 5. Data residency

**Decision:** US only.

Postgres in a US region. No EU region in v1.

**Consequences:**

- No GDPR obligation, no DPA to write, no EU sub-processor list — this is the
  main reason the decision is worth it
- We do **not** sell to EU customers in v1. This needs to be a real policy, not
  an assumption: add it to the ToS and consider geo-flagging EU signups
- PIPEDA still applies to us as a Canadian company regardless of where the data
  lives, so a privacy policy is still required
- Real-estate data is sensitive by nature (financial details, addresses,
  identity documents). Encryption at rest and in transit is non-negotiable even
  without a regulator forcing it.

**OPEN:**

- [ ] Pick and record the specific US region
- [ ] Draft privacy policy (PIPEDA-compliant)
- [ ] Decide backup retention window and where backups live
- [ ] Note revisit trigger: first serious EU inbound lead

---

## 6. Support channel

**Decision:** Email.

Single shared inbox. No Intercom, no Slack Connect, no live chat in v1.

**To state publicly on the pricing page:**

- The support address
- Response time commitment — pick one and honour it. Suggested: next business
  day for paid tiers, best-effort for Free.
- Support hours and timezone (Toronto / Eastern)

**OPEN:**

- [ ] Choose the address (`support@uselightline.com`)
- [ ] Choose the tool — a shared inbox like Help Scout or Front beats raw Gmail
      the moment there's more than one person answering
- [ ] Write the response-time line for the pricing page

---

## 7. API in v1

**Decision:** No. Cut from v1.

Currently scoped at M8. Cutting it ships roughly two weeks sooner.

**Rationale:** real-estate teams are not an API-first buyer. They will ask for
specific pre-built integrations long before they ask for a REST endpoint.

**What they will actually ask for — track these as the real integration
backlog:**

- MLS / IDX data
- Follow Up Boss, kvCORE, or whatever their brokerage mandates
- Google Calendar and Gmail
- DocuSign or Dotloop
- Zapier — worth considering as a cheaper substitute for a public API

**Consequence to design around now:** even without shipping a public API, build
the internal service layer with clean boundaries so exposing it later is an
authentication and rate-limiting problem rather than a rewrite.

**Revisit at:** post-launch, once there are paying customers asking.

---

## Summary of open items blocking other work

| Item | Blocks | Section |
|---|---|---|
| Domain + trademark clearance | All brand and design spend | §1 |
| Tier feature gating | Pricing page, billing implementation | §3 |
| Sales tax configuration | First invoice | §4 |
| Privacy policy | Public launch | §5 |
| Support address + tool | Pricing page | §6 |
| Real-estate acquisition plan | Go-to-market | §2 |

---

## 8. BUILD_SPEC ↔ DECISIONS reconciliation

**Recorded per BUILD_SPEC §8**, which requires an entry whenever a non-obvious
architectural choice is made, so the reasoning is followable later.

The two documents in `docs/` disagree in four places. `DECISIONS.md` is dated
2026-08-05 and exists to resolve open scoping questions, so where they conflict
it wins. Applied as follows.

### 8.1 The product is `Lightline`, not `Pipeboard`

BUILD_SPEC §1 names it Pipeboard but explicitly invites the rename and requires
the name live in exactly one constant. §1 of this document settles it.

`src/config/brand.ts` is the single source. No component, page, metadata block
or email template may hardcode a product name. A rename must stay a one-line
change — that property is worth protecting, because §1 above still has open
trademark searches and the name could yet move.

Domain `uselightline.com`, support `support@uselightline.com`.

### 8.2 The public API is cut from v1

§7 of this document cuts it; BUILD_SPEC scopes it at M8. Removed from v1: the
`/api/v1` REST surface, the OpenAPI 3.1 spec, outbound webhooks, and per-key
rate limiting.

**Deliberately kept:** the `ApiKey` model in the schema, and business logic in
`server/services/` behind clean boundaries as BUILD_SPEC §3 requires. §7 above
is explicit that exposing the API later must be "an authentication and
rate-limiting problem rather than a rewrite", and that property is only cheap to
preserve while the service layer is being written — retrofitting it costs far
more than maintaining it.

M8 keeps CSV import/export and the polish pass.

### 8.3 The buyer is real-estate teams, and it changes the defaults

BUILD_SPEC is written for generic B2B sales — companies, contacts, opportunities.
§2 above narrows the wedge, and that reaches the data model rather than just the
copy:

- A deal is a **transaction** (listing-side or buyer-side), not a generic
  opportunity.
- The default pipeline is a real-estate lifecycle — Lead → Appointment →
  Agreement Signed → Under Contract → Closed. Generic B2B stage names must not
  be baked in as defaults.
- Contacts need **dual-role handling**: the same person is a seller now and a
  buyer in eighteen months. This is a modelling requirement, not a label.
- Team shape is agent + team lead + transaction coordinator, so per-seat pricing
  has to tolerate a non-selling admin seat (see §3 above, still open).

Commission-split tracking is still an open in-or-out call and is not assumed
either way.

### 8.4 Pricing is settled; gating is not

$0 / $19 / $39 / $69 per user per month, annual at two months free. The `Plan`
enum in BUILD_SPEC §4 already matches these four tiers, so no schema change.

What each tier *gates* remains open and blocks M6. It does not block M0-M5.

### 8.5 Note on precedence

If a fifth conflict appears, it is resolved the same way — this document wins —
but it gets an entry here rather than a silent choice in code. A reconciliation
nobody wrote down is indistinguishable from a mistake six weeks later.

### 8.6 The schema stays industry-neutral; real estate is the default preset

**Owner's constraint, verbatim:** _"this project is for real estate agents but I
dont want to limit it there keep it in mind."_

This supersedes what §8.3 above implies. §8.3 is still correct about *behaviour*
— a deal has a represented party, a contact's role is per-transaction — but it
must not be read as licence to name real-estate concepts in the core schema.
§2 already said the same thing in one line, "this is the wedge, not the
ceiling", and it was under-weighted.

**The principle: verticalise the configuration, not the schema.**

The spec already works this way and it is worth noticing why. `Pipeline` and
`Stage` are per-workspace **rows**, not enums, which is precisely why the
real-estate stage lifecycle in §8.3 was never going to be hardcoded — it is
seed data. Every other short vocabulary a vertical needs gets the same
treatment rather than a new enum.

**What was almost built, and why it was wrong.** A first pass added
`enum DealSide { LISTING, BUYER }` and a seven-member `enum DealContactRole`
(SELLER / BUYER / CO_BUYER / AGENT / LENDER / ATTORNEY / OTHER), both required.
That is a real-estate brokerage compiled into the data model. The tell is the
migration cost of the second vertical: a B2B workspace wanting
champion / decision-maker / procurement would need a schema change, a
deploy, and an enum whose members are meaningless to two thirds of the
customers reading them. Caught while `prisma/migrations/` was still empty, so
the correction was free — which is the whole reason schema work went first.

**What is in the schema now:**

- **`DealContact.role` — `String?`.** The capability §8.3 asked for, without the
  lock. It stores a `WorkspaceOption.value` of kind `"deal_contact_role"`.
  Critically the role still sits on the **join**, not on `Contact`: that part of
  §8.3 was right and is the actual dual-role requirement. A `Contact.role`
  column would force the seller-turned-buyer to be duplicated or overwritten,
  and either outcome destroys the history that makes a past client worth
  keeping. Nullable, because a workspace with no role vocabulary should simply
  never see the field.
- **`Deal.side` — `String?`.** Generalised from "listing or buyer" to "which
  party do we represent", a `WorkspaceOption.value` of kind `"deal_side"`.
  Optional for the same reason: a workspace with no concept of sides ignores it
  entirely. The real-estate preset seeds `LISTING` / `BUYER`, so nothing is lost
  for the wedge buyer.
- **`Workspace.vertical` — `String @default("real_estate")`.** The one seam.
  Default pipelines and stages, both option lists, seed data and onboarding copy
  branch on this single field, which is what keeps vertical-specific defaults
  out of every other table. A `String` rather than an enum so that adding a
  vertical is a new preset in code plus seed rows — never a migration. The
  preset registry in `src/server/services/` owns the set of valid values.
- **`model WorkspaceOption`** — `(workspaceId, kind, value, label, position,
  isArchived)`, unique on `(workspaceId, kind, value)`.

**Why one generic option table rather than two small ones.** The judgement call
was left open; this is the cheaper side. `kind` is a `String`, so the next list
a vertical needs — `deal_source`, `lost_reason`, `property_type` — is seed rows
against an existing table rather than another migration. Two purpose-built
tables would each need one. `CustomFieldDef.entity` in BUILD_SPEC §4 is already
a loose `String` for exactly this reason, so this matches the house idiom rather
than inventing one.

Three properties of that table that were deliberate:

- Records store `value`, **not** the option row's `id`. A workspace can rename
  "Seller" to "Vendor" or archive it without a data migration, and without
  rewriting what historic deals say. It also means `DealContact` does not need
  the `workspaceId` column BUILD_SPEC §4 never gave it in order to hold a
  composite foreign key. The cost is that validity is enforced in the service
  layer rather than by the database — accepted, and it is where the tenant guard
  already lives.
- `isArchived` is a flag, not a delete, so retired options stay resolvable for
  existing records while leaving the pickers.
- `@@index([contactId, role])` on `DealContact`. "Every deal this person was the
  seller on" is the query that makes dual-role handling visible in the UI, it
  runs from the contact side, and no other index covers it.

One consequence worth stating rather than discovering later: the primary key
stays `@@id([dealId, contactId])`, so **one person holds one role per deal**. A
person who is both the seller and the listing agent on the same file cannot be
represented. Judged acceptable — it is rare, and widening the key to include
`role` makes "the contacts on this deal" a `DISTINCT` query forever. Revisit
only if a design partner actually hits it.

Still not assumed either way: commission-split tracking (§2, open). The
real-estate stage lifecycle remains seed data and is deliberately absent from
`schema.prisma`.

## 9. M1 — Auth & tenancy: choices worth following later

Recorded per BUILD_SPEC §8, same rule as §8 above.

### 9.1 `User` creation is not inside the Workspace+Membership transaction

BUILD_SPEC §7.2 says "Signup creates User → Workspace → Membership(OWNER) in
ONE transaction." Implemented as two steps instead: Auth.js's Prisma adapter
creates the bare `User` row during sign-in (magic-link verification or
Google OAuth callback), and `createWorkspaceForUser`
(`src/server/services/workspace.ts`) creates `Workspace` + `Membership(OWNER)`
+ the vertical preset's pipeline/stages/options in one transaction once the
user is authenticated and has no memberships yet (`/onboarding`).

Reasoning: identity and tenancy are different trust boundaries. A magic-link
or OAuth flow can only tell you "this person controls this email/Google
account" at the moment `createUser` runs — the onboarding form (workspace
name, vertical) hasn't been submitted yet for a first-time magic-link
signup, and for Google there is no opportunity to collect it before the
provider redirect at all. Folding workspace creation into the same
transaction as user creation would mean creating a workspace for an
unverified identity, which is worse than the two-step version, not just
different from it. The atomicity BUILD_SPEC actually cares about — no
workspace without an owner, no owner without a workspace — is preserved:
`createWorkspaceForUser`'s transaction is exactly that pair (plus the preset
rows), and it's the same function real onboarding and `prisma/seed.ts` both
call, so there is one code path for "how a workspace comes into being."

An invited user (`/join/[token]`) never goes through `createWorkspaceForUser`
at all — `acceptInvite` (`src/server/services/invite.ts`) grants membership
in an existing workspace instead, which is correct: an invitee should never
get an extra workspace of their own as a side effect of accepting one.

### 9.2 Auth.js session strategy is `"database"`, not the default-adjacent `"jwt"`

With an adapter configured, Auth.js already defaults to database sessions,
so this is a confirmation, not an override — worth stating because it was a
real choice, not an accident. A JWT session would still work with both the
Resend (email) and Google providers here; database sessions were kept
because removing a `Session` row is an actual revocation (suspend a
workspace, remove a member, kick a device) instead of waiting out a signed
token's expiry. The cost is a DB read per authenticated request, accepted
for v1.

### 9.3 `User.avatarUrl` renamed to `User.image`

BUILD_SPEC §4's `User` model has `avatarUrl`. `@auth/prisma-adapter` reads
and writes a Prisma field literally named `image` (and `emailVerified`) with
no remapping hook — the adapter's generated queries use those property names
directly. Renamed rather than added a second field, since nothing outside
`src/generated/` referenced the old name yet (checked before renaming).

### 9.4 Rate limiting is a Postgres table, not Redis

BUILD_SPEC §8 requires auth endpoints capped at 5 attempts / 15 min / IP.
The stack table rules out Redis/BullMQ for v1. `RateLimitBucket`
(`prisma/schema.prisma`) is a fixed-window counter, one atomic `upsert` per
check (`src/server/rate-limit.ts`). It will not enforce a shared limit
correctly across multiple *database* replicas with replication lag, but it
is correct across multiple *app* instances sharing one primary, which is
what v1's deploy target actually looks like. Revisit if/when read replicas
enter the picture.

### 9.5 Row-level security is enabled and verified, but not wired into the app yet

BUILD_SPEC §5 asks for RLS "as a second net," documented in `docs/rls.md`.
Every tenant table has a real, verified policy (`docs/rls.md` shows the
actual `psql` output proving cross-tenant denial). What it does not yet do
is apply to the app's own connection — that connection uses the same
Postgres role that owns the tables, and closing that gap means both a
second, lower-privileged role for `DATABASE_URL` *and* wrapping every
tenant-scoped Prisma call in a transaction that sets `app.workspace_id` via
`SET LOCAL` first. That's a change to every service's call sites, not a
schema change, so it's flagged as explicit follow-up rather than attempted
partially. `docs/rls.md` also records a real mistake made and caught while
building this: `FORCE ROW LEVEL SECURITY` was applied first, which also
applies RLS to the table owner — and since the app connects as the owner,
it immediately zeroed out every query the app makes, caught by the test
suite failing right after. Reverted before it went further. Left as a
prominent warning in both the migration and `docs/rls.md` so it isn't
repeated when someone picks up the wiring work.

### 9.6 Seed data: ~60/~150/~80 applied per workspace, not split across the two

BUILD_SPEC §7 M1 acceptance says "two demo workspaces with realistic data
(≈60 companies, 150 contacts, 80 deals across stages)" — one set of numbers
for two workspaces, read most naturally as a combined total. Applied to
*each* workspace instead (`prisma/seed.ts`), because the second workspace's
entire purpose is proving the vertical seam in DECISIONS §8.6 — it needs to
be a complete, independently-browsable dataset, not a thin remainder split
off the real-estate one. Flagged here as a deviation rather than assumed
silently.

### 9.7 Local Postgres: a second instance on port 5433, not the machine's existing one

This machine already runs a system-wide Postgres 17 on port 5432, owned by
other work already on it. Rather than share that instance or guess at its
credentials, a second, isolated `postgresql@16` (via Homebrew, no Docker
available) runs on port 5433, used by nothing but this project. See
`docs/local-database.md`.

## 10. M2 — CRM records: choices worth following later

Recorded per BUILD_SPEC §8.

**Status: BUILD_SPEC §7 M2 is complete.** An earlier pass was given a brief
narrower than the spec and correctly flagged the gap rather than hiding it.
That gap has since been closed — TanStack Table v8, cursor pagination,
inline grid editing, the ⌘K palette and the three-region record detail are
all built, and the milestone's acceptance criterion is now covered by a
committed end-to-end test. See §10.1.

### 10.1 The M2 deviations are closed

The four items previously flagged as missing are built:

**TanStack Table v8** (`src/components/app/data-grid.tsx`). BUILD_SPEC §2
fixes the choice; `@tanstack/react-table` is pinned to `8.21.3`
specifically, not the newer 9.x that `pnpm add` resolves by default, because
§2 names v8. TanStack owns column definition, visibility state and sorting
state; every element of markup is ours, which is the point of a headless
table. Column visibility, multi-sort (Shift to add a column, which works
from the keyboard because Shift+Enter on a focused button produces a click
event carrying `shiftKey` — exactly what TanStack's default
`isMultiSortEvent` reads) and dismissible filter chips are all present.

**Cursor pagination** (`src/lib/pagination.ts`). The original entry argued a
keyset cursor against a user-chosen sort column needs a compound
`(sortValue, id)` cursor re-derived per column, and that this was too much
complexity for three lists. The premise was right and the conclusion was
wrong: that compound cursor is written once, in one file, and shared by all
three services, so the cost is paid a single time rather than per list.

Two details in that file are load-bearing and must change together:

- Every nullable sort column is pinned to `nulls: "last"` in **both**
  directions. Postgres defaults to NULLS LAST for ASC and NULLS FIRST for
  DESC, which would otherwise mean two different keyset predicates per
  direction. `buildKeysetFilter` assumes the pin.
- The cursor embeds a **signature of the sort it was cut against**. Change
  the sort while holding `?after=`, and the cursor decodes to `null` and the
  list falls back to its first page rather than applying a predicate whose
  columns no longer match the ordering.

"Previous" is a real backwards keyset query (invert every direction and the
nulls placement, take a page, reverse the rows), not a remembered stack of
cursors — so it survives a page reload and a shared URL.

`pagination.test.ts` covers the predicate's *shape*; the ordering semantics
it is built against are the database's, so `tenancy.test.ts` pages all the
way through a seeded set against real Postgres and asserts every row is
visited exactly once — including across the null block, in both directions,
and on a multi-column sort.

**Inline editing** on the grid, and the **⌘K palette**
(`src/components/app/command-palette.tsx`), are built. The palette is the
ARIA combobox + listbox pattern: focus stays in the text input and
`aria-activedescendant` moves a virtual cursor, which is what lets arrow
keys drive the list while the user is still typing.

**Record detail** is the three-region shell §7 M2 describes — left summary
panel, centre tabs, right context rail — shared by all three record types
via `src/components/app/record-shell.tsx` so they cannot drift apart.

**The acceptance criterion is verified, not assumed.** "A record can be
created, edited inline, deleted, and restored entirely by keyboard" is
`e2e/keyboard-record-lifecycle.spec.ts`. After sign-in it calls no `click`,
`fill`, `hover` or `selectOption` at all — it presses keys and reads
`document.activeElement` back, because a test that clicks its way to each
control proves the control exists and nothing about whether it is reachable.
The previous pass assumed Radix supplied keyboard support; Radix supplies
the menu and the dialog, and everything that actually broke was ours.

### 10.1.1 What still deviates

- **Activity and Files tabs are empty states.** Deliberate: activities are
  BUILD_SPEC M4 and file storage is M8. They render a designed empty state
  naming what will land there, never placeholder rows.
- **Owner, Company and Stage are not inline-editable.** They are relations
  and workspace vocabulary, set through the edit Sheet's pickers. Free-texting
  a company name in a cell would have to guess which record was meant, and a
  stage change writes an append-only `DealStageEvent` (BUILD_SPEC §4) — that
  is a pipeline action belonging to M3, not a text edit.
- **The mobile primary nav scrolls sideways rather than collapsing.** At
  375px five 44px nav targets do not fit; the nav is now its own horizontal
  scroll container so it no longer widens the document (measured: the page
  was 930px wide at a 375px viewport before this, and is 375px after). A
  proper collapse-to-sheet treatment is polish work for M8.
- **RLS is still not wired into the app's own connection** — unchanged from
  §9.5, and untouched by this work.

### 10.1.2 List state lives entirely in the URL, including table state

TanStack's `sorting` and `columnVisibility` are controlled from the query
string rather than component state (`?sort=name:asc,employees:desc`,
`?hidden=domain,industry`). Two consequences worth stating:

- Sorting **has** to be `manualSorting`. Pagination is a server-side keyset
  cursor, so a client-side sort would reorder only the 25 rows on screen —
  silently, and only sometimes noticeably.
- A `SavedView` captures column visibility for free, because a saved view is
  already defined as a snapshot of the query string (§10.2). There is no
  second representation to keep in sync.

Hidden columns are stored as the **hidden** set, not the shown set: storing
what is visible would mean every newly added column defaults to hidden for
anyone holding an older URL or saved view, which is the wrong failure
direction. `after`/`before` are excluded from a saved view — a cursor is a
transient position, and saving one would drop everyone who loads the view
into the middle of someone else's browsing session.

### 10.1.3 The grid is one tab stop, and it remembers where you were

The record grid implements the ARIA grid pattern: roving `tabindex`, so the
whole table is a single tab stop and arrows move a virtual cursor between
cells. Row `-1` is the header row, which is how sorting is reached — by
arrowing up out of the data rather than tabbing backwards past it.

The part that is easy to get wrong, and that the e2e test pins: **focus
across a re-render.** Committing an inline edit unmounts the `<input>` and
mounts a `<button>` in its place, so focus lands on `<body>`; the server
action that follows then calls `revalidatePath` and the row data is replaced
underneath. The pending-focus target is therefore React **state**, not a
ref — a ref would be consumed by the first effect after the commit, which
fires long before the refreshed rows arrive — and it addresses cells by
**position**, not by record id, so a row that vanished (soft-deleted out of
the default filter) leaves focus on whatever now occupies that position.

A corollary for anyone writing tests against it: the grid deliberately
remembers the last cell used, so tabbing towards one *specific* cell asserts
the opposite of the pattern. Tab in to whichever cell holds the stop, then
move with arrows.

### 10.1.4 Search returns a projection, never a row

`searchWorkspace` returns four strings per hit. A `Deal` row carries
`amount`, a Prisma `Decimal`, which cannot cross a Server Action's return
boundary and fails silently past `tsc`, `eslint` and `next build` (see
`src/lib/serialize.ts` and `.claude/ENGINEERING-NOTES.md`). Projecting in
the service means the palette cannot reintroduce that bug, rather than
relying on every future caller to remember a `serializeDeal` call.

The result type and its two constants live in `src/lib/search.ts`, not in
the service, because the palette is a Client Component and needs
`MIN_QUERY_LENGTH` as a *value*. Importing it from the service pulls
`@/server/db`, Prisma and the `pg` driver into the browser bundle and breaks
the build with `Module not found: Can't resolve 'fs'` from inside
`pg-connection-string`. A type-only import would have been erased and caused
no such problem, which is what makes it easy to walk into: adding one shared
constant to an existing type import breaks the build, and the error names a
transitive dependency nobody wrote an import for.

**Rule this encodes: anything a Client Component imports as a value belongs
in `src/lib/`, never in `src/server/`.**

### 10.1.5 The E2E suite resets the auth rate-limit buckets before it runs

`e2e/support/global-setup.ts` clears `RateLimitBucket`. BUILD_SPEC §8 caps
auth endpoints at 5 attempts / 15 min / IP (§9.4), and every E2E run signs
up at least one fresh user from localhost — so the limiter sees a single IP
making every request in the suite, and after two or three runs inside a
fifteen-minute window `/login` silently stops sending. The failure surfaces
as "expected `/verify`, got `/login`" with nothing in the trace to explain
it. That is the rate limiter working correctly; it just makes the suite
unrunnable without the reset.

Scoped to that one table on purpose. It does not truncate users, workspaces
or records: every test namespaces its own data with a run id, and a setup
step that wiped the database would hide a test that accidentally depends on
another test's rows.

### 10.2 A `SavedView` stores raw URL search params, not an interpreted filter tree

`SavedView.filters`/`sort` (BUILD_SPEC §4) are typed `Json` with no schema
of their own. Rather than defining a `{ field, operator, value }[]` filter
AST and translating it to/from `URLSearchParams` on both save and load,
`src/components/app/use-list-params.ts` treats the URL's query string as
the single source of truth for a list's state, and `createSavedViewAction`
simply serialises the *current* `URLSearchParams` (minus `page` and `view`)
into `filters`. Loading a view is `router.push` back to that same query
string. This means a saved view can never drift out of sync with what its
list actually supports filtering on — there is no second representation to
keep in sync — at the cost of the stored JSON being opaque outside the
list page that wrote it (a saved view cannot be interpreted by, say, a
future CSV export job without also reading that page's param-parsing code).
Acceptable for v1: nothing outside the three list pages reads `SavedView`
rows yet.

### 10.3 `CustomFieldDef` deletion is a hard delete; values already written are left alone

Unlike `WorkspaceOption` (`isArchived` flag, DECISIONS §8.6), `CustomFieldDef`
has no archive flag in BUILD_SPEC §4's schema, and this milestone did not
add one (a new migration for a flag felt like exactly the kind of
speculative schema change the standing rules ask to avoid). Deleting a
field definition is `db.customFieldDef.deleteMany({ where: { id, workspaceId } })`
— nothing else in the schema holds a foreign key to it, since values live
as plain JSON keyed by `.key` on the record's own `customFields` column.
Consequence: a deleted field's historical values remain in old records'
JSON, invisible (no def to render them against) but not erased. Judged
acceptable — it mirrors how the model already treats `options` changes (no
backfill of existing values either) — but is a real gap if "permanently
scrub a field's data" is ever a compliance requirement; the fix then is
a delete-time backfill pass, not a schema change.

### 10.4 `CustomFieldDef.type = CURRENCY` follows the same integer-minor-units rule as every other amount

BUILD_SPEC §8: money is `Decimal` in the DB and integer minor units in JS,
never a float. A `CURRENCY` custom field's *value* lives inside a `Json`
column (`Company.customFields` etc.), which has no `Decimal` type to fall
back on, so the same discipline is enforced by convention instead:
`src/lib/custom-fields.ts` validates a `CURRENCY` value as `Number.isInteger`
and rejects a float, exactly like `src/lib/money.ts` does for `Deal.amount`.
The create/edit forms (`custom-fields-fields.tsx`) still collect the value
in dollars (matching the amount field's own UX) and convert with
`Math.round(dollars * 100)` before it reaches an action — the float never
touches storage, only the transient form input.

### 10.5 A Deal's `pipelineId` is derived from `stageId`, never accepted as separate input

BUILD_SPEC's `Deal` model carries both `pipelineId` and `stageId`. Every M2
write instead takes only `stageId` and reads `pipelineId` off that stage
(`stage.pipelineId`) inside `createDeal`/`updateDeal` — a stage belongs to
exactly one pipeline, so accepting both independently would let a client
send a mismatched pair (a real `stageId` paired with a different, wrong
`pipelineId`) that nothing would catch until a query joining through the
"wrong" pipeline silently returned nothing. Multi-pipeline management
(creating/choosing among several pipelines) is BUILD_SPEC M3 — every M2
deal form and filter pins to `Pipeline.isDefault`
(`listDefaultPipelineStages`), the one every workspace gets from its
vertical preset (DECISIONS §8.6) at creation.

### 10.6 Managing `CustomFieldDef` requires ADMIN; every other M2 write requires MEMBER

`src/server/permissions.ts` gained `canManageCustomFields = hasRole(role, "ADMIN")`,
enforced at both the settings page (`requireWorkspace(slug, "ADMIN")`) and
each custom-field action. Reasoning: a field definition changes what
*every* member's create/edit form looks like — closer to `canInvite`
(also ADMIN) than to record editing, which stays MEMBER-and-above like
company/contact/deal create/edit/delete. `SavedView` writes are MEMBER —
a saved view is closer to a personal (or opt-in shared) convenience than a
structural change, even though the model supports `isShared`.

### 10.7 A `WorkspaceOption` field with zero configured options accepts no value, ever — never "anything goes"

`isValidWorkspaceOption` (`src/server/queries/workspace-options.ts`) returns
`false` for every value when a workspace has zero active options of that
`kind`. The tempting alternative — "no vocabulary configured, so don't
block writes" — was considered and rejected while writing the function:
it would let a `general_b2b` workspace (zero `deal_side` options, by
design — DECISIONS §8.6) accept an arbitrary `side` string sent by a
client, silently reintroducing exactly the loose, unvalidated field the
vocabulary system exists to prevent. The tenancy suite asserts this
directly ("rejects a `side` value for a workspace with no `deal_side`
options configured"). The correct reading of "a workspace with no concept
of sides ignores it entirely" (schema.prisma's own comment on `Deal.side`)
is that the field stays `null` forever for that workspace — not that it
becomes an unvalidated free-text field once no options exist.
