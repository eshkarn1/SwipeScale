---
name: project-port-1-swipe-and-scale
description: port-1 is the Swipe & Scale studio marketing site — a sales asset on a two-week clock, not a masterpiece project; ship-over-polish is the explicit brief
metadata:
  type: project
---

`projects/port-1/` is the Swipe & Scale marketing site: a one-person motion-led
web design studio's own portfolio + sales page + product demo, in one page.
Business goal is 2–3 paying clients within 90 days of launch.

**Why:** the brief (`BRIEF-01-BUILD.md`) states the hardest constraint is not
technical — the client can build indefinitely and will, given the chance. "A
shipped B+ site beats an unshipped A+ site by an enormous margin here." Ship
date pressure is two weeks.

**How to apply:** when weighing a finding, the priority order the brief gives is
perceived craft > speed to ship > performance > conversion, and "when two
conflict, higher number loses." So a craft defect on the page's signature
moment outranks a shipping delay, but a nice-to-have refactor does not. Do not
pad reviews here with scope suggestions — cut scope, never quality.

Work is split across three agents: Script 1 owns the build and `components/`,
Script 2 owns `components/motion/` (the canvas frame engine), Script 3 owns
`public/seq/` (the actual frames). Spec §9 authorises shipping against
generated placeholder frames, so "the hero looks like a placeholder" is not by
itself a defect — the missing *composition contract* for the real frames is.

Related: [[feedback-verify-rendered-output-not-source]],
[[reference-port-1-qa-artefacts]]
