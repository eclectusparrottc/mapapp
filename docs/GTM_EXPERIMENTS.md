# CityGap Phase 1 — GTM Experiments

- **Version:** 0.1 (2026-10-08)
- **Source:** Founder Directive v1.0, sections 1.4, 8 and 9

> **STATUS: NO RESULTS EXIST YET.** None of these experiments has been run. Every threshold below is a **pre-registered decision rule** written before data collection, not an outcome. The thresholds are PM judgment calls; the Owner may adjust them **before** launch, but not after data is seen. Record only real observed data. **Never** infer or report GMV, retention, CAC or ad revenue as having happened.

---

## 0. Shared rules

**Allowed analytics events (only these 7):**
`view_home`, `select_mode`, `request_recommendations`, `view_recommendation`, `click_source`, `click_directions`, `share_link`

**Allowed event properties (proposal, for ADR review):**
- Random anonymous `session_id`. It is generated per browser session, is not tied to identity, and is not persisted beyond the session.
- `mode` (`before_next_plan` / `free_time`).
- `entry` (`guide` / `generic` / `direct`) and `variant` (`A` / `B`).
- `recommendation_id` and rank position.
- `confidence_level` of the clicked card.
- Coarse zone (`downtown_core` / `richmond_cc` / `other`) only.

**Never logged:** precise coordinates, IP addresses in analytics tables, names, emails, phone numbers, calendar details, free-text destination input, or the user's next-commitment time to the minute (use a coarse bucket only if needed, for example `<60`, `60–120`, `>120` minutes of window).

**Privacy baseline for all experiments:**
- No account, no persistent cookie identifier, no continuous location.
- Consent and notice follow applicable privacy rules. The Owner reviews the notice before any public link is shared.
- Share links contain no precise user location. They may contain a venue or event ID and a mode.
- All pages in experiments run on **synthetic DEMO DATA** unless a source is authorised in `LICENSES_AND_SOURCES.md`. DEMO DATA labelling stays visible.

**Conversion definition used below:**
An **action session** is a de-duplicated `session_id` that fires `request_recommendations` and then at least one of `click_source`, `click_directions` or `share_link`. This is **not** a visit, attendance or purchase, and must not be reported as one.

---

## Experiment A — Event-anchored shareable "Before & After Guide"

| Item | Detail |
|---|---|
| **Hypothesis (H4)** | A guide page anchored to one specific Downtown event (Rogers Arena or BC Place) can bring Segment A users into the core flow without paid ads |
| **Setup** | One guide URL per event, e.g. `/guide/<event-slug>`. It is pre-filled with the next destination (the venue) and the event start time. The user only confirms the start point and the buffer. It is distributed through **organic channels only** (Owner-approved: personal networks, relevant community groups, or an organiser partner if one agrees). No paid ads. Pick one event at least 7 days ahead so the link can circulate |
| **Primary metric** | Guide-landing sessions that fire `request_recommendations` ÷ guide-landing sessions (`view_home` with `entry=guide`) |
| **Secondary metrics** | Action-session rate; `share_link` per landing session (organic spread signal) |
| **Pre-registered decision rule** | Read results only after **≥ 100 guide-landing sessions** or 14 days, whichever comes first. **Success:** ≥ 40% reach `request_recommendations` **and** ≥ 15% become action sessions. **Fail:** < 20% reach `request_recommendations`. **In between:** inconclusive; iterate on the guide copy once and re-run. If fewer than 100 sessions arrive in 14 days, report "**insufficient reach**". That is itself evidence against cheap reach (H4) and must not be treated as a pass |
| **Sample size** | ≥ 100 landing sessions. This is a feasibility floor, not a power calculation. At n = 100, a 40% observed rate has a 95% CI of about ±10 percentage points, which is enough to tell "works" from "doesn't" but not to fine-tune |
| **Instrumentation** | `view_home` (entry=guide), `select_mode`, `request_recommendations`, `view_recommendation`, `click_source`, `click_directions`, `share_link` |
| **Privacy notes** | The guide URL identifies the event, never the visitor. Referrer is not stored beyond the coarse `entry` value. No location in the URL |
| **Owner approvals needed** | Choice of event, distribution channels, and any organiser contact. Public link sharing requires the Owner's Publish approval |

## Experiment B — Time-anchored guide vs. generic "What's nearby" page

| Item | Detail |
|---|---|
| **Hypothesis (H3)** | The "Before my next plan" framing (deadline-first, top 3 feasible cards) produces a higher click-through to source or directions than a generic "What's nearby" list showing the same underlying records |
| **Setup** | Random 50/50 assignment per `session_id` at first load: **Variant A** = time-anchored guide; **Variant B** = generic nearby list (same area, same records, sorted by distance, no deadline input). The data set is identical. Only the framing and ranking differ |
| **Primary metric** | Among sessions with ≥ 1 `view_recommendation`: share that fire `click_source` or `click_directions` |
| **Secondary metrics** | `request_recommendations` rate; `share_link` rate; clicks broken down by `confidence_level` |
| **Pre-registered decision rule** | Two-sided two-proportion test, α = 0.05. **Success:** A beats B by ≥ 10 percentage points, statistically significant. **Fail:** difference < 3 points, or B ≥ A. **In between:** directional only. Report it as such and do not claim a win. The test is stopped and analysed **only** at the planned sample size (no peeking-based early stops) |
| **Sample size** | Planning calculation, not data: assuming a baseline of 15% in B and a target of 25% in A (assumed, not measured), α = 0.05 and power = 0.8, we need **≈ 250 sessions with `view_recommendation` per arm** (≈ 500 total). If Phase 1 traffic can't reach that, the result is reported as **directional / underpowered**. Phase 1 may realistically run it as directional only |
| **Instrumentation** | All 7 events, with `variant` on each. `view_recommendation` is the denominator. `click_source` and `click_directions` are the numerator |
| **Privacy notes** | Variant assignment is held only in the session. No cross-session tracking. Same coarse-zone rule as above |
| **Risks** | Novelty or traffic-source mix differs between arms. Randomise within the same entry link to control for this |

## Experiment C — Task-based user interviews (5–10 target users)

| Item | Detail |
|---|---|
| **Hypothesis (H2, H5, and H1 qualitatively)** | After one use, target users can say how CityGap differs from Maps or event directories. They find at least one candidate they consider **worth acting on**, and they understand confidence labels correctly |
| **Recruitment** | 5–10 people matching Segment A (attended a downtown event in the recent past). Optionally 2–3 matching Path B. Recruit through the Owner's network. Any incentive is decided by the Owner |
| **Setup** | 30-minute moderated session, in person or remote, on a phone. Scenario script: *"Your game at Rogers Arena starts at 19:30; you want to be there by 19:10; it's 17:55 and you're at [sample start]. Find something to do."* Baseline task first: do it with your usual apps (time it). Then do it with CityGap (time it). Then a debrief |
| **Metrics (observed, recorded per participant)** | (1) Time to first candidate the participant says is worth acting on, with usual apps vs. CityGap. (2) Count of misunderstandings, especially reading "sales open" or "capacity unknown" as "available". (3) Unprompted answer to "How is this different from what you normally use?", coded as time-fit / confidence / other / none. (4) Whether they would open such a link before a real event (yes / no / maybe, verbatim reason) |
| **Pre-registered decision rule** | **Success:** ≥ 60% name a time-fit or confidence difference unprompted, **and** ≥ 60% find a candidate they would act on, **and** ≤ 1 participant misreads unknown inventory as available. **Fail:** < 40% name a difference, **or** ≥ 3 misread availability. A misreading failure blocks release until the UI copy is fixed, regardless of other results |
| **Sample size** | 5–10. This is qualitative. Report counts (for example "4 of 7"), **never percentages extrapolated to a market** |
| **Instrumentation** | Moderator notes plus a timing sheet. If the prototype runs during the session, the 7 events may be logged with `entry=interview` so these sessions can be excluded from Experiments A and B |
| **Privacy notes** | Written or recorded verbal consent before the session. Notes use participant codes (P1, P2, ...), with no names in project docs. No screen recording without explicit consent. Raw notes are kept outside the repo. Only anonymised summaries go into docs |

---

## Run order and gating

1. **Experiment C first.** It is the cheapest and runs on DEMO DATA. It also checks honesty-label comprehension before anything is public.
2. **Experiment A second.** It needs Owner approval to Publish and share a public link.
3. **Experiment B third, or alongside A.** It needs enough traffic. Accept a directional-only result in Phase 1.

## Results log

| Experiment | Status | Date run | n | Result vs. rule | Evidence link |
|---|---|---|---|---|---|
| A | NOT_STARTED | — | — | — | — |
| B | NOT_STARTED | — | — | — | — |
| C | NOT_STARTED | — | — | — | — |
