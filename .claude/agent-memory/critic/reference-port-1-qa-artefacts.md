---
name: reference-port-1-qa-artefacts
description: Where port-1's rendered evidence lives, and the exact PATH incantation every node command on this machine needs
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
concurrently; they race on `.next/types`.

Playwright + Chromium + Pillow: `~/.claude/skills/seo/.venv/bin/python`.
ImageMagick is **not** installed — use Pillow for any image inspection.

**port-1 QA artefacts** (`projects/port-1/qa/`):

- `screenshots/` — 133 PNGs. Naming: `crop_hero_*` and `home_*` at
  375/768/1024/1440; `focus_00`…`focus_44` (keyboard pass, unlabelled — you
  cannot tell which element was focused, so re-drive it yourself);
  `reduced_motion_y0`…`y7500`; `nojs_*`; `m375_scroll_*` and `scroll_*`
  (viewport shots at scroll offsets — these are the useful ones, since
  full-page `home_*` shots capture scroll-reveal elements at opacity 0 and look
  misleadingly blank); `dbg_seg*`; `privacy_*`, `terms_*`.
- `lighthouse/` — `home.report.json` is **before** fixes,
  `home-after-fixes.report.json` is **after**. Read the latter. It also carries
  `largest-contentful-paint-element` with the DOM path, which is the field that
  actually matters for the LCP trap.

Governing docs sit at the project root: `BRIEF-01-BUILD.md` (why),
`01-BUILD-SPEC.md` (what; §10 is the acceptance checklist), and
`.claude/ENGINEERING-NOTES.md` at the repo root (recurring failures).

Related: [[project-port-1-swipe-and-scale]],
[[feedback-verify-rendered-output-not-source]]
