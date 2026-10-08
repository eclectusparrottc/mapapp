# CityGap Phase 1 — Positioning

- **Version:** 0.1 (2026-10-08)
- **Source:** Founder Directive v1.0, section 1.3

> **Tagline:** **"You have time before your next plan. Here's what actually fits."**
> Home headline (UI): *"Make the time before your next plan count."*

## 1. Positioning statement

**For** people with a fixed next commitment (an event start, a meeting, a train) and spare time before it, **CityGap** is a time-aware local discovery web app. It returns **up to 3 options that actually fit**: reachable, doable, and back in time. Each option says honestly what is known and what is not, and comes with a leave-by time.
**Unlike** maps (which find places) and event platforms (which list what is happening), CityGap starts from **your deadline** and filters for feasibility first.

## 2. Comparison table

**Read this first.** Competitor cells describe only **general, widely known product behaviour**, as reasoned by the PM workstream on 2026-10-08. No feature-by-feature audit was done and no competitor metrics are cited. Any cell marked **(unverified, check before external use)** must be checked against the live product before it goes in a pitch, landing page or any external material. The CityGap column is a **Phase 1 design target**, not a shipped capability.

| Dimension | **CityGap (Phase 1 target)** | Google Maps | Eventbrite | Fever | Luma / Partiful | Zenly-style friend maps |
|---|---|---|---|---|---|---|
| **Time-to-next-commitment** (does it reason backwards from a hard deadline?) | Core input. `hard_deadline = next_start − arrival_buffer`. Every card has `recommended_leave_by` | Shows travel time and opening hours for a chosen place. Not organised around "what fits before my next commitment" (unverified, check before external use) | Organised around event date and time. No user-deadline input (unverified, check before external use) | Organised around curated experiences and dates. No user-deadline input (unverified, check before external use) | Event pages for hosts and guests. Not a gap-filling tool (unverified, check before external use) | Location sharing among friends. No deadline reasoning (unverified, check before external use) |
| **Route feasibility** (out to the activity, then on to the next stop) | Two-leg **estimate** (start → activity → next destination) with a safety margin. Clearly labelled as an estimate, not a routed time | Strong single-trip routing with real routing engines. Multi-leg feasibility against a deadline is not the primary flow (unverified, check before external use) | Not a routing product. Links out to maps (unverified, check before external use) | Not a routing product (unverified, check before external use) | Not a routing product (unverified, check before external use) | Shows where friends are. Not a feasibility tool (unverified, check before external use) |
| **Actionability** (one clear next step) | Top 3 cards answering What, When, Where, Can I and Next step: source link, directions, anonymised share | Strong for places (call, directions, website) (unverified, check before external use) | Strong for ticketed events on its platform (register or buy) (unverified, check before external use) | Strong for its curated ticketed experiences (buy) (unverified, check before external use) | Strong for RSVP to a specific invited event (unverified, check before external use) | Social coordination (meet a friend), not activity selection (unverified, check before external use) |
| **Data confidence** (is it honest about what is unknown?) | Explicit `confidence_level` and `unknowns`. `unknown != available`. Sales-open and venue-open are never shown as inventory. DEMO DATA is labelled | Large place database with user-contributed data. How freshness is surfaced varies (unverified, check before external use) | Organiser-provided listings. Inventory known for its own ticketing (unverified, check before external use) | Curated by the platform. Inventory known for its own ticketing (unverified, check before external use) | Host-provided. Capacity or waitlist known for its own events (unverified, check before external use) | N/A for activities |
| **Signup friction** | **None.** Opens from a deep link. Location is optional and can be declined. No install | Usable without signing in for basic search. App or browser (unverified, check before external use) | Browse without an account. Account typically needed to register or buy (unverified, check before external use) | Purchase flow typically needs an account or app (unverified, check before external use) | RSVP typically needs some identity (phone or email) (unverified, check before external use) | Account plus friend graph plus continuous location are core to the concept (unverified, check before external use). Zenly itself was discontinued by Snap; confirm before citing (unverified, check before external use) |

## 3. Hard-to-copy angle (hypothesis)

Large incumbents *could* build a deadline filter. What is hypothesised to be harder for them to prioritise:

1. **Deadline-first information architecture.** Their primary flows are search-first or catalogue-first. CityGap's whole flow starts from the next commitment.
2. **Honesty as a feature.** Saying "can't confirm yet" goes against marketplaces' incentive to drive conversion on their own inventory.
3. **Event-anchored distribution.** "Before & After Guide" links tied to one venue and one event can be distributed without an install or account.

These are **positioning hypotheses**. They are tested through H2, H3 and H4 (`PRODUCT_BRIEF.md` section 8) and Experiments A, B and C (`GTM_EXPERIMENTS.md`).

## 4. What we will not claim

- That CityGap has real-time inventory or "spots left". Phase 1 does not.
- Routed travel times. Phase 1 uses labelled straight-line and walking-pace estimates.
- Coverage of all of Metro Vancouver.
- Any competitor statistic, user count or feature not verified against the live product.
- Any visual or brand similarity to Zenly or other products. The UI must be original.
