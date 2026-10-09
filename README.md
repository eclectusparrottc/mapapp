> **Moved.** This repository is archived. The CityGap core, backend, tests and docs now live in
> [`eclectusparrottc/citytime-connect`](https://github.com/eclectusparrottc/citytime-connect) under `core/`
> (merged in PR #4, `37ed637`). Make changes there; this copy is no longer maintained.

# CityGap — Phase 1 core

> "You have time before your next plan. Here's what actually fits."

Time-aware local discovery prototype for Downtown Vancouver (Rogers Arena / BC Place) and Richmond City Centre.
This repository holds the **framework-agnostic core and backend**; the UI is built in Lovable (see `docs/STATUS.md`).

| Area | Where |
|---|---|
| Product & segment docs | `docs/PRODUCT_BRIEF.md`, `docs/SEGMENT_ANALYSIS.md`, `docs/POSITIONING.md`, `docs/GTM_EXPERIMENTS.md` |
| Architecture & decisions | `docs/ARCHITECTURE.md`, `docs/ADR/` |
| Status / roadmap / backlog | `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/BACKLOG.md` |
| Data sources & licenses | `docs/LICENSES_AND_SOURCES.md`, `docs/CSV_FORMAT.md` |
| Feasibility engine | `src/engine/feasibility.ts` + `tests/fixtures/golden_cases/` |
| Database (Supabase) | `supabase/migrations/`, Edge Function `supabase/functions/activities-api` |

```bash
npm ci
npm run check                     # lint + typecheck + tests + build
npx tsx scripts/import-csv.ts --file data/samples/curated_sample.csv          # dry run
npx tsx scripts/export-demo.ts 2026-10-11T00:45:00Z > demo.json               # synthetic demo candidates
```

All bundled activity data is **synthetic DEMO DATA**. No real events, availability or user data are included.
