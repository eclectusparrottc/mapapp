# ADR-004: Separate activity, venue, occurrence and availability. Never invent an end time.

**Status:** Accepted (implemented)
**Date:** 2026-10-08 · **Directive refs:** P1.2 data model, P1.4, §8

## Context
A flat "event" record mixes up states that the directive requires us to keep apart:
- "announced" vs "joinable now"
- "tickets on sale" vs "a seat for you"
- "venue open" vs "capacity confirmed"
- "end unknown" vs "60 minutes"
- "missing" vs "false/available"

## Decision
We use separate entities. The zod types are in `src/domain/types.ts` and the matching tables are in the migration.

| Entity | Holds | Key rules |
|---|---|---|
| `venues` | name, lat/lng (nullable as a pair), address, IANA `timezone` | `check ((lat is null) = (lng is null))` |
| `activities` | title, `kind` ∈ {scheduled_event, drop_in, bookable_slot}, `category[]`, summary ≤280, `duration_min/max_minutes` (nullable), `requires_booking` (nullable = unknown), `source_url` (http/https only) | max ≥ min |
| `occurrences` | `starts_at_utc`, `ends_at_utc` (both nullable), `original_timezone`, `end_time_quality` ∈ {known, estimated, unknown}, `cancellation_status` ∈ {scheduled, cancelled, postponed} | `end_time_quality = 'unknown' or ends_at_utc is not null`; end > start |
| `availability_snapshots` | append-only history; the latest row is the current state. `booking_state` ∈ {verified_available, sales_open_not_inventory, unknown, full, unavailable}, `verified_at`, `expires_at`, `verification_source` | `verified_available` requires both `verified_at` and `expires_at` |
| `source_records` | `(source_name, external_id)` PK, `occurrence_id`, `source_url`, `last_seen_at`, `data_permission_status` ∈ {authorized, synthetic, unverified, denied}, `last_source_update`, `raw_hash` | not visible to clients |
| `sync_runs` | an audit row for each import run | not visible to clients |

**Drop-ins:** `starts_at`/`ends_at` are that day's opening window. A null value means unknown.

**Never invent an end time:**
- The importer only sets `ends_at` when the source gives one.
- The engine never turns an unknown end into a duration. When it has to assume a minimum stay to check timing
  (`assumedMinStayMinutes: 30`), it:
  - downgrades the result to `fit: fits_partially` and `confidence: estimated_only`;
  - adds `duration_unknown` and `end_time_unknown` or `closing_time_unknown` to `unknowns`.
- An expired snapshot (`expires_at <= now`) is treated as `unknown`, whatever its state was.
- `confirmed_from_authorized_source` requires all of the following: `verified_available`, permission `authorized`,
  a known end time, and no assumed stay.

## Consequences
- The public view joins the entities back into one row (`public_occurrences_v1`). The API item has the same shape as
  the engine's `Candidate`.
- Re-imports add a snapshot only when the state changed (`PgStore.upsert`), so history stays small and imports stay
  idempotent.
- **Known gap:** the synthetic demo dataset marks `dt-bs-vr` as `verified_available` with `verifiedAt` and
  `expiresAt` set to null (`src/demo/demoData.ts:102,171`). The DB check would reject that. Demo data never reaches
  the DB, and the engine still refuses the confirmed label because the record is not `authorized`, but the two rules
  disagree.

## Alternatives considered
- **A single `events` table with an `available` boolean.** Rejected. It cannot express unknown, and it mixes up the
  five distinctions above.
- **Default a 60-minute duration.** Rejected by the directive.

## Verification
- `tests/db.test.ts` "database constraints reject dishonest data".
- Golden cases `05_unknown_end_time`, `08_sold_out_and_inventory` and `13_authorized_vs_synthetic_confirmation`.
- `tests/adapter.test.ts`: DST-ambiguity flag, UTC storage, original timezone kept.
