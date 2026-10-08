# CityGap Phase 1: Architecture

This document describes what the code in `eclectusparrottc/mapapp` does as of 2026-10-08, plus the Lovable UI
project it serves. The decisions behind it are in `docs/ADR/` (ADR-001 to ADR-008).

## 1. Components

```text
                         ┌────────────────────────── Owner (human) ──────────────────────────┐
                         │ approves: Git Sync, Supabase project, data terms, Publish, CRs    │
                         └────────────────────────────────────────────────────────────────────┘
 AI Lead (Claude Code; Codex unavailable) ── Lovable MCP (send_message, bounded units) ──┐
 Independent reviewer (separate Claude subagent, read-only)                              │
                                                                                         ▼
┌──────────────────────────── repo: eclectusparrottc/mapapp (this repo) ───────┐   ┌──── Lovable project b457e132… ────┐
│ src/domain   types (zod) · time (UTC↔America/Vancouver, BC UTC-7 pin) · geo  │   │ TanStack Start/Router, React, TS, │
│ src/engine   feasibility.ts  (Feasibility-Lite + ranking, pure)              │──▶│ Tailwind, shadcn, bun             │
│ src/adapters csv.ts · sync.ts (runSync) · pgStore.ts · types.ts              │ * │ MapLibre GL + OpenFreeMap tiles   │
│ src/demo     demoData.ts (SYNTHETIC, 38 templates)                           │   │ src/lib/api typed client (planned)│
│ scripts      import-csv.ts (CLI) · export-demo.ts                            │   │ Preview: id-preview--b457e132…    │
│ supabase     migrations/…init_schema.sql · functions/activities-api          │   │ NOT published; Git Sync NOT linked│
│ tests        golden (17) · db/RLS (PGlite) · api · adapter · demo · time     │   └───────────────────────────────────┘
│ .github/workflows/ci.yml  lint · typecheck · test · build · CSV dry-run      │      * engine reaches the UI by vendoring
└──────────────────────────────────────────────────────────────────────────────┘        (ADR-008 option a, then b)
                │ migrations / function deploy (after Owner provisions)
                ▼
┌──────────── Supabase project citygap-dev (Owner-owned; NOT YET CREATED) ───────────┐
│ Postgres: venues · activities · occurrences · availability_snapshots ·             │
│           source_records · sync_runs  (RLS forced on all)                          │
│ view public_occurrences_v1 (security_invoker)                                      │
│ Edge Function activities-api (Deno, verify_jwt=false, anon key only)               │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Data flow

```text
curated CSV ──▶ csvAdapter.fetch ──▶ normalizeCsvRow (validate, UTC, stable ids, quality codes)
            ──▶ runSync: batch dedupe by occurrence id ──▶ PgStore.upsert (one transaction, ON CONFLICT)
            ──▶ PgStore.recordSyncRun (sync_runs audit row, also written on failure)
Postgres tables ──(RLS: is_public_occurrence)──▶ view public_occurrences_v1
            ──▶ Edge Function activities-api (postgrestRepo, anon key, 5 s timeout)
            ──▶ handler.ts (validated query, toApiItem = engine Candidate shape)
            ──▶ UI typed client (runtime-validates with zod Candidate; timeout; labeled demo fallback)
            ──▶ engine recommend(query, loader) (8 s timeout → source_unavailable)
            ──▶ Top 3 cards + map, with whyThisFits / recommendedLeaveBy / confidenceLevel / unknowns
```

- **Demo mode** (today): `buildDemoCandidates(now)` produces synthetic candidates directly, skipping the DB. Every
  item carries `permission=synthetic`, `isDemo=true` and a `[DEMO]` title.
- **Engine placement:** the engine is pure and synchronous (`recommendFromCandidates`), so it runs in the browser.
  The API only serves candidates. There is no server-side recommendation endpoint.

## 3. Trust boundaries

| Boundary | Inside | Enforcement |
|---|---|---|
| Browser (untrusted) | the UI, the user's start point and next plan | Location and plan stay in the browser. They are never sent to the API (the API takes only a bbox, a time range and filters). Share URLs must not contain exact coordinates (directive §8). |
| Public API (anon) | `GET` only | `handler.ts` returns 405 for non-GET methods. Strict parameter allow-list, length, bbox and range limits. Errors are mapped to 503 `backend_unavailable` with no internals. |
| Postgres as anon/authenticated | SELECT on 4 tables and the view | Forced RLS. Rows visible only when `is_public_occurrence()` is true. No write grants. `source_records` and `sync_runs` have no grants at all. |
| Importer (privileged) | `scripts/import-csv.ts --apply` | Runs on an operator machine or CI runner only, with `DATABASE_URL`. There is no HTTP import or webhook endpoint. |
| Third-party sources | (none authorized yet) | `data_permission_status` gating, server-side only. Ticketmaster is not applied for (ADR-005). |

## 4. Where secrets live

| Secret | Location | Never in |
|---|---|---|
| Supabase anon key + URL (public by design) | UI env (Lovable), Edge Function env `SUPABASE_URL`, `SUPABASE_ANON_KEY` | n/a (RLS is the guard) |
| `DATABASE_URL` (privileged Postgres connection) | Operator shell / CI secret for `import-csv --apply` | Git, the browser, the Lovable project |
| `SUPABASE_SERVICE_ROLE_KEY` | Reserved in `.env.example` for future server jobs; **not used by Phase 1 code**. The importer uses `DATABASE_URL` (also server-only). | Git, the browser, the Lovable project |
| `TICKETMASTER_API_KEY` (future) | Supabase secret, server-side adapter only | the browser |
| Map tile key (only if MapTiler) | UI, as a **domain-restricted** public key | n/a |
| Lovable / GitHub OAuth tokens | the MCP client / host | Git, the docs, any chat output |

CI runs a regex secret scan (`ci.yml`, "Secret hygiene"). It is a heuristic, not a guarantee.

## 5. API contract v1 (`supabase/functions/_shared/contract.ts`)

The base path is `/functions/v1/activities-api`. The router matches on the path suffix, so a rewrite to `/api/v1/…`
also works.

| Route | Behaviour |
|---|---|
| `GET /healthz` | 200 `{ok, version:"v1", time}`. Returns 503 if the DB ping fails. |
| `GET /activities?bbox=minLng,minLat,maxLng,maxLat&from=ISO&to=ISO&kind=a,b&category=x,y&limit=N` | 200 `{version, generatedAt, count, truncated, items[]}`, with `cache-control: public, max-age=60`. |
| `GET /activities/{occurrenceId}` | 200 `{version, item}`. Returns 400 `invalid_id` if the ID fails `^[A-Za-z0-9._:-]{1,250}$`, and 404 if the record is not visible. |
| `OPTIONS` | 204 (CORS `*`, methods `GET, OPTIONS`) |
| any other method | 405 |

**Query rules and limits:**

| Rule | Limit |
|---|---|
| `bbox` | required. Four decimals (≤8 dp), min < max. |
| bbox span | **≤ 0.6°** on each axis |
| Service area | must intersect the Metro Vancouver box: lat 49.0–49.45, lng −123.35 to −122.4 |
| `to` | required |
| `from` | defaults to now |
| Time format | ISO-8601 with offset |
| Time range | `to > from`, **≤ 48 h** |
| `kind` and `category` | comma lists from fixed enums |
| `limit` | 1–**200**, default **100** |
| Parameters | unknown or repeated parameters are rejected |
| Query string length | **≤ 512** chars |

The response is 400 `{error:"invalid_query", details[]}` when a rule fails.

**Items** have the same shape as the engine `Candidate` (`toApiItem`). They include `source.permission` (only
`authorized` or `synthetic` can appear) and `isDemo`.

**Time filter:** `starts_at < to or null` and `ends_at > from or null`.

**Records without coordinates** never match a bbox, so they never appear in API lists.

**Differences from the directive's sketch:**
- The path is not `/api/v1/…`, and the version travels in the response body.
- The detail route is keyed by **occurrence ID**, not activity ID.

## 6. Known architectural gaps (tracked, not hidden)

- **Demo IDs are not API-safe.** Demo occurrence IDs contain `@` (`src/demo/demoData.ts:156`). The DB ID regex and
  the API `OCCURRENCE_ID_RE` reject `@`, so demo IDs cannot be stored or fetched through `/activities/{id}` as they
  are.
- **The re-entrancy lock is per process only** (`src/adapters/sync.ts:17`). See ADR-005.
- **No deletion or deactivation** of records missing from a later import. See ADR-005.
- **The UI does not use this engine or time module yet** (CG-011). Until it does, BC UTC-7 handling and the golden
  cases do not protect what users see.
- **No browser smoke test in CI.** The UI repo does not exist yet (CG-014).
