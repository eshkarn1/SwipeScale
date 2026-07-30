# Project Brief — AI Agent Studio

**Status:** assigned, active
**Assigned:** 2026-07-30
**Project root:** `projects/ai-agent-studio/`
**Source of truth:** this file. The client's words are quoted below; everything
else in this document is interpretation and may be revised by the team lead.

---

## The client's brief, verbatim

> The Project is AI Agent Development Website. On the website we have a list of
> Ai Agents Developed and they work the best they can. we will create Ai Agents
> Teams as well on this. The website should show that the team that created the
> website is best in Web Development. the Team should know everything that is
> going on around the world in Web Dev so that it works best in everything.

---

## What this site is

A website for an AI agent development studio. It has two jobs, and the second
one is the hard one:

1. **Present the agents.** A browsable directory of the AI agents this studio
   has built — what each one does, what it is good at, how it performs.
2. **Prove the studio's craft.** The site is the portfolio. A visitor should
   conclude "these people are exceptional at web development" from the
   experience of using the site, before reading a single claim about it. Stated
   claims of excellence are worth nothing here; the execution is the argument.

## Required features

### 1. Agent directory
A list or gallery of developed agents. Each agent needs a detail view covering
what it does, its specialty, the tools it has, and what it is good at. Needs to
work well at 5 agents and at 50 — so browsing, filtering, and search matter.

### 2. Agent teams
Agents compose into teams with a lead and specialists beneath it. The site must
show these team structures — the hierarchy, who reports to whom, who hands off
to whom — as something visual and explorable, not a bulleted list. Delegation
and approval flows are part of what makes a team interesting; show them.

### 3. The proof-of-craft layer
This is what separates the site from a template. Open to interpretation, but it
must be *demonstrated*, not asserted.

## The honest starting content

The studio's real first team is the one building this site. It lives in
`.claude/agents/` at the repo root — read those eight files, they are the
initial content:

| Agent | Role |
|---|---|
| `team-lead` | Orchestrator; plans, delegates, integrates. Cannot edit files. |
| `critic` | Reviews every artifact; gates all work; owns project READMEs. |
| `frontend-dev` | R3F canvas, app architecture, routing, performance. Leads two specialists. |
| `ui-builder` | DOM components, layout, responsive, typography, accessibility. |
| `motion-designer` | All DOM animation via Motion. |
| `backend-dev` | APIs, data, persistence, asset delivery. |
| `graphics-designer` | 2D assets. Gets each approved by `critic`. |
| `threed-artist` | 3D models and web optimization. Gets each approved by `critic`. |

Two structural details worth surfacing in the UI, because they are unusual and
true: the lead holds **no edit tools at all**, and the two asset agents run
their **own approve/reject loop** with the critic before anything ships.

Use real data from these files. Do not invent agents, fabricate benchmark
numbers, or write fake testimonials — a directory of made-up agents with made-up
metrics undermines the exact claim the site exists to make. Where a real metric
does not exist, design the UI so the absence is not a hole.

## Constraints

- **Scope:** all work stays inside `projects/ai-agent-studio/`. Never touch a
  sibling project or the repo root, except to *read* `.claude/agents/` for
  content.
- **Stack:** team lead decides, after verifying current versions by search.
  Default is Vite + React + TypeScript + React Three Fiber + drei unless
  research says otherwise.
- **Performance is a feature here.** A studio claiming web-dev excellence
  cannot ship a janky site. Budget: interactive in under 3s on a mid-range
  laptop, 60fps on the hero scene, and a documented graceful path for weak GPUs
  and no-WebGL. Measure these; do not assume them.
- **Accessibility is not optional.** Full keyboard operability, real focus
  states, 4.5:1 contrast on body text, and a genuine `prefers-reduced-motion`
  path. A 3D portfolio that hurts people to use is a failed portfolio.
- **Mobile matters.** Assume a weak GPU and a 320px floor.
- **No fabrication anywhere** — not in metrics, not in logos, not in
  testimonials, not in client lists.

## Definition of done for v1

- Builds clean; typecheck and lint pass
- Agent directory renders all eight real agents with working detail views
- At least one team structure is visually explorable
- The hero establishes craft immediately
- Runs at 320px and at desktop, keyboard-navigable, reduced-motion respected
- No console errors on any route
- `critic` has returned **APPROVED**
- README written by `critic` and accurate, with verified commands

## Open questions for the client

Do not block on these; pick a sensible default, build, and flag the assumption.

1. Is a real backend needed for v1, or is static content from the agent files
   enough? (Default assumed: static first.)
2. Studio name and any existing brand — none supplied. (Default: treat "AI
   Agent Studio" as a working title, keep branding easy to swap.)
3. Should visitors be able to *compose* a team in the UI, or only view teams?
   (Default: view for v1, designed so composing can be added.)
