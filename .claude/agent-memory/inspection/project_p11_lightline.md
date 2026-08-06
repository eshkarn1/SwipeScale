---
name: p11-lightline-gate1
description: P11/Lightline (real-estate SaaS CRM) — M0 toolchain decisions that were settled empirically at Gate 1, and the owner decisions still open
metadata:
  type: project
---

`projects/../P11/` is **Lightline**, a multi-tenant real-estate CRM. Its specs
live in `P11/docs/BUILD_SPEC.md` (written against the old name "Pipeboard") and
`P11/docs/DECISIONS.md` (which renames it to Lightline and sets the real-estate
buyer). **Where the two disagree, DECISIONS is newer and wins** — notably
DECISIONS §7 cuts the public API that BUILD_SPEC scopes at M8.

**Why:** BUILD_SPEC was not rewritten after the scoping decisions landed, so it
still describes a generic sales CRM under a dead name.

**How to apply:** read both before acting on either. Do not create
`src/app/api/v1/` — it is cut. The `ApiKey` model is kept deliberately so
exposing an API later is an auth problem, not a migration.

Settled at Gate 1 by measurement, not preference:

- **Prisma 7.9.1**, not 6.x. ESM (`"type": "module"`), generator
  `prisma-client` with a required `output`, connection URL in
  `prisma.config.ts`. The reported "Cannot find module '.prisma/client/default'"
  Turbopack failure did **not** reproduce, because v7 generates outside
  `node_modules`.
- **TypeScript 6.0.3.** TS 6 raises `TS2882` on side-effect CSS imports and
  Next 15 ships no `*.css` declaration; fixed with a real ambient declaration,
  not a suppression. TS 5.9.3 was measured as an equally green fallback if
  TS 6 ever becomes a problem.

**Blocking owner decisions (from DECISIONS, still open as of 2026-08-05):**
`uselightline.com` is not confirmed registered and the CIPO/USPTO trademark
searches are not done — DECISIONS §1 says commission no brand or logo work until
they come back clean. No Postgres is provisioned and no US region is chosen.

See [[p11-package-json-overwritten]] for the Gate 1 incident.
