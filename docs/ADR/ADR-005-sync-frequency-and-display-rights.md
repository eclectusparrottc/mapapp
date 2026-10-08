# ADR-005: Sync frequency and display rights. Real-time inventory is deferred to Phase 2.

**Status:** Accepted (CSV path implemented). The scheduled API sync is **Deferred** until a source is authorized.
**Date:** 2026-10-08 · **Directive refs:** P1.3, §8, §11 G4

## Context
No real activity source is authorized today:
- The Ticketmaster Discovery API is the first candidate, but it has **not been applied for**. Its redisplay,
  caching and attribution terms need Owner review (`LICENSES_AND_SOURCES.md`, status `NOT_APPLIED`).
- The Eventbrite public search API was shut down in 2019.
- Luma and CatchCorner do not offer an unrestricted general API.

We must not scrape, and we must not show records whose display rights are unverified.

## Decision
1. **Curated CSV comes first.** Adapter: `src/adapters/csv.ts`, run by `runSync` in `src/adapters/sync.ts`. The
   pipeline is `fetch → validate/normalize → dedupe (within the batch) → upsert → audit`. Imports run only
   server-side, from the CLI (`scripts/import-csv.ts`). There is no HTTP import endpoint.
2. **Display rights travel with every record.** `data_permission_status` ∈ {authorized, synthetic, unverified,
   denied}. A blank value defaults to `unverified`.
   - Only `authorized` and `synthetic` rows are publicly visible. This is enforced three times: by RLS through
     `is_public_occurrence()`, in the view, and in the engine (`permission_not_public`).
   - `unverified` and `denied` rows are stored but flagged `license_unknown`.
   - Synthetic rows always carry the DEMO label (`isDemo`, `synthetic_demo_data`).
3. **Ticketmaster is not applied for.** G4 stays `BLOCKED` until the Owner accepts the terms. The key would live only
   as a Supabase secret and would be used only server-side.
4. **Real-time inventory is deferred to Phase 2.** Phase 1 never claims live seats. `verified_available` requires
   `verified_at` and `expires_at` (DB check and CSV rule), and a snapshot past its expiry is treated as `unknown`.
5. **Sync safety, as implemented:**
   - **Re-entrancy guard:** a per-source in-process lock (`running` set, `SyncAlreadyRunningError`).
   - **Fetch timeout:** default 30 s.
   - **Audit:** every non-dry run writes a `sync_runs` row, failures included (`status` ∈ running, succeeded,
     partial, failed; counts; `error_summary` by quality code; `error_message`).
   - **Idempotency:** stable IDs plus `on conflict` upserts.
   - Dry-run is the CLI default.
6. **Future cadence:** about every 6 hours, **only after authorization**, at a frequency set by the provider's
   quota and terms. Each sync must be observable (last success time in `sync_runs`) and stoppable (a disable flag),
   with rate limiting, exponential backoff and `last_checked_at`.

## Consequences
- `real-data ready` is reported separately from `demo ready`. Today only `demo ready` can be true.
- **Gaps against the directive that must be closed before any scheduled sync:**
  - The re-entrancy lock is per process only (`src/adapters/sync.ts:17`). Two CLI processes or two cron workers could
    still overlap. Use a Postgres advisory lock or a `running` row check before automating.
  - Nothing removes or deactivates records missing from a later import. A record removed at the source stays public
    until its `ends_at` passes. Directive P1.3 requires cache and deletion rules.
  - There is no `last_checked_at` column. The closest field is `source_records.last_seen_at`.
  - Backoff and rate limiting are not implemented, because no API adapter exists yet.

## Alternatives considered
- **Scrape event sites.** Forbidden by the directive (§8).
- **Store third-party records as `unverified` and show them anyway.** Forbidden.
- **A public or webhook import endpoint.** Rejected. Imports stay CLI or server-only.

## Verification
- `tests/adapter.test.ts`: quality codes, idempotency, unverified rows kept out of recommendations, failed-run audit,
  concurrent-run refusal.
- `tests/db.test.ts`: re-import produces no duplicates, and `sync_runs` is invisible to anon.
- Golden case `14_unverified_permission`.
- **NOT YET COVERED:** a real-source smoke test (blocked on authorization).
