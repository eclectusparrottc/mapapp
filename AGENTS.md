# AGENTS.md — rules for any AI agent working on CityGap Phase 1

Source of truth: the founder directive (2026-10-08) summarized in `docs/PRODUCT_BRIEF.md`, the ADRs in `docs/ADR/`,
and the live status in `docs/STATUS.md`. Read those before changing anything.

## What this repo is
Framework-agnostic core for CityGap Phase 1 (see ADR-008):
- `src/domain` — types (zod), time (UTC ↔ America/Vancouver, DST), geo estimates
- `src/engine/feasibility.ts` — deterministic Feasibility-Lite + ranking (ADR-006)
- `src/adapters` — source adapter pipeline (curated CSV), sync audit, Postgres store
- `src/demo` — SYNTHETIC demo dataset (always labeled DEMO)
- `supabase/` — migrations (RLS), read-only Edge Function `activities-api`
- `tests/` — golden cases (`tests/fixtures/golden_cases`), DB/RLS, API, adapter tests
The UI lives in the Lovable project (`b457e132-897e-4a81-81ac-cd8ca1fa263a`), not here.

## Commands (all must pass before a push)
```
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

## Non-negotiables (directive §8)
- Never commit secrets; never put service-role keys or provider API keys in client code or the Lovable project.
- `unknown != available`; tickets on sale / venue open never become "spots available".
- Never invent an end time or duration; never call an estimate a route time.
- Third-party records with `unverified`/`denied` permission never reach public output.
- No anonymous write path to the database; no unprotected admin/import endpoint.
- No scraping, no bypassing logins/rate limits/terms.
- Do not delete or weaken a golden case to make a test pass.
- Destructive migrations, production data changes, paid services and Publish require Owner approval.

## Working agreement
- Single writer per branch. Lovable writes only the UI repo; agents here use `feature/<ticket>` or the assigned branch.
- Status words: NOT_STARTED, IN_PROGRESS, BLOCKED, IN_REVIEW, ACCEPTED, DEFERRED. Only the Owner (or a passed gate with evidence) makes something ACCEPTED.
- Report only what a tool actually verified.
