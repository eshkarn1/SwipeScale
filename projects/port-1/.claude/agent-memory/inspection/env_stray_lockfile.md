---
name: env-stray-lockfile
description: An unrelated package-lock.json in the user's home directory makes next build misdetect the workspace root — fixed via outputFileTracingRoot, not by touching the home dir file
metadata:
  type: project
---

`/Users/eshkarnsingh/package-lock.json` is a leftover lockfile from an unrelated personal project (deps: axios, bootstrap, express, mongoose — nothing to do with port-1). It sits above `projects/port-1` in the directory tree.

**Why it matters:** Next.js 15.5's build walks upward looking for lockfiles to infer the workspace root for file tracing. Finding both `~/package-lock.json` and `port-1/pnpm-lock.yaml`, it picked the home directory as root and printed a "multiple lockfiles" warning on every `next build`. This is a real warning, not noise — wrong tracing root can break `output: 'standalone'` / serverless bundling later.

**How to apply:** do NOT delete or touch the home-directory lockfile — it's outside project scope (a sibling/personal file, not port-1's). Fix it in `next.config.ts` instead, which is config territory:

```ts
outputFileTracingRoot: path.join(__dirname),
```

This is already applied in `port-1/next.config.ts` and confirmed to silence the warning on a clean rebuild (`rm -rf .next && pnpm build`). If a future build in a *different* project on this machine shows the same "Detected additional lockfiles" warning pointing at `~/package-lock.json`, apply the same fix there rather than assuming it's a real monorepo misconfiguration.

Related: [[env_node20_pnpm]]
