# ADR-006: Feasibility and travel-time estimates. An estimate is never a guarantee.

**Status:** Accepted (implemented in `src/engine/feasibility.ts`, `src/domain/geo.ts`)
**Date:** 2026-10-08 · **Directive refs:** P1.4, §7

## Context
Phase 1 shows feasibility deterministically and explainably, with no ML and no routing API. Every number we show
must be honest about what it is.

## Decision: constants (exact values in code)

| Constant | Value | Where |
|---|---|---|
| Walking speed | **75 m/min** (4.5 km/h) | `WALK.speedMetersPerMinute` |
| Detour factor (straight line → street grid) | **1.3** | `WALK.detourFactor` |
| Per-leg overhead | **+3 min** | `WALK.legOverheadMinutes` |
| Safety margin | **10 min** (before_next_plan) / **5 min** (free_time) | `ENGINE_CONFIG.safetyMarginMinutes` |
| Late-arrival grace | **10 min** scheduled_event, **0** bookable_slot, **0** drop_in | `lateArrivalGraceMinutes` |
| Assumed stay when the duration is unknown | **30 min** (always flagged) | `assumedMinStayMinutes` |
| Minimum window | **20 min** (below this → `window_too_short`) | `minWindowMinutes` |
| Ranking weights | completeness **0.35**, proximity **0.35**, interest **0.20**, slack **0.10** | `ENGINE_CONFIG.weights` |
| Source timeout | 8000 ms (→ `source_unavailable`) | `recommend()` |

## Decision: formulas (UTC instants)

- **Travel estimate:** `walk_min = ceil(haversine_m × 1.3 / 75 + 3)`.
- **Coarse filter:** reject as `too_far` if `haversine_m × 1.3 / 75 > window_minutes`.
- **Hard deadline:**
  - before_next_plan: `hard_deadline = next.startsAt − arrivalBuffer`
  - free_time: `hard_deadline = now + freeMinutes`
- **Latest leave:** `latest_leave = hard_deadline − (walk_to_next (0 in free_time) + safety_margin)`.
- **Fixed-start activities:**
  - reject as `already_started` if `now + outbound > start + grace`;
  - reject as `starts_after_window` if `start ≥ latest_leave`;
  - otherwise `earliest_start = max(now + outbound, start)`.
- **Drop-ins:** `earliest_start = max(now + outbound, opening time if known)`.
- **Minimum usable time:** the first of these that is available:
  1. `duration_min_minutes`;
  2. for a fixed start with a known end, `end − earliest_start`;
  3. otherwise **30 min, assumed** (`duration_unknown`).
- **Finish check:** `projected_finish = earliest_start + min_usable`. Reject if it falls after a known end or closing
  time (`not_enough_time` / `closes_too_soon`), or after `latest_leave` (`not_enough_time`).
- **Outputs:**
  - `recommendedLeaveBy = min(known end, latest_leave)`
  - `departBy = start − outbound` (fixed start), or `latest_leave − (min_usable + outbound)` (drop-in)
  - `spareMinutes = latest_leave − projected_finish`
- **Hard rejections, checked before any timing:** permission not public, cancelled or postponed, full or unavailable
  (after expiry handling), missing or out-of-area coordinates, a fixed start with no start time, already ended.
- **Dedupe:** the key is `normalized title | venue.id | startsAt`. The kept record is the better permission, then
  the fresher `last_source_update`.

## Decision: time handling (`src/domain/time.ts`)
- All computation is done on UTC instants. Display uses `America/Vancouver`, always with a zone label. Wall-clock
  input goes through `localToUtc()`, which reports `exact`, `ambiguous` (the earlier instant is used and the CSV row
  is flagged `ambiguous_local_time`) or `nonexistent` (the CSV row is rejected).
- **BC has moved to permanent UTC-7.** The last clock change was the 2026-03-08 spring-forward. There is **no**
  2026-11-01 fall-back. Sources, accessed 2026-10-08:
  - https://en.wikipedia.org/wiki/Time_in_British_Columbia
  - the KING5 article linked in commit `6c5ecb2`
- Runtime tzdata differs: local Node with tzdata 2025b does not know this change, while the Node on GitHub Actions
  does. So `time.ts` pins `America/Vancouver` to `Etc/GMT+7` for every instant `>= BC_PERMANENT_UTC_MINUS_7_FROM`
  (`2026-03-08T10:00Z`).
- The zone label is the runtime's own abbreviation only if the runtime's offset agrees (−420). Otherwise the label
  is `GMT-7`. `runtimeKnowsBcPermanentTime()` is a diagnostic only.
- DST tests use historical transitions: the 2025-11-02 fall-back in golden case 04 and `time.test.ts`. Golden case
  17 covers the absent 2026-11-01 fall-back.
- **Risk:** a browser with stale tzdata that formats times itself (`Intl`/`Date` with `America/Vancouver`) will show
  Vancouver times **one hour early from 2026-11-01**. The UI **must** format and parse times only through this same
  module, vendored per ADR-008. It must not call `toLocaleString` directly.
- **Limits of the pin:**
  - It matches the exact string `America/Vancouver` only. An alias such as `Canada/Pacific` in a CSV row would fall
    back to runtime tzdata (`time.ts:21`).
  - It assumes UTC-7 forever after 2026-03-08. Revisit it if BC law changes again, and remove it once all supported
    browsers ship the new tzdata.

## Decision: confidence, fit and unknowns
- **`confirmed_from_authorized_source`:** `verified_available` from an `authorized` source, with a `known` end and no
  assumed stay.
- **`schedule_known_capacity_unknown`:** no assumed stay, and a known start (fixed start) or a known open window
  (drop-in).
- **`estimated_only`:** everything else.
- **Fit:** `fits_partially` if the stay was assumed, or if a fixed start has no known end. Otherwise `fits`.
- **`unknowns`** is a closed enum: `capacity_not_verified`, `availability_snapshot_expired`, `end_time_unknown`,
  `end_time_estimated`, `closing_time_unknown`, `duration_unknown`, `booking_may_be_required`, `booking_required`,
  `travel_time_is_estimate` (always present), `start_location_is_sample`, `synthetic_demo_data`.
- We give no probability numbers.

## Decision: ranking
Sort by fit tier, then score descending, then `occurrenceId`. The top 3 are shown by default (`topN` 1–10).

`score = 0.35·completeness + 0.35·proximity + 0.20·interest + 0.10·slack`, rounded to 3 decimals, where:
- `completeness` = the share of six fields that are known: start, known end, minimum duration, booking state ≠
  unknown, source URL, `requires_booking`;
- `proximity = 1 − min(1, (outbound + to_next) / window)`;
- `interest` = 1 if a category matches, 0 if none matches, 0.5 if no interests were given;
- `slack = min(1, spare / window)`.

## Consequences
- Every recommendation says `~N min walk (est.)`. The UI must never call it a route time or attach a provider name.
  A later Matrix API may refine only the Top-N, and only after a new ADR.
- **Directive deviations to note:**
  - Ranking has no "freshness" factor (P1.4 lists distance, interest and freshness).
  - Completeness is a weighted term, not a strict sort key.
  - The directive says unknown queueing or booking must not count as 0. The engine adds no queueing time. It only
    flags `booking_*` and relies on the safety margin.
  - Records with no coordinates are rejected outright instead of being listed without a distance rank.
  - For a scheduled event joined within the late-arrival grace, `departBy` can fall before `now`
    (`feasibility.ts:223-225`).
- The weights can be passed in through `cfg`, but they have **no direct unit test**. Ordering is checked only
  indirectly through golden `topIds` (05, 13, 16).

## Alternatives considered
- **Routing API in Phase 1.** Adds cost, keys and terms, and is not needed for an honest estimate. Deferred.
- **An ML ranker.** Out of scope for Phase 1.
- **Calibrated "% on time".** We have no data to calibrate it. Forbidden by the directive.

## Verification
- `tests/time.test.ts` covers historical PDT/PST offsets, the 2025 fall-back, the 2026 spring-forward, permanent
  UTC-7 in winter 2026/27, and 2026-11-01 01:30 resolving to a single instant.
- `tests/golden.test.ts` runs all 17 golden cases. On every recommendation it also checks these invariants:
  - `recommendedLeaveBy + to_next + safety ≤ hard_deadline`;
  - `travel_time_is_estimate` is present;
  - nothing non-authorized or non-verified is labeled confirmed;
  - `top.length ≤ 3`.
