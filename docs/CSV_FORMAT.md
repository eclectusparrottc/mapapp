# Curated CSV format (source adapter v1)

Implementation: `src/adapters/csv.ts` (`CSV_COLUMNS`, `normalizeCsvRow`). Pipeline: `src/adapters/sync.ts`
(`runSync`). Sample file: `data/samples/curated_sample.csv`. It deliberately contains bad rows.

## File rules
- UTF-8. A BOM is allowed. The first line is the header. Empty lines are skipped, and every cell is trimmed.
- **All 25 columns must be present in the header.** Their order does not matter, and extra columns are ignored. A
  file that is missing any column fails as a whole, with "CSV is missing required columns". A cell may be blank
  where the table below allows it.
- Times are **local wall-clock** `YYYY-MM-DDTHH:MM[:SS]` plus an IANA `timezone`. They are stored as UTC, and the
  original zone is kept in `original_timezone`.
- `America/Vancouver` is pinned to UTC-7 from 2026-03-08 onward (BC permanent time, ADR-006). Use that exact zone
  name, not an alias.
- `SAFE_ID` = `^[A-Za-z0-9._:-]{1,128}$`

## Columns

| # | Column | Type | Required | Validation (reject unless noted) | Example |
|---|---|---|---|---|---|
| 1 | `external_id` | string | yes | `SAFE_ID` → `invalid_value` | `csv-talk` |
| 2 | `occurrence_key` | string | no (blank → `default`) | `SAFE_ID` → `invalid_value` | `2026-10-12T12:15` |
| 3 | `title` | string | yes | 1–200 chars → `invalid_value`. Must not imply real data when it is synthetic (prefix `[DEMO]`). | `[DEMO] CSV Lunch Talk` |
| 4 | `kind` | enum | yes | `scheduled_event` \| `drop_in` \| `bookable_slot` → `invalid_value` | `scheduled_event` |
| 5 | `categories` | `\|`-separated enums | no (blank = none) | each one of `arts, music, food_drink, outdoors, sports, learning, shopping, family, nightlife, wellness` → `invalid_value` | `learning\|arts` |
| 6 | `short_summary` | string | no | **silently truncated** to 280 chars (no flag) | `45-minute talk.` |
| 7 | `duration_min_minutes` | int | no (blank = unknown) | integer 1–1440 → `invalid_value` | `45` |
| 8 | `duration_max_minutes` | int | no | integer 1–1440, and ≥ min → `invalid_value` | `45` |
| 9 | `venue_external_id` | string | yes | `SAFE_ID` → `invalid_value` | `v-library` |
| 10 | `venue_name` | string | yes | non-empty → `invalid_value` | `Demo Library Square Room` |
| 11 | `lat` | decimal | no | Blank (or only one of lat/lng) → **flag** `missing_coordinates`: stored without coordinates, never on the map or in bbox results. Outside Metro Vancouver (lat 49.0–49.45, lng −123.35 to −122.4) or non-numeric → `invalid_value`. | `49.2797` |
| 12 | `lng` | decimal | no | as `lat` | `-123.1157` |
| 13 | `address` | string | no | none | (blank) |
| 14 | `timezone` | IANA zone | yes | must be accepted by `Intl` → `unknown_timezone` | `America/Vancouver` |
| 15 | `starts_at_local` | local datetime | yes for `scheduled_event` and `bookable_slot`; optional for `drop_in` (opening time) | missing for a fixed-start kind → `missing_time`. Bad format → `invalid_value`. Falls in a DST gap → `invalid_value`. Ambiguous (repeated hour) → **flag** `ambiguous_local_time`, earlier instant used. | `2026-10-12T12:15` |
| 16 | `ends_at_local` | local datetime | no (blank = unknown end) | format and DST as above. End ≤ start → `invalid_value`. End ≤ import time → `expired_source`. | `2026-10-12T13:00` |
| 17 | `end_time_quality` | enum | no (default `known` if an end is given, else `unknown`) | `known` \| `estimated` \| `unknown`. `known` or `estimated` without an end → `invalid_value`. | `known` |
| 18 | `cancellation_status` | enum | no (default `scheduled`) | `scheduled` \| `cancelled` \| `postponed` → `invalid_value`. `cancelled` or `postponed` → **flag** `cancelled` (stored; the engine excludes it). | `scheduled` |
| 19 | `booking_state` | enum | no (default `unknown`) | `verified_available` \| `sales_open_not_inventory` \| `unknown` \| `full` \| `unavailable` → `invalid_value`. `verified_available` requires columns 20 **and** 21 → `invalid_value`. | `sales_open_not_inventory` |
| 20 | `booking_verified_at` | ISO-8601 **with offset** | no | must parse and carry `Z` or `±hh:mm` → `invalid_value` | `2026-10-10T17:00:00Z` |
| 21 | `booking_expires_at` | ISO-8601 with offset | no | as above. After expiry the engine treats the state as `unknown`. | `2026-10-10T17:30:00Z` |
| 22 | `requires_booking` | bool | no (blank = unknown) | `true/yes/1` or `false/no/0` → `invalid_value` | `true` |
| 23 | `source_url` | URL | no | `http:` or `https:` only → `invalid_uri` | `https://example.org/citygap-demo/talk` |
| 24 | `data_permission_status` | enum | no (**default `unverified`**) | `authorized` \| `synthetic` \| `unverified` \| `denied` → `invalid_value`. `unverified` or `denied` → **flag** `license_unknown` (stored, never public). | `synthetic` |
| 25 | `last_source_update` | ISO-8601 with offset | no | as column 20 | `2026-10-09T18:00:00Z` |

## Quality codes (`QualityCode`, `src/adapters/types.ts`)

| Code | Severity | Raised when |
|---|---|---|
| `missing_time` | reject | a fixed-start kind has no `starts_at_local` |
| `missing_coordinates` | flag | lat or lng is blank |
| `unknown_timezone` | reject | the timezone is missing or invalid |
| `ambiguous_local_time` | flag | the wall time occurs twice (DST fall-back) |
| `invalid_uri` | reject | `source_url` is not http(s) |
| `invalid_value` | reject | any other field rule fails, including out-of-area coordinates and DST-gap times |
| `duplicate` | reject | the same occurrence ID appears earlier in the same file (added by `runSync`) |
| `cancelled` | flag | the occurrence is cancelled or postponed |
| `expired_source` | reject | the occurrence ended before the import time |
| `license_unknown` | flag | permission is `unverified` or `denied` |

Any reject keeps the row out of the store. Flags are stored with the row (`flags`) and counted in the
`sync_runs.error_summary` JSON (one count per code; `fetch_error` is counted when the file cannot be read).

The run status is:
- `succeeded`: 0 rejected rows;
- `partial`: some rows accepted and some rejected;
- `failed`: nothing accepted, or the fetch failed.

## Stable IDs and idempotency

| Field | Value |
|---|---|
| activity ID | `<source>:<external_id>` |
| occurrence ID | `<source>:<external_id>:<occurrence_key>` |
| venue ID | `<source>:<venue_external_id>` |
| `source_records` key | `(source_name, external_id + ":" + occurrence_key)` |
| `raw_hash` | SHA-256 over all 25 columns in canonical order |

- All tables are upserted `ON CONFLICT` by these IDs, in a single transaction.
- `availability_snapshots` gets a new row only when the state actually changes.
- Importing the same file twice therefore produces the same row counts, plus one extra `sync_runs` row
  (`tests/adapter.test.ts`, `tests/db.test.ts`).

**Caveats:**
- If two rows share a `venue_external_id` with different venue data, the last row wins silently.
- Rows removed from a later file are **not** removed from the DB (ADR-005).
- A blank `occurrence_key` makes the ID `…:default`. Two blank-key rows for the same `external_id` will collide as
  `duplicate`.

## Running the CLI

```bash
# Dry run (default): parses, validates and prints a JSON report; writes nothing, records no sync_run.
npx tsx scripts/import-csv.ts --file data/samples/curated_sample.csv --source curated-csv
#   (or: npm run import:csv -- --file … --source …)

# Apply: writes to Postgres and records a sync_runs row. Server-side only, privileged connection.
DATABASE_URL='postgres://…citygap-dev…' npx tsx scripts/import-csv.ts --file my.csv --source curated-csv --apply
```

- `--source` must match `SAFE_ID`. It prefixes every ID, so keep it stable for a given feed.
- The exit code is `1` if the run status is `failed`, and `2` on a usage error or when `--apply` is given without
  `DATABASE_URL`. Otherwise it is `0`, including for `partial`.
- **Do not run `--apply` against anything except `citygap-dev` without Owner approval.** The importer does not use
  `SUPABASE_SERVICE_ROLE_KEY`; it needs a Postgres connection string (`DATABASE_URL`, see `.env.example`).
  `--now <ISO>` evaluates expiry against a fixed instant (CI uses it for reproducible counts).
- A CSV source is a **full snapshot**: after a successful import, records of that source missing from the file
  (or rejected in this run) are retired — their `source_records` row is deleted, so they leave the public view.
  The count is stored in `sync_runs.retired_count`. A failed fetch never retires anything.
- Concurrent imports of the same source are refused (in-process guard + Postgres advisory lock).
- **Expected sample result** (with `now = 2026-10-10T12:00Z`): 14 received, 7 accepted, 7 rejected (`missing_time`,
  `unknown_timezone`, `invalid_uri`, `invalid_value` ×2, `expired_source`, `duplicate`), status `partial`. CI runs the
  dry run on the real clock, so the accepted count goes down over time as sample rows expire.
