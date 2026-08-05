---
name: project-port2-gate1-findings
description: GATE 1 scaffold results for port-2 (motion system) — verified stack, pinned versions, and a GSAP ScrollTrigger type-resolution trap discovered during the forward-looking checks.
metadata:
  type: project
---

GATE 1 for port-2 (`/Users/eshkarnsingh/Desktop/P1/projects/port-2/`) passed on
2026-08-05: minimal Next.js scaffold created, `pnpm install` / `pnpm typecheck`
/ `pnpm build` / `pnpm start` all green, matching port-1's pinned stack exactly
(next 15.5.22, react/react-dom 19.2.8, gsap 3.13.0, typescript 5.9.3,
tailwindcss + @tailwindcss/postcss 4.3.3). No peer conflicts, no substituted
versions.

**Why:** port-2 is a from-scratch motion-system build (see
`BRIEF-02-MOTION.md`, `02-MOTION-SYSTEM.md`) that must later merge into
port-1, so stack parity was a deliberate constraint from the lead, not a
default.

**How to apply:** if a later gate or install in port-2 reports a version drift
from the pins above, that is a regression — flag it, don't silently accept a
caret-driven bump. See also [[gsap-scrolltrigger-type-resolution]] for a real
type-resolution gotcha found while proving this scaffold out.
