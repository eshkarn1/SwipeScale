# BUILD_SPEC.md — "Pipeboard"

> **Instructions for Claude Code.** Read this whole file before writing any code.
> Work through the milestones in order. Do not skip ahead. At the end of each
> milestone, stop, run the acceptance checks, and report status before continuing.

---

## 0. Legal boundary — read first, non-negotiable

The owner studied **Twenty CRM** (`github.com/twentyhq/twenty`, AGPL-3.0) as a
reference for what a good CRM does. This project is **not a fork and not a port.**

**Hard rules:**

1. Do **not** clone, vendor, copy, or paste any file, component, function,
   GraphQL schema, migration, or CSS from the Twenty repository.
2. Do **not** install `twenty-*` npm packages.
3. Do **not** reproduce Twenty's visual design (their light-gray Notion/Linear
   table-first UI, their blue accent, their icon set, their empty-state art).
4. Do **not** use the name "Twenty", their logo, or their copy anywhere.
5. Feature *concepts* (companies, people, opportunities, pipeline stages,
   activity timelines, saved views) are generic CRM ideas and are fine to build.

If you ever find yourself about to reach for their repo, stop and write the
implementation yourself instead.

---

## 1. What we are building

**Pipeboard** — a multi-tenant, sales-first CRM dashboard that a small team uses
to run a pipeline, and that the owner sells as a subscription SaaS.

> Rename freely: the owner may swap `Pipeboard` for a final brand. Keep the name
> in exactly one constant (`src/config/brand.ts`) so a rename is a one-line change.

Two audiences, both must work:

- **The end customer** signs up, creates a workspace, invites teammates, and
  manages their sales pipeline.
- **The owner** logs into an admin area, sees every workspace, revenue, churn,
  and usage, and can suspend or upgrade accounts.

**Non-goals for v1** (explicitly out of scope — do not build these):
email/calendar two-way sync, a no-code workflow builder, a plugin marketplace,
custom-object schema editing at runtime, SAML/SSO, mobile native apps.
Twenty has all of these. We do not need them to sell v1, and each one is weeks
of work. Note them in a `ROADMAP.md` instead.

---

## 2. Stack — fixed, do not substitute

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript strict** | One deployable, RSC, fast to ship |
| DB | **PostgreSQL** (Neon or Supabase) | Relational data, row-level tenancy |
| ORM | **Prisma** | Typed, migrations, good DX |
| API | **Server Actions** for mutations + **route handlers** (`/api/v1/*`) for the public API | No GraphQL. Twenty uses it; we don't need the complexity |
| Auth | **Auth.js (NextAuth v5)** — email magic link + Google OAuth | Free, self-hosted, no per-MAU cost |
| Styling | **Tailwind CSS v4** + **shadcn/ui** as the base primitives | Fast, and we restyle tokens so it doesn't look default |
| Motion | **Framer Motion** | Owner's existing strength; used for page/board transitions |
| Charts | **Recharts** | Small, composable |
| Tables | **TanStack Table v8** (headless) | We own the markup |
| Drag & drop | **@dnd-kit/core** | Kanban stage dragging |
| Validation | **Zod** everywhere — every action input, every API body | |
| Billing | **Stripe** (Checkout + Billing Portal + webhooks) | |
| Email | **Resend** + **React Email** | |
| Files | **Cloudflare R2** (S3-compatible) via presigned URLs | Cheapest egress |
| Background jobs | **Vercel Cron** route handlers for v1 | Do not add BullMQ/Redis in v1 |
| Errors | **Sentry** | |
| Analytics | **PostHog** | |
| Tests | **Vitest** (unit) + **Playwright** (E2E) | |

**Node 20+. Package manager: pnpm.**

---

## 3. Repository layout

```
pipeboard/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/            # public site: /, /pricing, /legal/*
│  │  ├─ (auth)/                 # /login, /verify, /join/[token]
│  │  ├─ (app)/[workspace]/      # authed product, tenant in the path
│  │  │  ├─ dashboard/
│  │  │  ├─ pipeline/            # kanban board
│  │  │  ├─ deals/[id]/
│  │  │  ├─ companies/[id]?/
│  │  │  ├─ contacts/[id]?/
│  │  │  ├─ activities/
│  │  │  ├─ reports/
│  │  │  └─ settings/            # profile, team, fields, billing, api-keys
│  │  ├─ (admin)/admin/          # OWNER-ONLY control room
│  │  ├─ api/
│  │  │  ├─ v1/                  # public REST API, key-authenticated
│  │  │  ├─ webhooks/stripe/
│  │  │  └─ cron/
│  │  └─ layout.tsx
│  ├─ components/                # ui/ (primitives), app/ (product), marketing/
│  ├─ server/
│  │  ├─ actions/                # server actions, one file per domain
│  │  ├─ services/               # business logic, framework-agnostic
│  │  ├─ db.ts                   # Prisma client singleton
│  │  ├─ auth.ts                 # Auth.js config
│  │  ├─ tenancy.ts              # THE tenant guard — see §5
│  │  └─ permissions.ts
│  ├─ lib/                       # pure helpers: money, dates, slug, format
│  ├─ config/brand.ts
│  └─ types/
├─ e2e/
└─ docs/
```

**Rule:** business logic lives in `server/services/`. Server actions are thin —
authenticate, validate with Zod, call a service, revalidate. Components never
touch Prisma directly.

---

## 4. Data model

Write this as `prisma/schema.prisma`. Every tenant-scoped table carries
`workspaceId` and is indexed on it.

```prisma
// ---------- Tenancy & identity ----------
model Workspace {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique          // used in URLs
  logoUrl       String?
  currency      String   @default("USD")
  plan          Plan     @default(FREE)
  status        WorkspaceStatus @default(ACTIVE)
  stripeCustomerId     String? @unique
  stripeSubscriptionId String? @unique
  trialEndsAt   DateTime?
  createdAt     DateTime @default(now())
  deletedAt     DateTime?

  members Membership[]
  // ... all tenant relations
}

enum Plan            { FREE STARTER GROWTH SCALE }
enum WorkspaceStatus { ACTIVE PAST_DUE SUSPENDED CANCELLED }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatarUrl     String?
  isPlatformAdmin Boolean @default(false)   // owner-only admin area
  createdAt     DateTime @default(now())

  memberships Membership[]
}

model Membership {
  id          String @id @default(cuid())
  userId      String
  workspaceId String
  role        Role   @default(MEMBER)
  createdAt   DateTime @default(now())

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@index([workspaceId])
}

enum Role { OWNER ADMIN MEMBER VIEWER }

model Invite {
  id          String @id @default(cuid())
  workspaceId String
  email       String
  role        Role   @default(MEMBER)
  token       String @unique
  expiresAt   DateTime
  acceptedAt  DateTime?

  @@index([workspaceId])
}

// ---------- CRM core ----------
model Company {
  id          String  @id @default(cuid())
  workspaceId String
  name        String
  domain      String?
  industry    String?
  employees   Int?
  annualRevenue Decimal? @db.Decimal(14,2)
  addressCity String?
  addressCountry String?
  linkedinUrl String?
  ownerId     String?          // Membership id
  customFields Json  @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  contacts Contact[]
  deals    Deal[]

  @@index([workspaceId, deletedAt])
  @@index([workspaceId, name])
}

model Contact {
  id          String @id @default(cuid())
  workspaceId String
  companyId   String?
  firstName   String
  lastName    String?
  email       String?
  phone       String?
  jobTitle    String?
  linkedinUrl String?
  ownerId     String?
  customFields Json @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  company Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)
  deals   DealContact[]

  @@index([workspaceId, deletedAt])
  @@index([workspaceId, email])
}

model Pipeline {
  id          String @id @default(cuid())
  workspaceId String
  name        String
  isDefault   Boolean @default(false)
  position    Int     @default(0)

  stages Stage[]
  deals  Deal[]

  @@index([workspaceId])
}

model Stage {
  id          String @id @default(cuid())
  workspaceId String
  pipelineId  String
  name        String
  position    Int
  probability Int     @default(0)   // 0-100, drives weighted forecast
  type        StageType @default(OPEN)
  color       String  @default("amber")

  pipeline Pipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  deals    Deal[]

  @@index([workspaceId])
  @@index([pipelineId, position])
}

enum StageType { OPEN WON LOST }

model Deal {
  id          String @id @default(cuid())
  workspaceId String
  pipelineId  String
  stageId     String
  companyId   String?
  ownerId     String?
  title       String
  amount      Decimal @db.Decimal(14,2) @default(0)
  currency    String  @default("USD")
  expectedCloseDate DateTime?
  closedAt    DateTime?
  lostReason  String?
  source      String?
  position    Float   @default(0)   // ordering within a stage column
  customFields Json   @default("{}")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  pipeline Pipeline @relation(fields: [pipelineId], references: [id])
  stage    Stage    @relation(fields: [stageId], references: [id])
  company  Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)
  contacts DealContact[]
  stageEvents DealStageEvent[]

  @@index([workspaceId, deletedAt])
  @@index([workspaceId, stageId, position])
  @@index([workspaceId, expectedCloseDate])
}

model DealContact {
  dealId    String
  contactId String
  isPrimary Boolean @default(false)

  deal    Deal    @relation(fields: [dealId], references: [id], onDelete: Cascade)
  contact Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@id([dealId, contactId])
}

/// Append-only. This table is what makes real reporting possible
/// (velocity, conversion by stage, time-in-stage). Never update or delete rows.
model DealStageEvent {
  id          String @id @default(cuid())
  workspaceId String
  dealId      String
  fromStageId String?
  toStageId   String
  amount      Decimal @db.Decimal(14,2)
  changedById String?
  createdAt   DateTime @default(now())

  deal Deal @relation(fields: [dealId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@index([dealId, createdAt])
}

// ---------- Work & audit ----------
model Activity {
  id          String @id @default(cuid())
  workspaceId String
  type        ActivityType
  title       String
  body        String?      @db.Text
  dueAt       DateTime?
  completedAt DateTime?
  assigneeId  String?
  createdById String?
  dealId      String?
  companyId   String?
  contactId   String?
  createdAt   DateTime @default(now())

  @@index([workspaceId, dueAt])
  @@index([workspaceId, dealId])
}

enum ActivityType { NOTE TASK CALL MEETING EMAIL }

model CustomFieldDef {
  id          String @id @default(cuid())
  workspaceId String
  entity      String        // "deal" | "company" | "contact"
  key         String
  label       String
  type        FieldType
  options     Json?         // for SELECT
  position    Int @default(0)

  @@unique([workspaceId, entity, key])
}

enum FieldType { TEXT NUMBER CURRENCY DATE SELECT MULTISELECT BOOLEAN URL }

model SavedView {
  id          String @id @default(cuid())
  workspaceId String
  createdById String?
  entity      String
  name        String
  filters     Json   @default("{}")
  sort        Json   @default("{}")
  columns     Json   @default("[]")
  isShared    Boolean @default(false)

  @@index([workspaceId, entity])
}

model ApiKey {
  id          String @id @default(cuid())
  workspaceId String
  name        String
  hashedKey   String @unique     // store SHA-256, show plaintext once
  prefix      String             // first 8 chars, for display
  lastUsedAt  DateTime?
  revokedAt   DateTime?
  createdAt   DateTime @default(now())

  @@index([workspaceId])
}

model AuditLog {
  id          String @id @default(cuid())
  workspaceId String
  actorId     String?
  action      String     // "deal.stage_changed"
  entity      String
  entityId    String
  metadata    Json @default("{}")
  createdAt   DateTime @default(now())

  @@index([workspaceId, createdAt])
}
```

**Soft delete:** anything with `deletedAt` is never hard-deleted from the UI.
A cron route purges rows older than 30 days.

---

## 5. Multi-tenancy — the single most important thing in this codebase

Every data leak in a B2B SaaS comes from a missing tenant filter. Enforce it
structurally, not by remembering.

Create `src/server/tenancy.ts`:

```ts
export async function requireWorkspace(slug: string, minRole: Role = "VIEWER") {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, workspace: { slug, deletedAt: null } },
    include: { workspace: true },
  });
  if (!membership) notFound();               // 404, never 403 — don't leak existence
  if (!hasRole(membership.role, minRole)) throw new ForbiddenError();
  if (membership.workspace.status === "SUSPENDED") redirect(`/${slug}/settings/billing`);

  return { session, membership, workspace: membership.workspace };
}
```

**Rules Claude Code must follow without exception:**

- Every server action and every `/api/v1` handler starts with `requireWorkspace()`
  (or `requireApiKey()`), and every subsequent Prisma query includes
  `workspaceId: workspace.id` in its `where`.
- Never trust an ID from the client. If the client sends `dealId`, the query is
  `where: { id: dealId, workspaceId: workspace.id }`. Always both.
- Write a Vitest suite `tenancy.test.ts` that seeds two workspaces and asserts
  that every service function returns nothing for a foreign ID. This suite must
  grow with every new service.
- Additionally enable Postgres **row-level security** on the tenant tables as a
  second net. Document the setup in `docs/rls.md`.

---

## 6. Design direction — how we avoid looking like a copy

Twenty's look is light, gray, dense, table-first, blue accent, Inter. **Do the
opposite.** Pipeboard is a **dark-first "control room"**:

- **Surface:** near-black base (`#0B0D10`), elevated panels at `#141820`,
  hairline borders at 8% white. Light theme exists but is secondary.
- **Accent:** warm amber/copper (`#E8A33D`) for primary actions and won-state.
  Cool slate for neutral. Red only for destructive and lost-state.
- **Type:** display/headings in a geometric sans with personality
  (Satoshi, or General Sans); body and numbers in **Geist Mono** for tabular
  figures. Never Inter as the primary.
- **Density:** generous — 44px row height, 16px base, real whitespace. Twenty is
  cramped; we are calm.
- **Navigation shape:** **board-first, not table-first.** The default landing is
  the Kanban pipeline, not a record grid. Tables are a secondary view.
- **Motion:** Framer Motion `layoutId` for card→detail transitions, spring
  physics on drag-drop, staggered fade-up on dashboard cards. 200–300ms,
  `ease: [0.22, 1, 0.36, 1]`. Respect `prefers-reduced-motion`.
- **Signature detail:** every deal card carries a thin "heat bar" whose fill and
  hue encode days-in-stage vs. that stage's median. This is a Pipeboard idea and
  becomes the product's visual signature.

Put all tokens in `src/app/globals.css` as CSS variables consumed by Tailwind v4
`@theme`. No hardcoded hex in components.

Accessibility is a requirement, not a phase: WCAG AA contrast, visible focus
rings, full keyboard operation of the Kanban (arrow keys move focus, space picks
up, arrows move, space drops), and `aria-live` announcements on stage change.

---

## 7. Milestones

Complete these in order. Stop and report at each checkpoint.

### M0 — Foundation
Scaffold Next.js 15 + TS strict + Tailwind v4 + Prisma. Design tokens and the
`components/ui` primitive set (Button, Input, Select, Dialog, Sheet, Dropdown,
Toast, Badge, Avatar, Tooltip, EmptyState, Skeleton). Storybook optional; a
`/kitchen-sink` route in dev is enough. ESLint + Prettier + Husky pre-commit.
CI on GitHub Actions: typecheck, lint, unit tests.

**Accept:** `pnpm build` clean, zero TS errors, `/kitchen-sink` renders every
primitive in both themes.

### M1 — Auth & tenancy
Auth.js with Resend magic link + Google. Signup flow creates User → Workspace →
Membership(OWNER) in one transaction. Workspace switcher. Invite by email with
tokenized accept. `requireWorkspace()` + `permissions.ts` role matrix. RLS
policies applied. Seed script creates two demo workspaces with realistic data
(≈60 companies, 150 contacts, 80 deals across stages — use `@faker-js/faker`).

**Accept:** the cross-tenant Vitest suite passes; a Playwright test signs up,
invites a second user, and that user cannot reach the first workspace's URL.

### M2 — CRM records
Companies, Contacts, Deals: list, detail, create, edit, soft-delete, restore.
TanStack Table with column visibility, multi-sort, filter chips, pagination
(cursor-based), and inline editing on the grid. Global command palette (⌘K) for
search and navigation. Record detail = left summary panel, center tabs
(Overview / Activity / Deals / Files), right context rail.

**Accept:** a record can be created, edited inline, deleted, and restored
entirely by keyboard.

### M3 — Pipeline
Kanban board with dnd-kit. Columns = stages, cards = deals, drag between stages
writes a `DealStageEvent` and an `AuditLog` row in one transaction. Optimistic
UI with rollback on failure. Column headers show count + summed value + weighted
value. Multiple pipelines; stage CRUD in settings with drag-to-reorder and
probability editing. Won/Lost dialogs (Lost requires a reason).

**Accept:** dragging 100 deals stays at 60fps; refreshing shows the same order;
a forced server error rolls the card back and shows a toast.

### M4 — Activities & timeline
Notes, tasks, calls, meetings attached to any record. Task list with due
today / overdue / upcoming. `@mention` teammates in notes → in-app notification
+ email. Unified reverse-chronological timeline on each record, merging
activities, stage events, and field changes from the audit log.

**Accept:** a note mentioning a teammate produces a notification and an email.

### M5 — The dashboard (the product's headline)
`/[workspace]/dashboard` — the screen a buyer sees in the demo. It must look
sharp and load in under one second.

Widgets:
1. **KPI row** — pipeline value, weighted forecast, deals won MTD, win rate,
   average deal size, average sales cycle. Each with sparkline and
   period-over-period delta.
2. **Forecast vs. quota** — bar + line, current quarter, with a
   commit / best-case / pipeline breakdown.
3. **Funnel** — count and value per stage with conversion % between stages,
   computed from `DealStageEvent`.
4. **Velocity** — median days-in-stage per stage; flags stages that slowed.
5. **Leaderboard** — per-owner won value, win rate, activity count.
6. **At-risk deals** — deals whose days-in-stage exceed 1.5× that stage's median,
   or whose expected close date has passed. This is the widget that sells.
7. **Activity heatmap** — 12-week calendar of logged activity.

All widgets respect a shared filter bar (date range, pipeline, owner) held in
URL search params so views are shareable. Compute in SQL via Prisma
`$queryRaw` with parameterised inputs; do not pull rows into JS to aggregate.
Cache with `unstable_cache`, 60s TTL, tagged by workspace.

`/[workspace]/reports` gets the same engine with CSV and PDF export.

**Accept:** dashboard TTFB under 400ms on the seeded 80-deal workspace; every
number is verifiable by hand against seed data (write a test that does this).

### M6 — Monetisation
Stripe Checkout for STARTER / GROWTH / SCALE, monthly and annual. Billing portal
link. Webhook handler (signature-verified, idempotent via a processed-events
table) for `checkout.session.completed`, `customer.subscription.updated`,
`.deleted`, `invoice.payment_failed`. Plan limits enforced in a single
`limits.ts` (seats, deals, pipelines, API calls) with graceful upgrade prompts
at the limit, never a hard crash. 14-day trial, no card. Dunning emails.

**Accept:** Stripe CLI-driven test of the full lifecycle — subscribe, upgrade,
fail payment → `PAST_DUE`, recover, cancel → `CANCELLED` and read-only access.

### M7 — Owner admin control room
`/admin`, gated on `isPlatformAdmin`, separate layout.
MRR / ARR, new signups, trial→paid conversion, churn, workspace list with plan,
seats, last-active, deal count. Drill into a workspace: view (never edit) its
stats, suspend, extend trial, comp a plan. Impersonation is allowed **only** with
an explicit reason logged to `AuditLog` and a persistent banner in the UI.

**Accept:** admin routes return 404 for non-admins; impersonation always leaves
an audit trail.

### M8 — Public API, import/export, polish
`/api/v1` REST for companies, contacts, deals, activities. Bearer auth against
hashed `ApiKey`, rate-limited per key (Upstash Redis or Postgres token bucket).
OpenAPI 3.1 spec at `/api/v1/openapi.json` + a docs page. Outbound webhooks on
`deal.created`, `deal.stage_changed`, `deal.won`. CSV import with column mapping
and a dry-run preview; CSV export of any saved view.

Polish pass: loading skeletons everywhere, real empty states with a CTA, error
boundaries, 404/500 pages, Sentry wired, PostHog events on activation
milestones, marketing site (`/`, `/pricing`, `/legal/terms`,
`/legal/privacy`), OG images, sitemap, robots.

**Accept:** Lighthouse ≥ 95 on the marketing site; Playwright suite green;
a fresh `pnpm install && pnpm db:push && pnpm db:seed && pnpm dev` works from a
clean clone with only `.env.example` filled in.

---

## 8. Standing engineering rules

- TypeScript `strict: true`. No `any`. No `@ts-ignore` without a comment
  explaining why and a linked TODO.
- Every server action: `requireWorkspace()` → Zod parse → service call →
  `revalidatePath`/`revalidateTag`. Return a discriminated
  `{ ok: true, data } | { ok: false, error }`, never throw to the client.
- Money is `Decimal` in the DB and integer minor units in JS. Never float.
- All timestamps stored UTC; render in the user's timezone.
- Secrets only in `.env`; `.env.example` committed with every key present and
  blank. Never log a secret, token, or full email body.
- Rate-limit auth endpoints (5 attempts / 15 min / IP).
- Sanitise any user HTML before render (notes are rich text).
- Write a test with the feature, not after. Minimum: every service function has
  a happy path, a validation-failure path, and a cross-tenant-denial path.
- Commits: conventional commits, one milestone per branch, PR into `main`.
- Keep `docs/DECISIONS.md` — append a short entry whenever you make a
  non-obvious architectural choice, so the owner can follow the reasoning later.

## 9. When to stop and ask

Ask the owner rather than guessing if: a milestone's acceptance criteria are
ambiguous; a third-party account or key is missing; a choice would cost money;
or you believe a spec decision here is wrong. Say what you'd do instead and why.
