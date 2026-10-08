# CityGap Phase 1 — Product Brief

- **Version:** 0.1 (2026-10-08) — Owner review pending
- **Source:** Founder Directive v1.0 (2026-10-08), sections 0–2, 7–9
- **Status:** DRAFT. Every market claim here is a hypothesis to be tested. None of it is a research finding.

---

## 1. Product thesis

> **"You have time before your next plan. Here's what actually fits."**

Event platforms answer *"what is happening?"*. CityGap answers a narrower question that people actually face: *"I have 75 minutes and have to be at Rogers Arena by 19:30. What can I do now, when should I leave, and why is it worth it?"*

The product does not sell map pin density. It sells **decision efficiency**: getting from idle time to one actionable choice. The core quality attribute is **decision confidence**: can I go, will I make it back in time, and how recently was this information verified?

How CityGap differs from generic event discovery (hypothesis):

| Generic discovery | CityGap |
|---|---|
| Starts from "what's on" | Starts from **a fixed next commitment** (time plus place) |
| Ranks by popularity or relevance | Filters by **time feasibility first**, then data completeness, distance and interest |
| Shows many pins | Shows **at most 3 highlighted cards**, with the map in a supporting role |
| Implies availability | Says explicitly **what is unknown** (`unknown != available`) |
| Usually needs an account or app install | **No signup**, works from a deep link, location can be declined |

## 2. Jobs-to-be-Done

**Primary JTBD (Segment A — pre-event gap, 活动前空档).**
*When I arrive early for an event, or am waiting for my next scheduled commitment, help me quickly find options worth doing. They must fit my remaining time, walking distance, interests and the deadline to reach my next stop, so I don't have to switch between Google Maps, Eventbrite and Search.*

**Secondary JTBD (free time, 临时空闲).**
*When I have no plan and suddenly have 30–120 free minutes, help me find nearby activities or places I can consider right away.*

Beachhead: **Segment A**. For the scoring and falsification conditions, see `SEGMENT_ANALYSIS.md`.

## 3. Phase 1 scope

**In scope**
- A mobile-first web prototype with map and list views. It works at 360, 390 and 1280 px. No signup.
- **Path A, "Before my next plan"** (primary CTA) and **Path B, "I'm free right now"** (secondary CTA).
- 30–50 clearly labelled **synthetic DEMO DATA** records. They include scheduled events, drop-ins, bookable slots with unknown inventory, and counter-examples (cancelled, duplicate, unknown end time).
- Deterministic Feasibility-Lite ranking with a `why_this_fits`, `recommended_leave_by`, `confidence_level` and `unknowns` output.
- A curated CSV adapter. Optionally, one authorised real API, only if the Owner approves its terms.
- A minimal ops view for sources, last sync, accepted and rejected counts, and rejection reasons. It is protected and never anonymous.
- Only the 7 permitted anonymous analytics events (see `GTM_EXPERIMENTS.md`).

**Out of scope (非 Phase 1 范围)**
Native app; friend or social map; automatic full calendar read; location history or continuous tracking; scraping third-party accounts; payments, in-app booking or real-time ticket grabbing; real-time sports-venue inventory; production-grade personalisation or LLM recommendation; full Metro Vancouver coverage; sponsored placement.

## 4. The recommendation card contract (5 questions)

Every recommendation card must answer all five. If a field is unknown, the card says **"Can't confirm yet / 尚无法确认"** and never fills in a guess.

| # | Question | Card content | Honesty rule |
|---|---|---|---|
| 1 | **What** | Name, category, a one-line reason why it is worth doing | No copied long descriptions from sources |
| 2 | **When** | Can I start now, known start and end time *or* estimated duration, `recommended_leave_by` | Unknown end time is shown as unknown. It is never treated as 60 minutes |
| 3 | **Where** | Location, distance from me, distance to my next destination | Distance and walking time are labelled **estimate** (straight line × conservative pace) |
| 4 | **Can I** | `confidence_level`: `confirmed_from_authorized_source` / `schedule_known_capacity_unknown` / `estimated_only`, plus any booking-required flag | Never says "spots available" unless inventory has been verified. Never shows calibrated-looking percentages |
| 5 | **Next step** | Official source link, directions, share (anonymised link) | The share URL never contains the user's precise location |

## 5. User paths

**Path A — Before My Next Plan (primary)**
1. Open the link. Set a start point manually, or use one-time geolocation, which can be declined. The default is "Downtown Vancouver (sample start)", labelled as a sample.
2. Pick the next destination (test-venue shortcuts such as Rogers Arena and BC Place), the next start time (shown in local `America/Vancouver` time) and the arrival buffer.
3. The system computes the window. `hard_deadline = next_start − arrival_buffer`. Any estimates are labelled as estimates.
4. Show the top 3 feasible cards first and the map second. The remaining candidates can be browsed.
5. Detail drawer, then source link, directions, or share link.

**Path B — I Have Free Time (secondary)**
1. Choose "I'm free right now" and 30, 60, 90 or 120 minutes.
2. Choose a start point or area and coarse interest chips.
3. Show actionable candidates. If there are none, say so honestly and suggest widening the radius or extending the time.

## 6. Geography

- **Micro-core:** the area around **Rogers Arena and BC Place** in Downtown Vancouver, plus nearby walkable public space. This is where Segment A has a natural, high-density trigger (events with fixed start times).
- **Remote sample zone:** **Richmond City Centre**. It validates that the data model and ranking are not hard-coded to one neighbourhood.
- The coordinate model supports Metro Vancouver later. **We do not promise city-wide coverage at launch.**

## 7. Honesty rules ("unknown != available")

| This statement | Does NOT imply |
|---|---|
| Event announced | Joinable now |
| Ticket sales open | A ticket is available for this user or session |
| Venue open now | Bookable capacity is confirmed |
| End time unknown | Duration = 60 min (or any default) |
| Missing data | `false` or `available` |
| Estimated walking time | A routed travel time (no Google or Mapbox routing in Phase 1) |
| Unknown queue or booking need | 0 minutes of waiting |

UI copy must never use vague "available" wording that makes unknown inventory look confirmed. Synthetic records always show a **DEMO DATA** badge.

## 8. High-risk assumptions (in priority test order)

The order is set by: (a) whether failure kills the thesis, and (b) how cheaply we can test it now.

| Priority | Assumption | Why it is risky | Cheapest test | Kill / pivot signal |
|---|---|---|---|---|
| **1** | **H1 — Supply:** within walking range of Rogers Arena / BC Place there are enough *time-feasible, actionable* options (not just restaurants) to fill 3 good cards across ≥3 typical windows (for example a weekday evening event, a weekend afternoon game, a weekday 45-minute gap) | The directive itself flags "real short-duration activities insufficient" for A | Desk audit plus curated CSV of real, legally listable places and events for 3 windows. Count feasible candidates per window with the Feasibility-Lite rules | Fewer than 3 feasible candidates in ≥2 of 3 windows means we report a **supply gap** as the real conclusion |
| **2** | **H2 — Differentiation is perceived:** after one use, target users can say how CityGap differs from Google Maps or an event directory | If users see it as "just another nearby list", the thesis fails | Experiment C (5–10 task-based interviews) | Fewer than half of participants can state a time-fit or confidence-related difference unprompted |
| **3** | **H3 — The time-anchored framing beats a generic list:** "Before my next plan" drives more detail and navigation clicks than "What's nearby" | This is the core positioning bet | Experiment B (controlled comparison) | No meaningful lift under the pre-registered rule |
| **4** | **H4 — Reachable through one dense channel:** an event-anchored "Before & After Guide" link can reach Segment A without paid ads | Without a cheap channel, A loses its main advantage over C | Experiment A (shareable guide page for one Downtown event) | Landing sessions rarely reach `request_recommendations` (see threshold in GTM doc) |
| **5** | **H5 — Honest uncertainty is acceptable:** users still act on cards that say "capacity unknown" or "estimated" rather than ignoring them | Honesty rules may reduce perceived usefulness | Experiment C: observe reactions to cards with each `confidence_level` | Participants consistently dismiss non-confirmed cards as useless |
| **6** | **H6 — Legal data access:** at least one real source (curated CSV and/or Ticketmaster Discovery) can be displayed legally with the needed fields | Without real data the product stays a demo | Owner review of terms (see `LICENSES_AND_SOURCES.md`) | No source authorised. G4 is marked BLOCKED and the demo continues on synthetic data |
| **7** | **H7 — Monetisable later:** nearby merchants or event organisers would pay for compliant referral or co-branded guides | Not needed for Phase 1, but drives the Beachhead choice | Defer. Add 2–3 questions in Experiment C and informal merchant conversations in Phase 2 | No organiser or merchant interest in later conversations |

## 9. Phase 1 definition of done

Phase 1 is done only when **all** of the following are verified with tools and evidence, not asserted:

1. An online URL that has actually been opened and checked (Lovable Publish, after Owner approval). Otherwise it is marked `NOT YET PUBLISHED`, with the Preview URL and manual publish steps.
2. A private GitHub repo created through Lovable Git Sync, with working two-way sync.
3. An Owner-owned external Supabase backend (`citygap-dev`), or the frontend-demo fallback the directive specifies.
4. A map and list UI that works on mobile and desktop (360, 390 and 1280 px). The list still works if tiles fail.
5. Both time paths (A and B) can be completed without an account. Declining location never dead-locks the flow.
6. One complete chain: adapter, then normalise, then visualise, then source link.
7. Automated tests: lint, typecheck, build, unit tests, a Playwright smoke test, and at least 12 golden feasibility cases.
8. A privacy and security baseline: no secrets in the repo or client bundle, no anonymous writes, no precise location in URLs or analytics.
9. A traceable delivery report (Gate Report template, Appendix D) that reports `demo ready` and `real-data ready` separately.

## 10. Open decisions for the Owner

- Approve Segment A as the Beachhead (recommended; see `SEGMENT_ANALYSIS.md`).
- Approve the sample event and venue for Experiment A.
- Review the Ticketmaster terms before any application (see `LICENSES_AND_SOURCES.md`).
- Choose a tile provider and account (MapTiler or similar) before the map goes public.
