---
name: project-port-1-swipe-and-scale
description: port-1 is the Swipe & Scale studio marketing site — a sales asset on a two-week clock; ship-over-polish is the brief, and one WCAG finding is deliberately escalated rather than fixed
metadata:
  type: project
---

`projects/port-1/` is the Swipe & Scale marketing site: a one-person motion-led
web design studio's own portfolio + sales page + product demo, in one page.
Business goal is 2–3 paying clients within 90 days of launch.

**Why:** the brief (`BRIEF-01-BUILD.md`) states the hardest constraint is not
technical — the client can build indefinitely and will, given the chance. "A
shipped B+ site beats an unshipped A+ site by an enormous margin here."

**How to apply:** the priority order the brief gives is perceived craft > speed
to ship > performance > conversion, and "when two conflict, higher number
loses." A craft defect on the page's signature moment outranks a shipping delay;
a nice-to-have refactor does not. Do not pad reviews here — cut scope, never
quality.

Work is split across three agents: Script 1 owns the build and `components/`,
Script 2 owns `components/motion/` (the canvas frame engine), Script 3 owns
`public/seq/` (the frames).

**State as of 2026-08-05:** the §9 placeholder protocol is finished — 904 real
rendered WebP frames are tracked in git, produced by `scripts/render-frames.py`
and proven by `scripts/verify-frames.py`. "The hero looks like a placeholder" is
no longer an available excuse.

**One finding is deliberately open, not forgotten:** all borders use
`--color-slate` at **1.46:1** on void, which fails WCAG 1.4.11's 3:1 floor for
form fields whose only boundary is a bottom border. Spec §4 says the token is
not to be adjusted, so the lead escalated it as a spec decision rather than
silently changing it. Do not re-report it as an unaddressed defect; do treat the
framing carefully — the conflict is spec-vs-WCAG, not §4-vs-§6.7, since §8's
accessibility floor never states a non-text contrast requirement.

Related: [[feedback-verify-rendered-output-not-source]],
[[reference-port-1-qa-artefacts]]
