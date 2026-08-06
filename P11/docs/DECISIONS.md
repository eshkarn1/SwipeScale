# Decisions

Locked-in answers to the open scoping questions. Anything marked **OPEN** still
needs action before it can be treated as final.

Last updated: 2026-08-05

---

## 1. Product name

**Decision:** Lightline. Primary domain: `uselightline.com`.

The `use-` prefix pattern means the bare `lightline.com` is presumed taken or
out of budget. That's a normal tradeoff, but it has consequences worth naming:
type-in traffic leaks to the bare domain, and email deliverability reputation
has to be built from scratch on the prefixed domain.

**OPEN — do before paying a designer:**

- [ ] Confirm `uselightline.com` is actually available and register it
- [ ] Register defensive variants: `.ca`, `.io`, `lightlinecrm.com`
- [ ] CIPO trademark search (Canada) — Nice class 9 and class 42
- [ ] USPTO TESS search (US) — same classes
- [ ] Common-law check: Google, LinkedIn, Crunchbase, app stores for existing
      "Lightline" software products
- [ ] Secure social handles: X, LinkedIn, Instagram

Do not commission logo or brand work until the trademark searches come back
clean. A rename after design work is paid for is pure waste.

---

## 2. Buyer

**Decision:** Real-estate teams.

This is the wedge, not the ceiling. All v1 copy, onboarding, demo data, and
pricing-page language target this segment specifically.

**What this implies for the product:**

- Deal object is a *transaction* (listing or buyer-side), not a generic
  opportunity
- Pipeline stages should default to a real-estate lifecycle
  (Lead → Appointment → Agreement Signed → Under Contract → Closed)
- Contacts need dual-role handling — the same person is a seller now and a
  buyer in eighteen months
- Team structure is agent + team lead + transaction coordinator, so per-seat
  pricing needs to tolerate a non-selling admin seat
- Commission split tracking will be asked for. Decide in or out before M6.

**Risk to watch:** this segment is not the Swipe & Scale network. The original
argument for agencies was warm distribution — "you already talk to them." That
advantage is now gone. Cold acquisition for real-estate teams needs its own
plan (which brokerages, which conferences, which Facebook groups) and that plan
does not exist yet.

**OPEN:**

- [ ] Identify 10 target teams for design-partner conversations
- [ ] Decide: in or out on commission split tracking for v1
- [ ] Write the acquisition plan that replaces the lost warm-network advantage

---

## 3. Pricing

**Decision:** Four tiers, per-user monthly.

| Tier | Price (USD/user/mo) | Notes |
|---|---|---|
| Free | $0 | 1 user, 50 deals |
| Starter | $19 | |
| Growth | $39 | |
| Scale | $69 | |

**Annual billing:** 2 months free (≈16.7% discount).

**Still to define before the pricing page ships:**

- [ ] What gates each tier — seats, deals, automations, integrations, or a mix
- [ ] Whether the Free tier's 50-deal cap is lifetime or concurrent-active
      (concurrent-active is friendlier and converts better)
- [ ] Behaviour on downgrade and on exceeding the Free cap — read-only lock,
      soft warning, or hard block
- [ ] Whether the non-selling admin/coordinator seat is billable
      (see §2 — real-estate teams will push back hard if it is)

**Deadline:** locked before M6.

---

## 4. Currency and billing region

**Decision:** USD.

Stripe as processor. All prices displayed in USD with no local-currency
switching in v1.

**Consequences to handle:**

- We are a Canadian entity billing in USD — FX exposure sits on our side
- Revenue recognition and bookkeeping stay in CAD; note the FX policy for the
  accountant (spot rate at invoice date is the simplest defensible choice)
- Canadian customers will see USD pricing. Acceptable, but expect it to come up
  in sales conversations

**OPEN:**

- [ ] Confirm Canadian sales tax handling (GST/HST) on USD-denominated SaaS
      sales to Canadian customers — this is a question for an accountant, not a
      guess
- [ ] Confirm US state sales tax / economic nexus obligations. Several states
      tax SaaS. Stripe Tax handles most of this but has to be switched on and
      configured.

---

## 5. Data residency

**Decision:** US only.

Postgres in a US region. No EU region in v1.

**Consequences:**

- No GDPR obligation, no DPA to write, no EU sub-processor list — this is the
  main reason the decision is worth it
- We do **not** sell to EU customers in v1. This needs to be a real policy, not
  an assumption: add it to the ToS and consider geo-flagging EU signups
- PIPEDA still applies to us as a Canadian company regardless of where the data
  lives, so a privacy policy is still required
- Real-estate data is sensitive by nature (financial details, addresses,
  identity documents). Encryption at rest and in transit is non-negotiable even
  without a regulator forcing it.

**OPEN:**

- [ ] Pick and record the specific US region
- [ ] Draft privacy policy (PIPEDA-compliant)
- [ ] Decide backup retention window and where backups live
- [ ] Note revisit trigger: first serious EU inbound lead

---

## 6. Support channel

**Decision:** Email.

Single shared inbox. No Intercom, no Slack Connect, no live chat in v1.

**To state publicly on the pricing page:**

- The support address
- Response time commitment — pick one and honour it. Suggested: next business
  day for paid tiers, best-effort for Free.
- Support hours and timezone (Toronto / Eastern)

**OPEN:**

- [ ] Choose the address (`support@uselightline.com`)
- [ ] Choose the tool — a shared inbox like Help Scout or Front beats raw Gmail
      the moment there's more than one person answering
- [ ] Write the response-time line for the pricing page

---

## 7. API in v1

**Decision:** No. Cut from v1.

Currently scoped at M8. Cutting it ships roughly two weeks sooner.

**Rationale:** real-estate teams are not an API-first buyer. They will ask for
specific pre-built integrations long before they ask for a REST endpoint.

**What they will actually ask for — track these as the real integration
backlog:**

- MLS / IDX data
- Follow Up Boss, kvCORE, or whatever their brokerage mandates
- Google Calendar and Gmail
- DocuSign or Dotloop
- Zapier — worth considering as a cheaper substitute for a public API

**Consequence to design around now:** even without shipping a public API, build
the internal service layer with clean boundaries so exposing it later is an
authentication and rate-limiting problem rather than a rewrite.

**Revisit at:** post-launch, once there are paying customers asking.

---

## Summary of open items blocking other work

| Item | Blocks | Section |
|---|---|---|
| Domain + trademark clearance | All brand and design spend | §1 |
| Tier feature gating | Pricing page, billing implementation | §3 |
| Sales tax configuration | First invoice | §4 |
| Privacy policy | Public launch | §5 |
| Support address + tool | Pricing page | §6 |
| Real-estate acquisition plan | Go-to-market | §2 |

---

## 8. BUILD_SPEC ↔ DECISIONS reconciliation

**Recorded per BUILD_SPEC §8**, which requires an entry whenever a non-obvious
architectural choice is made, so the reasoning is followable later.

The two documents in `docs/` disagree in four places. `DECISIONS.md` is dated
2026-08-05 and exists to resolve open scoping questions, so where they conflict
it wins. Applied as follows.

### 8.1 The product is `Lightline`, not `Pipeboard`

BUILD_SPEC §1 names it Pipeboard but explicitly invites the rename and requires
the name live in exactly one constant. §1 of this document settles it.

`src/config/brand.ts` is the single source. No component, page, metadata block
or email template may hardcode a product name. A rename must stay a one-line
change — that property is worth protecting, because §1 above still has open
trademark searches and the name could yet move.

Domain `uselightline.com`, support `support@uselightline.com`.

### 8.2 The public API is cut from v1

§7 of this document cuts it; BUILD_SPEC scopes it at M8. Removed from v1: the
`/api/v1` REST surface, the OpenAPI 3.1 spec, outbound webhooks, and per-key
rate limiting.

**Deliberately kept:** the `ApiKey` model in the schema, and business logic in
`server/services/` behind clean boundaries as BUILD_SPEC §3 requires. §7 above
is explicit that exposing the API later must be "an authentication and
rate-limiting problem rather than a rewrite", and that property is only cheap to
preserve while the service layer is being written — retrofitting it costs far
more than maintaining it.

M8 keeps CSV import/export and the polish pass.

### 8.3 The buyer is real-estate teams, and it changes the defaults

BUILD_SPEC is written for generic B2B sales — companies, contacts, opportunities.
§2 above narrows the wedge, and that reaches the data model rather than just the
copy:

- A deal is a **transaction** (listing-side or buyer-side), not a generic
  opportunity.
- The default pipeline is a real-estate lifecycle — Lead → Appointment →
  Agreement Signed → Under Contract → Closed. Generic B2B stage names must not
  be baked in as defaults.
- Contacts need **dual-role handling**: the same person is a seller now and a
  buyer in eighteen months. This is a modelling requirement, not a label.
- Team shape is agent + team lead + transaction coordinator, so per-seat pricing
  has to tolerate a non-selling admin seat (see §3 above, still open).

Commission-split tracking is still an open in-or-out call and is not assumed
either way.

### 8.4 Pricing is settled; gating is not

$0 / $19 / $39 / $69 per user per month, annual at two months free. The `Plan`
enum in BUILD_SPEC §4 already matches these four tiers, so no schema change.

What each tier *gates* remains open and blocks M6. It does not block M0-M5.

### 8.5 Note on precedence

If a fifth conflict appears, it is resolved the same way — this document wins —
but it gets an entry here rather than a silent choice in code. A reconciliation
nobody wrote down is indistinguishable from a mistake six weeks later.
