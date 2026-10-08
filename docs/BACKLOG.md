# CityGap Phase 1 — Backlog

Fields per directive §10. Status ∈ NOT_STARTED | IN_PROGRESS | BLOCKED | IN_REVIEW | ACCEPTED | DEFERRED.
"ACCEPTED" requires Owner acceptance or a passed gate with evidence; finished code alone is IN_REVIEW.

| ID | Owner | Prio | Depends | Files in scope | User story / Acceptance | Verification | Risk / Rollback | PR / Preview | Status |
|---|---|---|---|---|---|---|---|---|---|
| CG-001 Preflight | AI Lead | P0 | — | docs/STATUS.md | Real tool/env inventory, blockers listed | MCP get_me/list_projects calls; `node -v` etc. | none | — | IN_REVIEW |
| CG-002 P1.0 docs | AI Lead (PM) | P0 | — | docs/PRODUCT_BRIEF, SEGMENT_ANALYSIS, POSITIONING, GTM_EXPERIMENTS | Beachhead + JTBD + ≥5 risks, no fabricated data | Doc review by Owner | revert docs | branch claude/task-planning-goals-1ptphj | IN_REVIEW |
| CG-003 Lovable project | Lovable via MCP | P0 | CG-001 | Lovable project b457e132… | Home + Before + Free flows, demo data, map/list | Local rebuild + Playwright (360/390/1280) | Lovable version history | preview id-preview--b457e132… | IN_REVIEW |
| CG-004 GitHub Git Sync | **Owner** | P0 | CG-003 | Lovable settings | Lovable creates a new private repo and syncs | Repo visible, commit SHA matches Lovable | disconnect sync | — | BLOCKED (Owner OAuth) |
| CG-005 Core engine | AI Lead | P0 | — | src/engine, src/domain | Deterministic feasibility, explainability, unknowns | `npm test` golden cases (16) | revert commit | c98cf43 | IN_REVIEW |
| CG-006 Golden cases | AI Lead | P0 | CG-005 | tests/fixtures/golden_cases | ≥12 cases incl. DST, midnight, timeout | `npm test` | — | c98cf43 | IN_REVIEW |
| CG-007 Schema + RLS | AI Lead (Backend) | P0 | — | supabase/migrations | Tables per directive, anon read-only, no public writes | tests/db.test.ts on PGlite | new migration (no destructive) | c98cf43 | IN_REVIEW |
| CG-008 Read API | AI Lead (Backend) | P0 | CG-007 | supabase/functions | GET activities/detail/healthz, malicious params rejected | tests/api.test.ts | redeploy previous function | c98cf43 | IN_REVIEW |
| CG-009 CSV adapter | AI Lead (Data) | P0 | CG-007 | src/adapters, data/samples, docs/CSV_FORMAT | Idempotent import, quality codes, audit | tests/adapter.test.ts, db.test.ts | re-import | c98cf43 | IN_REVIEW |
| CG-010 Supabase project | **Owner** | P0 | — | Supabase dashboard | `citygap-dev` exists, connected to Lovable | migration applied; API smoke | delete project | — | BLOCKED (Owner account) |
| CG-011 Engine in UI | Lovable via MCP | P0 | CG-003, CG-005 | Lovable src/lib | UI uses tested engine; confidence + unknowns shown | Port parity test + Playwright | Lovable revert | — | NOT_STARTED |
| CG-012 UI ↔ API client | Lovable | P1 | CG-010, CG-008 | Lovable src/lib/api | Typed client w/ runtime validation, timeout, demo fallback labeled | Playwright with API down | feature flag to demo | — | NOT_STARTED |
| CG-013 CI | AI Lead | P0 | — | .github/workflows/ci.yml | lint/typecheck/test/build on push/PR, no `|| true` | GitHub Actions run | revert | c98cf43 | IN_PROGRESS |
| CG-014 CI for UI repo | AI Lead | P0 | CG-004 | Lovable repo .github | lint/typecheck/vitest/build + Playwright smoke | Actions run | revert | — | BLOCKED (CG-004) |
| CG-015 Ticketmaster adapter | AI Lead | P2 | CG-010, license | src/adapters | Server-side, rate-limited, permission tracked | real-source smoke | disable sync | — | BLOCKED (license/terms) |
| CG-016 Analytics events | Lovable | P2 | CG-003 | Lovable | 7 anonymous events only, no coordinates | Network inspection | remove | — | NOT_STARTED |
| CG-017 Rename project to CityGap | Owner/Lovable | P2 | — | Lovable settings | Project display name "CityGap Phase 1" | get_project | rename back | — | NOT_STARTED |
| CG-018 Release candidate + publish | Owner approval | P0 | all P0 | Lovable publish | Live URL verified on phone | Browser check of URL | Lovable rollback | — | NOT_STARTED |
