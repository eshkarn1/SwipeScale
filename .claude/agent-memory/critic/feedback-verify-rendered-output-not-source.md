---
name: feedback-verify-rendered-output-not-source
description: The lead expects measured evidence, not reasoning from source — run the browser yourself rather than trusting screenshots you cannot label
metadata:
  type: feedback
---

Measure it in a real browser yourself; do not reason about appearance from
source, and do not treat an unlabelled screenshot as evidence of what it shows.

**Why:** the studio has shipped a colour-flooded 3D object, a graphic colliding
with a headline, a duplicate brand string, a 2876ms LCP and a contrast failure
on every card border — all through multiple review rounds — because reviewers
read code instead of output. On port-1 the lead explicitly pre-verified
Lighthouse, the JS budget, console errors, build/typecheck and the dependency
greps, and handed over only the items nobody had *looked at*. That is the
division of labour they want.

**How to apply:** in this repo Playwright + Chromium are at
`~/.claude/skills/seo/.venv/bin/python` (Pillow 12 is in the same venv). Start
the production build on a spare port and drive it. What this actually caught on
port-1, none of it visible from source:

- Tab through and dump `document.activeElement` + its computed `outline` and
  `getBoundingClientRect` per stop. This turns 45 unlabelled `focus_NN.png`
  files into a definite "21 stops, all reachable, all ringed" — the raw
  screenshots could not tell you *which* element was focused.
- Walk every text node, composite `rgba` against the nearest opaque ancestor
  background, compute the ratio. Reports "0 failures" honestly rather than by
  eyeballing.
- `document.documentElement.scrollWidth === innerWidth` at 375 is the whole
  horizontal-overflow check.
- `PerformanceObserver` for `largest-contentful-paint` and read `.element` —
  the identity matters more than the number.
- For a fixed overlay: scroll in steps and `document.elementsFromPoint` under
  its centre. Found the signature readout printing over copy at 10 of 25 offsets
  at 375; no static screenshot set would have quantified that.
- Two screenshots 1.5s apart at the same offset, compared as bytes, proves
  "no motion" under `reduced_motion='reduce'`.
- Extract rendered HTML text and assert every spec string is a substring.
  Verbatim sales copy is checkable, so check it rather than skimming.

Related: [[project-port-1-swipe-and-scale]], [[reference-port-1-qa-artefacts]]
