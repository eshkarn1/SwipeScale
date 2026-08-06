# Roadmap

Things deliberately **not** in v1, and the conditions under which they come back.

Required by `docs/BUILD_SPEC.md` §1, which cuts a specific list of features and
says to note them here rather than silently dropping them. A cut feature with no
written record is indistinguishable from an oversight.

---

## Cut from v1 by BUILD_SPEC §1

Each of these is weeks of work and none is needed to sell v1.

| Feature | Why cut | Revisit when |
|---|---|---|
| Email / calendar two-way sync | Large surface, OAuth scopes per provider, ongoing token maintenance | Real-estate teams live in Gmail and Google Calendar — expect this to be the **first** integration asked for. See §7 of DECISIONS. |
| No-code workflow builder | A product in its own right | Customers describe the same automation three times |
| Plugin marketplace | Requires a stable public API first, which is itself cut | Post-API, post-launch |
| Runtime custom-object schema editing | `CustomFieldDef` already covers custom *fields*, which is the 90% case | A customer needs a whole entity we don't model |
| SAML / SSO | Enterprise-tier concern; our wedge is small teams | First deal blocked on it. It is usually a Scale-tier gate. |
| Mobile native apps | Responsive web covers agents in the field for v1 | Sustained mobile usage data says otherwise |

---

## Cut from v1 by DECISIONS §7 — the public API

BUILD_SPEC scopes a public REST API at M8. DECISIONS §7 cuts it, on the grounds
that real-estate teams are not an API-first buyer: they ask for named
integrations long before they ask for an endpoint. Cutting it ships roughly two
weeks sooner.

**What was kept so this stays cheap to reverse** — the `ApiKey` model, and
business logic isolated in `server/services/` behind clean boundaries. The
intent is that exposing the API later is an authentication and rate-limiting
problem, not a rewrite. That property has to be maintained as services are
written; it cannot be added afterwards.

### The real integration backlog

What this buyer will actually ask for, in rough order of likelihood:

1. **MLS / IDX** data
2. **Follow Up Boss / kvCORE** — or whatever the brokerage mandates
3. **Google Calendar + Gmail**
4. **DocuSign / Dotloop**
5. **Zapier** — worth weighing as a cheaper substitute for a public API entirely

---

## Open decisions that block milestones

Tracked in `docs/DECISIONS.md`; repeated here because they gate delivery.

| Open item | Blocks | Where |
|---|---|---|
| What each pricing tier gates | **M6** — pricing page and billing | DECISIONS §3 |
| Is the non-selling admin/coordinator seat billable | **M6** | DECISIONS §2, §3 |
| Commission-split tracking, in or out | Data model, before M6 | DECISIONS §2 |
| Free-tier 50-deal cap: lifetime or concurrent-active | **M6** | DECISIONS §3 |
| Behaviour on downgrade / exceeding the Free cap | **M6** | DECISIONS §3 |
| Sales tax configuration (GST/HST + US nexus) | First invoice | DECISIONS §4 |
| Specific US region for Postgres | Deploy | DECISIONS §5 |
| Privacy policy (PIPEDA) | Public launch | DECISIONS §5 |
| Support address + shared-inbox tool | Pricing page | DECISIONS §6 |
| Domain + trademark clearance | **All brand and design spend** | DECISIONS §1 |
| Real-estate acquisition plan | Go-to-market | DECISIONS §2 |

The trademark one is worth singling out: DECISIONS §1 says not to commission
logo or brand work until CIPO and USPTO searches come back clean. A rename after
paid design work is pure waste, and §8.1 of DECISIONS is why the product name
lives in a single constant.

---

## Not a roadmap item — a standing constraint

`BUILD_SPEC.md` §0 is a legal boundary, not a preference. Twenty CRM (AGPL-3.0)
was studied as a reference for what a good CRM does. This project is not a fork
and not a port: no file, component, function, schema, migration or CSS may be
copied from that repository; no `twenty-*` packages; no reproduction of their
visual design; no use of their name or copy.

Generic CRM *concepts* — companies, people, deals, pipeline stages, activity
timelines, saved views — are not theirs and are fine to build.

This does not expire when v1 ships.
