---
name: p11-package-json-overwritten
description: A pinned package.json was silently overwritten mid-task with forbidden versions and installed — always re-read the manifest and pnpm list after any install
metadata:
  type: project
---

During P11 Gate 1 (2026-08-05) a hand-authored, fully pinned `package.json` was
**overwritten by something other than me, mid-task**, and an install ran against
it. The replacement contained exactly the versions the lead had researched and
forbidden: `eslint ^10.8.0` (outside `eslint-config-next`'s peer range),
`eslint-config-next ^16.3.0`, `typescript ^7.0.2`, and floating `next: "15"` /
`react: "19"` instead of pins. It also dropped `"type": "module"` and every test
and Prisma dependency.

It was caught only because an unrelated command crashed with
`Error: typescript-eslint does not support TS 7.0.` — i.e. the poisoned tree
announced itself by accident, not by any check.

**Why this matters:** a green `pnpm install` earlier in a session is not
evidence that the tree is still correct later in that session. `node_modules`
and `pnpm-lock.yaml` had both been rewritten. Recovery needed
`rm -rf node_modules pnpm-lock.yaml` and a reinstall from the restored manifest.

**How to apply:** before reporting versions or a green build, re-read
`package.json` from disk and read resolved versions from the installed tree
(`pnpm list --depth 0`), never from ranges and never from memory of what you
wrote. If a forbidden version appears in `node_modules/.pnpm`, the lockfile is
poisoned too — nuke both rather than reinstalling on top.

Related: [[p11-lightline-gate1]]
