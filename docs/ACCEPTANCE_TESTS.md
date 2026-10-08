# Acceptance tests: directive criteria mapped to evidence

**Legend:**
- **AUTOMATED (file)**: runs in `npm test` and in CI (`.github/workflows/ci.yml`) for this repo.
- **MANUAL**: needs a human or a browser run, recorded with evidence in `docs/STATUS.md`.
- **NOT YET COVERED**: no test exists yet, or the check is blocked.

AUTOMATED tests run on PGlite and fixtures, **not** against hosted Supabase or the Lovable UI. Last local run on
2026-10-08: 6 files, 66 tests, all passing.

## P1.1: Responsive UI and map (Lovable)

| Criterion | Coverage |
|---|---|
| Home has 2 CTAs; Before and Free-time forms; results with map/list toggle; Top 3 | MANUAL. Local rebuild of the Lovable code driven by Playwright. NOT YET COVERED in any CI (the UI repo does not exist; CG-014). |
| Screenshots and interaction at 390, 360 and 1280 px | MANUAL. NOT YET COVERED in CI. |
| No-account path: map, detail, source link, back | MANUAL |
| Every button works or is clearly disabled; no dead links | MANUAL |
| Empty, loading, error and unknown states always present | Engine side: AUTOMATED (`golden 11_no_candidates`, `12_source_timeout`, `15_invalid_query`). UI rendering: MANUAL. |
| Location can be denied without a dead end; the sample start is labeled | Engine: AUTOMATED (`golden 10_no_location_permission`: `start_location_is_sample` and a note). UI permission prompt: MANUAL. |
| 30–50 synthetic records with ≥10 events, ≥10 drop-ins and ≥5 unknown-inventory slots, plus edge cases | AUTOMATED (`tests/demo.test.ts` "has 30-50 activities with the required mix"; 38 templates) |
| `DEMO DATA` visible; nothing presented as real | Data: AUTOMATED (`demo.test.ts` "every activity is visibly labeled DEMO"). UI banner: MANUAL. |
| Both areas (Downtown and Richmond) covered | AUTOMATED (`demo.test.ts` "covers both Phase 1 areas") |
| Day/night and weekday/weekend coverage | PARTIAL. Templates include weekday and weekend rules and times from 07:00 to 23:45, but no test asserts this. NOT YET COVERED as an assertion. |
| Marker clustering or viewport cap; attribution visible; list works when tiles fail | NOT YET COVERED (UI repo; ADR-003) |
| Local time shown with zone label | Module: AUTOMATED (`tests/time.test.ts` "formats with the zone label", BC UTC-7 block). UI uses the module: NOT YET (CG-011). |
| Keyboard access, screen-reader labels, contrast | MANUAL |

## P1.2: External backend (Supabase)

| Criterion | Coverage |
|---|---|
| Read-only API returns test records | AUTOMATED on PGlite (`tests/api.test.ts` "lists activities in a bbox/time window"). Against `citygap-dev`: NOT YET COVERED (project not created). |
| No public write access | AUTOMATED (`tests/db.test.ts` "anon and authenticated cannot write anything"; `api.test.ts` "rejects bad ids and non-GET methods") |
| Malicious parameters rejected | AUTOMATED (`api.test.ts` `it.each` "rejects malicious/invalid query", 11 cases; "rejects bad ids") |
| Migration rebuilds from zero | AUTOMATED on PGlite (`tests/pgliteDb.ts` `freshDb`, used by `db.test.ts`). `supabase db push` on a fresh project: NOT YET COVERED. |
| DST and time zone handled correctly | AUTOMATED (`time.test.ts`; `adapter.test.ts` "flags DST-ambiguous…", "stores UTC and keeps the original timezone…"; golden `04_dst_fall_back`, `17_bc_no_fall_back_2026`, `03_cross_midnight`). UI display: MANUAL. |
| Backend down → error or demo state, never a fake success | API: AUTOMATED (`api.test.ts` "hides backend errors behind a 503"). Engine: AUTOMATED (golden 12). UI: NOT YET COVERED. |
| `sync_runs` and `source_records` not readable anonymously | AUTOMATED (`db.test.ts` "anon cannot see source_records or sync_runs") |
| Only displayable rows public | AUTOMATED (`db.test.ts` "anon reads only publicly displayable rows via the view"; `api.test.ts` "never returns records without display rights") |
| Stable IDs; repeatable import | AUTOMATED (`adapter.test.ts` "is idempotent"; `db.test.ts` "re-import is idempotent") |
| Constraints prevent dishonest data | AUTOMATED (`db.test.ts` "database constraints reject dishonest data") |
| Service-role key never in the browser | PARTIAL. CI regex secret scan only. MANUAL inspection of the Lovable bundle and env. |
| RLS definer function works under hosted Supabase roles (BYPASSRLS of the owner) | NOT YET COVERED (ADR-002 open item) |
| Responses runtime-validated in the UI typed client | API items validate as `Candidate`: AUTOMATED (`api.test.ts`). UI client: NOT YET COVERED (CG-012). |

## P1.3: Source adapter and data quality

| Criterion | Coverage |
|---|---|
| CSV imported several times stays stable | AUTOMATED (`adapter.test.ts`, `db.test.ts` idempotency tests) |
| Quality codes classified | AUTOMATED (`adapter.test.ts` "accepts good rows, rejects bad rows with classified reasons"). The directive's `missing time`, `missing coordinates`, `unknown timezone`, `invalid URI`, `duplicate`, `cancelled`, `expired source` and `license unknown` are all asserted. |
| Unverified third-party rows never public | AUTOMATED (`adapter.test.ts` "never lets unverified-license rows reach recommendations"; golden `14_unverified_permission`; db and api tests) |
| Sync observable (stats) and audited on failure | AUTOMATED (`adapter.test.ts` "records a failed run…"; `db.test.ts` checks the `sync_runs` row) |
| No parallel re-entry | AUTOMATED, in process only (`adapter.test.ts` "refuses concurrent runs"). Cross-process: NOT YET COVERED. |
| Same event does not produce duplicate UI pins | Engine: AUTOMATED (golden `07_duplicate`; demo headline test). In-file: AUTOMATED (adapter). Cross-source events at differently-ID'd venues within 100 m: AUTOMATED (`tests/ranking.test.ts` cross-source dedupe). |
| One automated sync succeeds with real API credentials | NOT YET COVERED. BLOCKED: no authorized source (G4). |
| Rate limit, backoff, `last_checked_at`, cache and deletion rules | NOT YET COVERED (no API adapter yet; ADR-005) |
| CSV columns and validation documented | MANUAL (`docs/CSV_FORMAT.md`) |
| `real-data ready` and `demo ready` reported separately | MANUAL (`docs/STATUS.md`) |

## P1.4: Feasibility-Lite and ranking (`tests/golden.test.ts`, 17 cases)

| Required golden topic | Fixture |
|---|---|
| 15 min too short | AUTOMATED `01_gap_15min_too_short` |
| 75 min feasible | AUTOMATED `02_gap_75min_feasible` |
| Cross midnight | AUTOMATED `03_cross_midnight` |
| DST change | AUTOMATED `04_dst_fall_back` (historical 2025-11-02) and `17_bc_no_fall_back_2026` |
| Unknown end time | AUTOMATED `05_unknown_end_time` |
| Venue cancelled | AUTOMATED `06_cancelled` |
| Duplicate record | AUTOMATED `07_duplicate` |
| Sold out | AUTOMATED `08_sold_out_and_inventory` |
| Bad distance or coordinates | AUTOMATED `09_bad_coordinates` |
| No location permission | AUTOMATED `10_no_location_permission` |
| No candidates | AUTOMATED `11_no_candidates` |
| External API timeout | AUTOMATED `12_source_timeout` |
| (extra) authorized vs synthetic, unverified permission, invalid query, starts after window | AUTOMATED `13`–`16` |

**Other P1.4 criteria:**

| Criterion | Coverage |
|---|---|
| At least 12 golden cases | AUTOMATED ("has at least 12 golden cases") |
| Invariants on every recommendation (leave-by + travel + safety ≤ deadline; `travel_time_is_estimate`; no false "confirmed"; ≤3 top) | AUTOMATED (`golden.test.ts`) |
| Weights covered by unit tests and adjustable | Adjustable via `cfg`. **No direct unit test of `scoreRecommendation` or `completeness`**; ordering is checked only indirectly (golden `topIds`). NOT YET COVERED. |
| Explainability (`why_this_fits`, `recommended_leave_by`, `confidence_level`, `unknowns`) | AUTOMATED (golden `whyIncludes`, `recs`) |
| Main path in a mobile browser | NOT YET COVERED (CG-011 and the UI) |

## P1.5: Release candidate

| Criterion | Coverage |
|---|---|
| Independent review with findings recorded | MANUAL (a separate Claude subagent, not Codex; see ADR-001) |
| CI green: typecheck, lint, build, unit | AUTOMATED (`ci.yml`, this repo). UI repo: NOT YET COVERED. |
| Browser main path and mobile viewport regression in CI | NOT YET COVERED |
| Real phone acceptance (map, list, both CTAs, back, sources, error, empty, location denied) | MANUAL |
| Release notes (SHA, Lovable version, URL, Supabase alias, limitations, data authorization) | MANUAL (ADR-007) |
| Owner's explicit Publish approval; live URL opened and a full path verified | MANUAL. Currently `NOT YET PUBLISHED`. |

## Gates (directive §11)

| Gate | Pass condition | Coverage today |
|---|---|---|
| G0 | Beachhead chosen; MCP or fallback actually works | MANUAL (`SEGMENT_ANALYSIS.md`; Lovable MCP `create_project` succeeded) |
| G1 | Preview, Git Sync repo and CI | Preview: MANUAL (blocked from the container, egress 403). Git Sync: **BLOCKED (Owner)**. CI: AUTOMATED for `mapapp` only. |
| G2 | Three widths, empty states, source and DEMO labels | Data side AUTOMATED (`demo.test.ts`). UI MANUAL, not yet in CI. |
| G3 | Backend security tests, migration, repeat import | AUTOMATED on PGlite (`db.test.ts`, `api.test.ts`, `adapter.test.ts`). On `citygap-dev`: NOT YET COVERED (Owner provisioning). |
| G4 | Real-source smoke test, or clearly BLOCKED | NOT YET COVERED (BLOCKED; no authorization) |
| G5 | Golden cases and mobile main path | Golden: AUTOMATED (17). Mobile path with the engine in the UI: NOT YET COVERED (CG-011). |
| G6 | Review, fixes, live URL verified, release report | MANUAL. Not started. |
