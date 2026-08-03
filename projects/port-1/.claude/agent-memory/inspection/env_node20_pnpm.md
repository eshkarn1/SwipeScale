---
name: env-node20-pnpm
description: How to get Node 20 + pnpm working together on this machine for port-1 (corepack shim lives on the Node 24 path only)
metadata:
  type: project
---

`corepack enable` / `corepack prepare pnpm@10.34.5 --activate` only installs the `pnpm` shim into the bin directory of whichever Node version ran the command. On this machine that's `$HOME/.nvm/versions/node/v24.16.0/bin/pnpm` — it does NOT appear under the Node 20 install (`$HOME/.nvm/versions/node/v20.20.2/bin`) even after activation.

**Why:** port-1's spec (`01-BUILD-SPEC.md` §2) pins Node 20 LTS as the runtime, but pnpm was only ever shimmed under Node 24. Prepending only the Node 20 bin dir to PATH gives a working `node -v` (20.20.2) but `pnpm: command not found`.

**How to apply:** use a combined PATH with Node 20 listed first (so `node` resolves to 20.20.2) and Node 24's bin dir listed second (so the `pnpm` shim resolves) for every command in this project:

```
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
```

The pnpm shim script itself just does `#!/usr/bin/env node`, so it runs under whichever `node` is first on PATH — Node 20 in this case — which satisfies pnpm's own engine requirement. Verified: `node -v` → v20.20.2, `pnpm -v` → 10.34.5, both resolving correctly from this combined PATH. Confirmed working for `pnpm install`, `pnpm typecheck` (tsc --noEmit), and `pnpm build` (next build) in the port-1 project as of 2026-08-03.

Related: [[env_stray_lockfile]]
