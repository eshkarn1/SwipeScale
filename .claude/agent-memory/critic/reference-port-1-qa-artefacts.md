---
name: reference-port-1-qa-artefacts
description: Where port-1's rendered evidence lives, the exact PATH/port incantations, and the two measurement traps that produce false findings
metadata:
  type: reference
---

**Environment.** The shell default `node` is v16 and fails everything. Prepend
this to every single Bash call (shell state does not persist):

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.nvm/versions/node/v24.16.0/bin:$PATH"
```

Node 20 first (projects pin Node 20 LTS), Node 24 second — the `pnpm` shim only
exists under v24. Package manager is pnpm. Never run `build` and `typecheck`
concurrently.

Playwright + Chromium + Pillow + NumPy: `~/.claude/skills/seo/.venv/bin/python`.
ImageMagick is **not** installed. Lighthouse has no global binary — use
`npx --yes lighthouse@12.8.2 <url> --preset=desktop --chrome-flags="--headless=new --no-sandbox"`;
drop `--preset` for the throttled mobile run.

**Server.** The lead usually leaves a production build on **port 3210**. Kill it
with `lsof -ti:3210 | xargs kill -9` — `pkill` does not release the port here.
Confirm the CSS URL in the HTML returns 200 before trusting a measurement.

**Frame assets** (`projects/port-1/`):

```bash
~/.claude/skills/seo/.venv/bin/python scripts/render-frames.py   # writes 904 WebP + 4 posters
~/.claude/skills/seo/.venv/bin/python scripts/verify-frames.py   # safe-area contract, exits non-zero on failure
```

`public/seq/README.md` is the asset contract (safe areas, renditions, encoding).

**port-1 QA artefacts** (`projects/port-1/qa/`):

- `screenshots/` — 133 PNGs, all from earlier rounds and mostly unlabelled.
  Re-drive the browser rather than reading them; `focus_NN.png` in particular
  cannot tell you which element was focused.
- `lighthouse/` — `home-after-critic-fixes.report.json` is the newest. Read
  `largest-contentful-paint-element` for the DOM path, not just the number.

## Two traps that manufacture false findings here

1. **Tailwind v4 emits `oklab()` computed colours.** A contrast script that
   regexes the first three numbers out of `getComputedStyle(el).color` reads
   `oklab(0.92 0.002 0.01 / 0.55)` as RGB `(0.92, 0.002, 0.01)` — near black —
   and reports ~60 phantom failures at ratio 1.03. Resolve colours by painting
   them onto a 1×1 canvas and reading the pixel back. Also multiply in *ancestor*
   opacity only when you mean to; measuring mid-reveal elements gives ratio 1.0.
2. **iCloud conflict forks land inside `.next/types`.** `pnpm typecheck` then
   fails with `Duplicate identifier` in files literally named `routes.d 2.ts`.
   It is not a type error. `rm -rf .next && pnpm build` clears it.

Governing docs sit at the project root: `BRIEF-01-BUILD.md` (why),
`01-BUILD-SPEC.md` (what; §10 is the acceptance checklist), and
`.claude/ENGINEERING-NOTES.md` at the repo root (recurring failures).

Related: [[project-port-1-swipe-and-scale]],
[[feedback-verify-rendered-output-not-source]]
