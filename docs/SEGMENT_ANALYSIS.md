# CityGap Phase 1 — Segment Analysis

- **Version:** 0.1 (2026-10-08)
- **Source:** Founder Directive v1.0, section 1.2
- **Conclusion:** **Beachhead = Segment A (Pre-event gap).** No Change Request is raised.

> **Every score in this document is an UNVALIDATED HYPOTHESIS.** The scores are product judgments from general reasoning about the Phase 1 geography and the product's mechanics. They are **not** market research. No surveys, interviews, market sizes or usage statistics exist yet. Nothing in this file should be quoted as data.

---

## 1. Scoring criteria (weights from directive section 1.2)

| # | Criterion | Weight |
|---|---|---|
| C1 | Trigger pain intensity and time urgency | 20% |
| C2 | Reachable cheaply through one high-density channel | 20% |
| C3 | Nearby usable supply density (in the Phase 1 geography) | 20% |
| C4 | Value perceivable on first use | 15% |
| C5 | Potential merchant willingness to pay / transaction value | 15% |
| C6 | Repeat-use opportunity | 10% |

Scale: 1 = very weak, 3 = moderate, 5 = very strong. All scores are **UNVALIDATED HYPOTHESES**.

## 2. Score summary

| Segment | C1 (20%) | C2 (20%) | C3 (20%) | C4 (15%) | C5 (15%) | C6 (10%) | **Weighted total** |
|---|---|---|---|---|---|---|---|
| **A. Pre-event gap** | 4 | 4 | 3 | 4 | 4 | 2 | **3.60** |
| B. Between-appointments | 3 | 2 | 3 | 3 | 2 | 4 | **2.75** |
| C. Spontaneous boredom | 2 | 2 | 4 | 3 | 3 | 3 | **2.80** |
| D. Campus micro-gaps | 3 | 4 | 2 | 3 | 1 | 5 | **2.90** |

**Arithmetic (score × weight):**

- **A:** 4×0.20 + 4×0.20 + 3×0.20 + 4×0.15 + 4×0.15 + 2×0.10 = 0.80 + 0.80 + 0.60 + 0.60 + 0.60 + 0.20 = **3.60**
- **B:** 3×0.20 + 2×0.20 + 3×0.20 + 3×0.15 + 2×0.15 + 4×0.10 = 0.60 + 0.40 + 0.60 + 0.45 + 0.30 + 0.40 = **2.75**
- **C:** 2×0.20 + 2×0.20 + 4×0.20 + 3×0.15 + 3×0.15 + 3×0.10 = 0.40 + 0.40 + 0.80 + 0.45 + 0.45 + 0.30 = **2.80**
- **D:** 3×0.20 + 4×0.20 + 2×0.20 + 3×0.15 + 1×0.15 + 5×0.10 = 0.60 + 0.80 + 0.40 + 0.45 + 0.15 + 0.50 = **2.90**

Ranking (hypothesis): **A (3.60) > D (2.90) > C (2.80) > B (2.75)**.

### Sensitivity check

The scores are guesses, so we tested how much A's lead depends on its weakest assumptions:

| Scenario | Changed scores | Result |
|---|---|---|
| A's channel fails (no event or organiser distribution) | A C2: 4 → 2 | A = 3.20, still first |
| A's supply is thinner than assumed | A C3: 3 → 2 | A = 3.40, still first |
| **Both fail together** | A C2 = 2 and C3 = 2 | **A = 3.00**, below D's optimistic case |
| D is optimistic (downtown campus supply is good, some WTP) | D C3: 2 → 4, C5: 1 → 2 | D = 3.45 |
| C is optimistic (stronger pain, shareable content works) | C C1: 2 → 3, C2: 2 → 3 | C = 3.20 |

**Reading:** A's lead holds against any single bad assumption. It does **not** hold if channel *and* supply both fail. That makes H1 (supply) and H4 (channel) the tests that decide the Beachhead (see section 4 and `PRODUCT_BRIEF.md` section 8).

---

## 3. Per-segment analysis

"Observed evidence" here means **general, structural reasoning** that anyone can check (for example: arena events have fixed start times). It does not mean measured data.

### A. Pre-event gap (活动前空档) — Beachhead

**Trigger:** arriving early before a concert, game or conference. Typical window (assumed) 45–150 minutes.

**Scores and rationale (UNVALIDATED HYPOTHESES)**

| Criterion | Score | Reasoning |
|---|---|---|
| C1 pain | 4 | There is a hard deadline (doors or tip-off) that cannot move. People are in an unfamiliar area and decide under time pressure. This is the exact problem the feasibility engine solves |
| C2 channel | 4 | A single event concentrates many people at one place and time. Event pages, invites and "Before & After Guide" links are natural one-to-many entry points |
| C3 supply | 3 | The Rogers Arena / BC Place area is dense in food and drink. Whether there are enough *non-dining, short, time-feasible* activities is uncertain (the directive flags this risk) |
| C4 first-use value | 4 | The output ("you can do X, leave by 19:05") is concrete and checkable on the spot |
| C5 merchant WTP | 4 | Pre-event spending near venues is a plausible referral target. Organiser co-branded guides are a second path. Both are untested |
| C6 repeat | 2 | Most people attend events occasionally. Repeat use depends on season-ticket holders and frequent concert-goers |

**Observed evidence (general reasoning only)**
- Arena and stadium events publish fixed start times. Doors usually open before start time, so there is a structural pre-event window.
- Event attendees often arrive by transit or travel in from outside the micro-core, so many are less familiar with the area.
- The Phase 1 geography (Rogers Arena / BC Place) was chosen because it concentrates this trigger.

**Unvalidated assumptions**
- A1: A meaningful share of attendees arrive with 45+ minutes to spare *and* want to do something other than wait or eat.
- A2: Enough time-feasible, legally listable options exist in walking range for typical windows.
- A3: Attendees would open a link from an event context (invite, guide, social share) before arriving.
- A4: Honest "capacity unknown" labelling does not stop people from acting.
- A5: Organisers or nearby merchants would co-promote or pay for a guide (Phase 2+).

**Interview questions**
1. "Think about the last event you went to downtown. When did you arrive compared with the start time? What did you do with the extra time?"
2. "How did you decide? What apps or sites did you open?"
3. "What would have made you leave the venue area to do something, and what would have stopped you?"
4. "When an app says 'tickets on sale' or 'open now', what do you assume?"
5. "Would you open a link from the event invite or page that showed you what fits before doors open? What would make you ignore it?"
6. "How many events like this do you go to in a typical season?" (Record the answer verbatim. Do not extrapolate.)

**Falsification conditions (推翻条件)**
- **Supply:** the H1 desk audit finds fewer than 3 feasible candidates in at least 2 of 3 typical windows. A is then supply-blocked in the micro-core.
- **Behaviour:** most of the 5–10 interviewees in A report arriving with under 30 minutes spare, or say they would only queue, eat or wait.
- **Channel:** Experiment A misses its pre-registered threshold (see `GTM_EXPERIMENTS.md`).
- If **both** supply and channel fail, re-run this scoring with evidence and raise a Change Request (see the sensitivity table).

### B. Between-appointments (约会/课程/会议之间)

**Trigger:** a gap between two scheduled commitments. Window (assumed) 20–90 minutes.

| Criterion | Score | Reasoning |
|---|---|---|
| C1 pain | 3 | There is a real deadline, but many gaps are short and default to a café or phone |
| C2 channel | 2 | The trigger is spread across the whole city. The natural channel (calendar integration) is out of scope for Phase 1 |
| C3 supply | 3 | Depends on where the gap happens. Business districts have food and services but few short activities |
| C4 first-use value | 3 | Useful, but a 20–30 minute gap leaves little room for a non-obvious recommendation |
| C5 merchant WTP | 2 | Low ticket size (coffee, quick bites) |
| C6 repeat | 4 | Recurs often for people with fragmented schedules |

**Observed evidence (general reasoning):** the time-feasibility engine applies directly here. But with no calendar integration, users must type their next commitment by hand every time. That adds friction to a low-value decision.

**Unvalidated assumptions:** users will enter their next appointment manually; gaps are long enough to fit a meaningful activity; "between meetings" time isn't already used for work.

**Interview questions**
1. "When you last had 30–90 minutes between commitments, what did you do?"
2. "Would you type your next appointment into an app to get suggestions? What would make that worth it?"
3. "What is the shortest gap where you would consider going somewhere?"

**Falsification / upgrade conditions:** B would rise above A if interviews show frequent 60+ minute gaps *and* willingness to enter the next commitment manually. A cheap channel would also have to exist (for example a coworking space or business district partner). This becomes more relevant once calendar integration (Phase 2+) lowers C2.

### C. Spontaneous boredom (周末/晚上突然无聊)

**Trigger:** no plan, free time, evenings or weekends. Window (assumed) 1–4 hours.

| Criterion | Score | Reasoning |
|---|---|---|
| C1 pain | 2 | Low urgency, with no hard deadline, so CityGap's feasibility edge matters least |
| C2 channel | 2 | Relies on social or content spread. There is no single dense entry point |
| C3 supply | 4 | Longer windows and flexible radius mean far more candidates qualify |
| C4 first-use value | 3 | Results look like what existing discovery tools already show |
| C5 merchant WTP | 3 | Leisure experiences can carry meaningful ticket sizes |
| C6 repeat | 3 | Recurs, but competes with habits on other platforms |

**Observed evidence (general reasoning):** this is the space existing discovery and listing products already target (see `POSITIONING.md`). Without a deadline, the "what actually fits" argument weakens. This is served by the **secondary path B ("I'm free right now")**, not the Beachhead.

**Unvalidated assumptions:** bored users want curated short lists rather than browsing; they would choose a new product over their current habits.

**Interview questions**
1. "The last time you had a free evening with no plan, how did you decide what to do?"
2. "What frustrates you about the apps you used?"
3. "Would a list of 3 things that fit your time be better or worse than browsing?"

**Falsification / upgrade conditions:** C would rise if Experiment B showed the generic "nearby" page performing as well as, or better than, the time-anchored page. That would suggest the deadline framing adds no value, and the positioning would need to be revisited (raise a Change Request; do not switch on our own).

### D. Campus micro-gaps (课间/社团活动)

**Trigger:** gaps between classes, or before or after club activities. Window (assumed) 20–120 minutes.

| Criterion | Score | Reasoning |
|---|---|---|
| C1 pain | 3 | Recurring gaps, but students often have default places (library, student union) |
| C2 channel | 4 | Clubs and campus event organisers are dense, low-cost channels |
| C3 supply | 2 | The Phase 1 geography (Rogers Arena / BC Place, Richmond City Centre) is not built around a main campus. Supply would need a different geography |
| C4 first-use value | 3 | Useful if campus-specific events are included, which needs data we do not have |
| C5 merchant WTP | 1 | Directive flags high price sensitivity and low purchase intent |
| C6 repeat | 5 | Daily or weekly recurrence |

**Observed evidence (general reasoning):** the strong channel and repeat-use scores come from campus structure. But the Phase 1 geography and data sources don't cover campus events, so serving D would mean **expanding scope** (new geography, new data sources).

**Unvalidated assumptions:** campus organisers would share a link; students would use the product during short gaps; campus event data can be legally obtained.

**Interview questions**
1. "What do you usually do between classes when you have 45+ minutes?"
2. "Where do you hear about campus events today?"
3. "Would you pay for, or spend money at, something you found this way?"

**Falsification / upgrade conditions:** D would rise if a downtown-campus channel (for example a downtown campus near the micro-core) showed both a willing organiser partner and adequate supply. Even then, D's low C5 hurts commercial viability. **Any move toward D needs an Owner Change Request**, because it expands geography and data scope.

---

## 4. Conclusion and decision

- **Beachhead = Segment A (Pre-event gap).** It scores highest (3.60, hypothesis). It is the only segment where the hard-deadline feasibility engine, the chosen micro-core geography, and a single dense channel all line up.
- **Secondary path B in the UI ("I'm free right now")** covers Segments C and D-style free-time needs without making them the Beachhead.
- **No Change Request is raised.** Our reasoning does not objectively favour another segment. The only scenario where A loses (channel and supply both fail) is exactly what the first tests check.
- **Decision-critical tests, in order:** H1 supply audit, then Experiment C interviews (A-focused), then Experiment A channel, then Experiment B framing. If H1 and Experiment A both fail, the PM workstream re-scores using the real evidence and submits a Change Request to the Owner. It will not switch on its own.
