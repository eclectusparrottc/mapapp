# ADR-002: Owner-owned Supabase instead of Lovable Cloud

**Status:** Accepted (pending Owner provisioning of the Supabase project `citygap-dev`)
**Date:** 2026-10-08 · **Directive refs:** §4.1, §4.3, P1.2, §8

## Context
Lovable can turn on a built-in Cloud database with one click. Lovable documents no automatic migration from Cloud to an
external Supabase project (directive §4.3). The Owner wants to control permissions, migrations, data and billing.
Lovable Cloud DB is **not enabled** on project `b457e132…`, and we must not enable it quietly.

## Decision
- **Default backend:** an Owner-owned Supabase project named `citygap-dev`. The Owner creates it and connects it to
  Lovable through the official connector. Agents never call `enable_database` on the Lovable project.
- **Schema:** one migration, `supabase/migrations/20261008000001_init_schema.sql`. Every later change gets a new
  migration file. Destructive migrations need Owner approval.
- **Security model (as implemented in the migration):**
  - RLS is enabled **and forced** on all six tables.
  - All privileges are revoked from `anon` and `authenticated`. They then get `usage` on the schema and `SELECT` only
    on `venues`, `activities`, `occurrences`, `availability_snapshots` and the view.
  - They get **no** INSERT, UPDATE or DELETE grants and no write policies. `source_records` and `sync_runs` have no
    grants and no policies, so clients cannot see them at all.
  - Read policies go through `public.is_public_occurrence(occ_id)`, a `SECURITY DEFINER` function with a pinned
    `search_path`. It returns true only when a `source_records` row with `data_permission_status in
    ('authorized','synthetic')` exists. A second definer function, `occurrence_public_source()`, returns display-safe
    provenance without `raw_hash`.
  - Public read model: the view `public.public_occurrences_v1 WITH (security_invoker = true)`, so the caller's RLS
    applies.
  - Writes happen only server-side, through the importer (`scripts/import-csv.ts --apply` → `PgStore`) on a
    privileged connection (`DATABASE_URL`). The service-role key and the DB password never reach the browser or the
    Lovable client.
- The Edge Function `activities-api` reads the view with the **anon** key (`postgrestRepo.ts`), so RLS applies to it.

## Consequences
- G3 is blocked until the Owner creates `citygap-dev`. All backend code is tested on PGlite (real Postgres in
  WASM) instead.
- **Open item to check on hosted Supabase:** `source_records` has FORCE RLS and no policies.
  `is_public_occurrence()` can therefore only see rows if the function owner (the migration role) bypasses RLS. In
  PGlite the owner is a superuser, so tests pass. On Supabase we must confirm the `postgres` role has `BYPASSRLS`.
  If it does not, nothing becomes public. (Unverified.)
- Before a public Beta we need a separate production project and a migration path.

## Alternatives considered
- **Lovable Cloud DB.** Faster to start, but Lovable documents no migration to external Supabase, and the Owner has
  less control. Rejected unless the Owner reverses this decision.
- **Expose tables directly through PostgREST with no Edge Function.** Possible, because RLS is the real guard. We
  keep the Edge Function because it gives a stable, versioned, validated contract (`contract.ts`).

## Verification
- `tests/db.test.ts` rebuilds the schema from zero, runs the import twice with no duplicates, checks that anon sees
  only displayable rows, that anon cannot read `source_records` or `sync_runs`, that anon and authenticated cannot
  write, and that check constraints hold.
- **Pending (needs Owner):** `supabase db push` to `citygap-dev`, the same RLS probes run with the real anon key, and
  the BYPASSRLS check above.
