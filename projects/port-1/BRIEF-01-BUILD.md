# BRIEF — Agent 01: Build

Read this before `01-BUILD-SPEC.md`. This tells you *why*. The spec tells you *what*.

---

## Shared context

**Client:** Swipe & Scale — a one-person motion-led web design studio.
**This project:** the studio's own marketing site. It is simultaneously the portfolio, the sales page, and the product demo.
**Business goal:** book 2–3 paying clients within 90 days of launch.
**Ship date pressure:** this must be live in two weeks. It is not a masterpiece project. It is a sales asset that needs to exist.

The hardest constraint on this project is not technical. It is that the client can build indefinitely and will, given the chance. **A shipped B+ site beats an unshipped A+ site by an enormous margin here.** If you are ever choosing between polish and shipping, ship.

---

## Your mission

Build a single-page site that makes a visitor's first thought be *"whoever built this is good"* — before they read a single word.

That's the whole job. The site is selling the ability to build sites that feel expensive. So the site itself is the proof. A well-written page describing motion expertise is worth nothing; a page that *demonstrates* it closes the deal.

## What success looks like

A prospect lands, watches the hero resolve, scrolls, sees a price, and emails. No call to find out cost. No proposal document. The page does the qualifying.

Concretely:
- Hero holds attention for 3+ seconds before any text is read
- Prices are visible without clicking anything
- Nothing feels templated — not the type, not the layout, not the copy
- It's fast enough that nobody notices it's heavy

## What you're optimising for, in order

1. **Perceived craft.** Spacing, type, timing. The 5px that makes it look considered.
2. **Speed to ship.** Two weeks. Cut scope, never quality.
3. **Performance.** A slow motion site is an argument against hiring us.
4. **Conversion.** Prices up front, low-friction contact.

When two conflict, higher number loses.

## Non-obvious things that matter

**Restraint is the design.** The spec gives you exactly one signature element — the live frame counter. Everything else stays quiet. Resist adding a custom cursor, magnetic buttons, a marquee, grain overlay, or scroll-triggered everything. Scattered effects are the tell that reads as AI-generated. One orchestrated moment lands harder than ten small ones.

**The copy is not filler.** It's written to do sales work. Ship it verbatim. If a line seems too blunt ("If it isn't a fit, I'll tell you that instead") — that bluntness is deliberate and it converts.

**No `<video>` anywhere.** All motion comes from image sequences on canvas. Agent 02 owns that engine; you consume its component. Don't build a parallel path.

**Contrast trap:** `--color-signal` (#3B4CFF) fails contrast on body text. Borders, focus rings, and large display type only. This will be tempting to violate.

## Guardrails

- Do not add dependencies beyond the stack in §2 of the spec
- Do not add routes, a CMS, a database, or auth
- Do not use `localStorage` or `sessionStorage`
- Do not remove focus outlines
- Do not build against the design tokens "approximately" — use the exact hex and clamp values

## When to stop and ask

Escalate to the client only for: a copy change that alters a claim about the business, a price change, or a case study brand swap. Everything else — resolve it yourself using the spec and ship.

## Handoff

You are done when the acceptance checklist in spec §10 is fully green and there is a deployed staging URL. Hand the URL to Agent 03 for the QA pass. Do not mark complete before Agent 02's motion system is integrated and running against real or placeholder frames.
