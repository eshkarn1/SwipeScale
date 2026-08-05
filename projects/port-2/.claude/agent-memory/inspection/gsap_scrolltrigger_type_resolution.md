---
name: gsap-scrolltrigger-type-resolution
description: gsap@3.13.0's ambient types for `gsap/ScrollTrigger` (and other subpath plugin imports) only load if something in the program also imports from the bare "gsap" module first — otherwise tsc reports TS7016 even though .d.ts files exist and no @types/gsap package is needed.
metadata:
  type: project
---

`import { ScrollTrigger } from "gsap/ScrollTrigger"` fails to typecheck on its
own under `moduleResolution: "bundler"` (tsconfig matching port-1/port-2),
with:

```
error TS7016: Could not find a declaration file for module 'gsap/ScrollTrigger'.
```

...even though gsap ships real types and no `@types/gsap` package exists (it
would conflict). Verified in `/Users/eshkarnsingh/Desktop/P1/projects/port-2/`
on 2026-08-05 against gsap@3.13.0.

**Root cause:** gsap's `package.json` has no `exports` map and no
`typesVersions`; its `types` field points only at `types/index.d.ts`. That
file pulls in every plugin's ambient `declare module "gsap/ScrollTrigger" {...}`
via `/// <reference path="scroll-trigger.d.ts"/>` — but TypeScript only loads
`index.d.ts` (and therefore those references) when something in the compiled
program actually resolves the bare `"gsap"` specifier. A file that imports
`gsap/ScrollTrigger` alone, without ever importing from `"gsap"` itself, never
triggers that chain, so the ambient declaration is never in scope.

**Fix:** always import `gsap` itself (even just `import "gsap"` or
`import { gsap } from "gsap"`) somewhere in the same compiled program before
or alongside any subpath plugin import (`gsap/ScrollTrigger`,
`gsap/ScrollSmoother`, etc.). This resolved cleanly with zero tsc errors.

**Why this matters:** the motion engine (see `[[project-port2-gate1-findings]]`)
will import `gsap/ScrollTrigger` directly in scroll-linked animation code —
whichever specialist writes that loader needs the `gsap` core import present
in the same file or a shared entry point, or the whole module will fail
typecheck with an error that reads like a missing-types problem and invites
someone to reach for `@types/gsap` (which doesn't exist / isn't needed) or
`skipLibCheck` workarounds instead of the one-line real fix.

**How to apply:** when reviewing or scaffolding any file that imports a GSAP
plugin subpath, check that the same file (or something it depends on) also
imports from bare `"gsap"`. Flag it if not — this will otherwise surface as a
confusing typecheck failure well into feature work.
