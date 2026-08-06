# Local Postgres

No hosted Postgres is provisioned (BUILD_SPEC §2 says Neon or Supabase for
production; DECISIONS has no region/provider chosen yet, and §9 rules out
signing up for a paid service without asking first). This is the **local**
setup used for dev and for the test suite, on a machine that has Homebrew but
not Docker.

## Why a dedicated instance on a non-default port

This machine already runs a system-wide Postgres 17 on the default port
5432, installed and owned by other work on this machine — not something to
share or collide with. `postgresql@16` was installed via Homebrew and
started on **port 5433** instead, entirely isolated from anything else:

```bash
brew install postgresql@16
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
pg_ctl -D /opt/homebrew/var/postgresql@16 -o "-p 5433" -l /opt/homebrew/var/log/postgresql@16.log start
```

Check it's up: `pg_isready -p 5433`.

To stop it: `pg_ctl -D /opt/homebrew/var/postgresql@16 stop`.

`brew services start postgresql@16` (the normal way) does **not** work here
— it starts on the default port 5432 and immediately collides with the
existing Postgres 17 instance. Use `pg_ctl` with an explicit `-p 5433` as
above, not `brew services`.

## Roles and databases

Created once, as the local Postgres superuser (the machine user, via the
default trust-authenticated Unix socket):

```sql
CREATE ROLE lightline WITH LOGIN PASSWORD 'lightline_dev_pw' CREATEDB;
CREATE DATABASE lightline_dev OWNER lightline;
CREATE DATABASE lightline_test OWNER lightline;
```

A second role, `lightline_app`, exists for row-level-security verification
only — see `docs/rls.md`. It is not what the app connects as today.

## Env files

- `.env` → `DATABASE_URL="postgresql://lightline:lightline_dev_pw@localhost:5433/lightline_dev"`
- `.env.test` → same, pointed at `lightline_test`

Both are gitignored (`.env.example` is the only committed one, and it's
blank — BUILD_SPEC §8). `vitest.setup.ts` loads `.env.test` before any test
file runs, so `pnpm test` always talks to `lightline_test`, never `lightline_dev`.

## Migrating and seeding

```bash
pnpm db:generate                      # regenerate the Prisma client (src/generated/, gitignored)
pnpm exec prisma migrate dev          # apply migrations to lightline_dev (reads .env)
DATABASE_URL=".../lightline_test" pnpm exec prisma migrate deploy   # same migrations, test DB
pnpm db:seed                          # demo data into whatever .env points at
```

`pnpm db:seed` runs `tsx --env-file=.env prisma/seed.ts` specifically — Node's
`--env-file` loads the env file before any module evaluates, which matters
here: a plain `import "dotenv/config"` inside `seed.ts` would run too late,
because ES module imports are hoisted and evaluated before the importing
module's own top-level code, including a `dotenv.config()` call sitting
above them in the source. Confirmed by running the seed script directly
with `DATABASE_URL` unset and only the in-file `dotenv` call to rely on: it
threw immediately, which is why the script is invoked with `--env-file`
instead.

## What's seeded

Two workspaces, one real-estate and one generic B2B, each with ~60
companies, ~150 contacts, ~80 deals, a full pipeline, and three memberships
(owner + 2). See `prisma/seed.ts` for the exact shape and
`docs/DECISIONS.md` §9 for why the deal counts are per-workspace, not split
across the two.

No `RESEND_API_KEY` is configured, so signing in as any seeded owner email
(e.g. `owner@vertex-realty.test`) writes the magic-link email to
`.local/dev-inbox/` instead of sending it — see `src/server/email.tsx`.
